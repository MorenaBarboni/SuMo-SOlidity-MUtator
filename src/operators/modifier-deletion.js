const Mutation = require("../mutation");

function MODOperator() {
}

MODOperator.prototype.ID = "MOD";
MODOperator.prototype.name = "modifier-deletion";

MODOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      let replacement;
      if (node.modifiers.length > 0) {
        var functionSignature = source.substring(node.range[0], node.range[1]);
        node.modifiers.forEach(m => {
          var mod = source.slice(m.range[0], m.range[1] + 1);
          replacement = functionSignature.replace(mod, "");
          const start = node.range[0];
          const end = node.range[1];
          const startLine = node.loc.start.line;
          const endLine = node.loc.start.line;  
          mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID));
        });
      }
    }
  });
  return mutations;
};

module.exports = MODOperator;
