const Mutation = require("../mutation");

function MOCOperator() {
}

MOCOperator.prototype.ID = "MOC";
MOCOperator.prototype.name = "modifier-order-change";

MOCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      /*If the function is decorated with at least 2 modifiers */
      if (node.modifiers.length > 1) {
        let replacement = source.slice(node.range[0], node.range[1] + 1);

        for (var i = 0; i < node.modifiers.length; i++) {
          var mod1 = source.slice(node.modifiers[i].range[0], node.modifiers[i].range[1] + 1);
          if (i != node.modifiers.length - 1) {
            var mod2 = source.slice(node.modifiers[i + 1].range[0], node.modifiers[i + 1].range[1] + 1);
            replacement = replacement.replace(mod1, "*").replace(mod2, mod1).replace("*", mod2);
          }
        }
        mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, replacement, this.ID));
      }
    }
  });

  return mutations;
};

module.exports = MOCOperator;
