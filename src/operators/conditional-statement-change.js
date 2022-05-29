const Mutation = require("../mutation");

function CSCOperator() {
}

CSCOperator.prototype.ID = "CSC";
CSCOperator.prototype.name = "conditional-statement-change";

CSCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    IfStatement: (node) => {
      var start = node.condition.range[0];
      var end = node.condition.range[1];
      mutations.push(new Mutation(file, start, end + 1, "true", this.ID));
      mutations.push(new Mutation(file, start, end + 1, "false", this.ID));

      if (node.falseBody && !node.falseBody.trueBody) { //If this is the last falseBody
        start = node.trueBody.range[1] + 1;
        end = node.falseBody.range[1];
        var text = source.slice(start, end + 1);
        var replacement = "/*" + text + "*/";
        mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
      }

    }
  });

  return mutations;
};

module.exports = CSCOperator;
