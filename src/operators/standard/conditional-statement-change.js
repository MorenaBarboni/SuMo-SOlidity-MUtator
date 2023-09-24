const Mutation = require("../../mutation");

function CSCOperator() {
  this.ID = "CSC";
  this.name = "conditional-statement-change";
}

CSCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    IfStatement: (node) => {
      var start = node.condition.range[0];
      var end = node.condition.range[1] +1;
      var lineStart = node.condition.loc.start.line;
      var lineEnd = node.condition.loc.end.line;
      var original = source.slice(start, end);
      mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, "true", this.ID));
      mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, "false", this.ID));

      if (node.falseBody && !node.falseBody.trueBody) { //If this is the last falseBody
        start = node.trueBody.range[1] + 1;
        end = node.falseBody.range[1] +1;
        lineStart = node.trueBody.loc.start.line;
        lineEnd = node.falseBody.loc.end.line;
        original = source.slice(start, end);
        var replacement = "";
        mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID));
      }

    }
  });

  return mutations;
};

module.exports = CSCOperator;
