const Mutation = require("../../mutation");

function EROperator() {
  this.ID = "ER";
  this.name = "enum-replacement";
}

EROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var ranges = []; //Visited node ranges

  visit({
    EnumDefinition: (node) => {

      var thisEnum = node;

      //ERd - Enum Replacement - Default value
      if (node.members.length > 1) {

        var start = node.members[0].range[0];
        var end = node.members[1].range[1] +1;
        var startLine = node.members[0].loc.start.line;
        var endLine = node.members[1].loc.end.line;
        var deafultValue = node.members[0].name;
        var secondValue = node.members[1].name;

        var original = source.slice(start, end);
        var replacement = original.replace(deafultValue, "*").replace(secondValue, deafultValue).replace("*", secondValue);
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
      //ERm - Enum Replacement - Member
      visit({
        MemberAccess: (node) => {
          if (!ranges.includes(node.range)) {
            ranges.push(node.range);
            if (node.expression.name === thisEnum.name) {

              var start = node.range[0];
              var end = node.range[1] + 1;
              var startLine = node.loc.start.line;
              var endLine = node.loc.end.line;
              var original = source.slice(start, end);

             //Replace a member with a single existing member
              for (let i = 0; i < thisEnum.members.length; i++) {
                if (thisEnum.members[i].name !== node.memberName) {
                  var replacement = original.replace(node.memberName, thisEnum.members[i].name);
                  mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
                  break;
                }
              }
            }
          }
        }
      });
    }

  });
  return mutations;
};

module.exports = EROperator;
