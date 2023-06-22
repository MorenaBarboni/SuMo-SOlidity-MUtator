const Mutation = require('../../mutation')

function MODOperator() {
  this.ID = "MOD";
  this.name = "modifier-deletion";
}

MODOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      let replacement;
      if (node.modifiers.length > 0) {
        const start = node.range[0];
        const end = node.body.range[0];
        const startLine = node.loc.start.line;
        const endLine = node.body.loc.start.line; 
        const original = source.substring(start, end); //function signature         


        node.modifiers.forEach(m => {
          var mod = source.slice(m.range[0], m.range[1] + 1);
          replacement = original.replace(mod, "");
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        });
      }
    }
  });
  return mutations;
};

module.exports = MODOperator;
