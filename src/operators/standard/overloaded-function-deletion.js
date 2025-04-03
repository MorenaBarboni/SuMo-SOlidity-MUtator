const Mutation = require("../../mutation");

class OLFDOperator {
  constructor() {
    this.ID = "OLFD";
    this.name = "overloaded-function-deletion";
  }

  getMutations(file, source, visit) {
    const ID = this.ID;
    const mutations = [];
    var contractFunctions = [];
    var overloadedFunctions = [];

    visitFunctions(mutate);

    function visitFunctions(callback) {
      /*Visit and save all contract functions */
      visit({
        FunctionDefinition: (node) => {
          if (!node.isConstructor && !node.isReceiveEther && !node.isFallback) {
            contractFunctions.push(node);
          }
        }
      });
      callback();
    }

    /*Mutate overloaded functions */
    function mutate() {
      const lookup = contractFunctions.reduce((a, e) => {
        a[e.name] = ++a[e.name] || 0;
        return a;
      }, {});
      overloadedFunctions = contractFunctions.filter(e => lookup[e.name]);
      overloadedFunctions.forEach(node => {
        //Overridden functions are mutated by ORFD
        if (!node.override) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = node.name;
          const original = source.slice(start, end);
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "", ID));
        }
      });
    }

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


module.exports = OLFDOperator;
