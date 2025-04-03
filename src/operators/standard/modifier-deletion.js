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

          node.modifiers.forEach(m => {
            var mod = source.slice(m.range[0], m.range[1] + 1);
            replacement = original.replace(mod, "");
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          });
        }
      }
    });

    /**
      * Add a mutation to the mutations list
      * @param {Object} mutation the mutation object
      */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = MODOperator;