const Mutation = require("../../mutation");

class MODOperator {
  constructor() {
    this.ID = "MOD";
    this.name = "modifier-deletion";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      FunctionDefinition: (node) => {
        let replacement;
        if (node.modifiers.length > 0) {
          const start = node.range[0];
          const end = node.body.range[0];
          const startLine = node.loc.start.line;
          const endLine = node.body.loc.start.line;
          let functionName = node.name;
          if (node.isConstructor) { functionName = "constructor"; }
          else if (node.isReceiveEther) { functionName = "receive"; }
          else if (node.isFallback) { functionName = "fallback"; }

          const original = source.substring(start, end); //function signature  
          //only remove the first modifier  
          var mod = source.slice(node.modifiers[0].range[0], node.modifiers[0].range[1] + 1)
          replacement = original.replace(mod, "");
          mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });
    return mutations;
  }
}

module.exports = MODOperator;