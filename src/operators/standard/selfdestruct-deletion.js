const Mutation = require('../../mutation')

function SFDOperator() {
  this.ID = "SFD";
  this.name = "selfdestruct-function-deletion";
}

SFDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  visit({
    FunctionCall: (node) => {
      if (node.expression.name == "selfdestruct") {
        const start = node.range[0];
        const temp = source.slice(start);
        const delimiter = temp.indexOf(";");
        const end = start + delimiter + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line; 
        const original = source.slice(start, end);
        const replacement = "/* " + original + " */";

        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = SFDOperator;
