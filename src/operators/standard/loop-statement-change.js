const Mutation = require('../../mutation')

function LSCOperator() {
  this.ID = "LSC";
  this.name = "loop-statement-change";
}

LSCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    ForStatement: (node) => {
      var start = node.conditionExpression.range[0];
      var end = node.conditionExpression.range[1] +1;
      const startLine =  node.conditionExpression.loc.start.line;
      const endLine =  node.conditionExpression.loc.end.line;
      var original = source.slice(start,end);

      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "true", this.ID));
      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "false", this.ID));
    }
  }),
    visit({
      WhileStatement: (node) => {
        var start = node.condition.range[0];
        var end = node.condition.range[1] + 1;
        const startLine =  node.condition.loc.start.line;
        const endLine =  node.condition.loc.end.line;
        var original = source.slice(start,end);

        mutations.push(new Mutation(file, start, end, startLine, endLine, original, "true", this.ID));
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, "false", this.ID));
      }
    });

  return mutations;
};

module.exports = LSCOperator;
