const Mutation = require('../../mutation')

function EEDOperator() {
  this.ID = "EED";
  this.name = "event-emission-deletion";
}

EEDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    EmitStatement: (node) => {
      const start = node.range[0];
      const end = node.range[1] +1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const original = source.slice(start, end);
      const replacement = "/* " + original + " */";

      mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
    }
  });
  return mutations;
};

module.exports = EEDOperator;
