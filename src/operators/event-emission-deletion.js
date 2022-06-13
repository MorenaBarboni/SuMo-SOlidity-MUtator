const Mutation = require("../mutation");

function EEDOperator() {
}

EEDOperator.prototype.ID = "EED";
EEDOperator.prototype.name = "event-emission-deletion";

EEDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    EmitStatement: (node) => {
      const start = node.range[0];
      const end = node.range[1];
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;   
      const replacement = "/* " + source.slice(start, end + 1) + " */";
      mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
    }
  });
  return mutations;
};

module.exports = EEDOperator;
