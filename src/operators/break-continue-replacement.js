const Mutation = require("../mutation");

function BCRDOperator() {
}

BCRDOperator.prototype.ID = "BCRD";
BCRDOperator.prototype.name = "break-continue-replacement-deletion";

BCRDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    BreakStatement: (node) => {
      const start = node.range[0];
      const end = node.range[1];
      const startLine = node.loc.start.line;
      const endLine = node.loc.start.line;      
      mutations.push(new Mutation(file, start, end, startLine, endLine, "continue", this.ID));
      mutations.push(new Mutation(file, start, end + 1,  startLine, endLine, "", this.ID));
    }
  }),
    visit({
      ContinueStatement: (node) => {
        var start = node.range[0];
        var end = node.range[1];
        mutations.push(new Mutation(file, start, end, "break", this.ID));
        mutations.push(new Mutation(file, start, end + 1, "", this.ID));
      }
    });

  return mutations;
};

module.exports = BCRDOperator;
