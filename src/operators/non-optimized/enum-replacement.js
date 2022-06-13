const Mutation = require('../../mutation')

function EROperator() {}

EROperator.prototype.ID = 'ER'
EROperator.prototype.name = 'enum-replacement'

EROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var ranges = [] //Visited node ranges

  visit({
    EnumDefinition: (node) => {

      var thisEnum = node;

      //ERd - Enum Replacement - Default value
      if(node.members.length>1){

        var start = node.members[0].range[0];
        var end = node.members[1].range[1] + 1;
        var startLine = node.members[0].loc.start.line;
        var endLine = node.members[1].loc.end.line;  
        var deafultValue = node.members[0].name;
        var secondValue = node.members[1].name;

        var replacementStart = node.members[0].range[0];
        var replacementEnd = node.members[1].range[1];
        var replacement = source.slice(replacementStart, replacementEnd + 1);

        replacement = replacement.replace(deafultValue, "*").replace(secondValue, deafultValue).replace("*", secondValue);
        mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID));
      }
      //ERm - Enum Replacement - Member
    visit({
     MemberAccess: (node) => {
      if(!ranges.includes(node.range)){
        ranges.push(node.range);
       if(node.expression.name === thisEnum.name){
          var text = source.slice(node.range[0], node.range[1]+1 )
          //Replace a member with each existing member
          thisEnum.members.forEach(m => {
            if(m.name !== node.memberName){
              var replacement = text.replace(node.memberName, m.name);
              var start = node.range[0];
              var end = node.range[1] + 1;
              var startLine = node.loc.start.line;
              var endLine = node.loc.start.line;
              mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID))
            }
          });
       }
      }
    }
    })
    }

  })
  return mutations
}

module.exports = EROperator
