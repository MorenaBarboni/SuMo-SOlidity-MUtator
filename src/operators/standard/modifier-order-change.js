const Mutation = require('../../mutation')

function MOCOperator() {
  this.ID = "MOC";
  this.name = "modifier-order-change";
}

MOCOperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      /*If the function is decorated with at least 2 modifiers */
      if (node.modifiers.length > 1) {
        const start = node.range[0];
        const end = node.body.range[0];
        const startLine = node.loc.start.line;
        const endLine = node.body.loc.start.line;
        const original = source.substring(start, end);  //function signature
        let replacement;      

        for (var i = 0; i < node.modifiers.length; i++) {
          var mod1 = source.slice(node.modifiers[i].range[0], node.modifiers[i].range[1] + 1);
          if (i != node.modifiers.length - 1) {
            var mod2 = source.slice(node.modifiers[i + 1].range[0], node.modifiers[i + 1].range[1] + 1);
            replacement = original.replace(mod1, "*").replace(mod2, mod1).replace("*", mod2);
          }
        }
        mutations.push(new Mutation(file, start , end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });

  return mutations;
};

module.exports = MOCOperator;
