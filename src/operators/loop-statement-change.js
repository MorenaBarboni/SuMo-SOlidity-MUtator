const Mutation = require("../mutation");

function LSCOperator() {
}

LSCOperator.prototype.ID = "LSC";
LSCOperator.prototype.name = "loop-statement-change";

LSCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    ForStatement: (node) => {
      var start = node.conditionExpression.range[0];
      var end = node.conditionExpression.range[1];
      const startLine = node.loc.start.line;
      const endLine = node.loc.start.line;   
      mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "true", this.ID));
      mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "false", this.ID));
    }
  }),
    visit({
      WhileStatement: (node) => {
        var start = node.condition.range[0];
        var end = node.condition.range[1];
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;  
        mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "true", this.ID));
        mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "false", this.ID));
      }
    });

  return mutations;
};

module.exports = LSCOperator;
