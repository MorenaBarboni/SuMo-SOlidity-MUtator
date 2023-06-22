const Mutation = require("../../mutation");

function BCRDOperator() {
  this.ID = "BCRD";
  this.name = "break-continue-replacement-deletion";
}

BCRDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    BreakStatement: (node) => {
      var start = node.range[0];
      var end = node.range[1];
      const startLine =  node.loc.start.line;
      const endLine =  node.loc.end.line;
      const original = source.slice(start, end)

      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "continue", this.ID));
      mutations.push(new Mutation(file, start, end + 1, startLine, endLine, original, "", this.ID));

    }
  }),
    visit({
      ContinueStatement: (node) => {
        var start = node.range[0];
        var end = node.range[1];
        const startLine =  node.loc.start.line;
        const endLine =  node.loc.end.line;
        const original = source.slice(start, end)

        mutations.push(new Mutation(file, start, end, startLine, endLine, original, "break", this.ID));
        mutations.push(new Mutation(file, start, end + 1, startLine, endLine, original, "", this.ID));
      }
    });

  return mutations;
};

module.exports = BCRDOperator;
