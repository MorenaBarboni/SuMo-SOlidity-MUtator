const Mutation = require("../../mutation");

class ORFDOperator {
  constructor() {
    this.ID = "ORFD";
    this.name = "overridden-function-deletion";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      ContractDefinition: (node) => {

        if (node.baseContracts.length > 0)
          visit({
            FunctionDefinition: (node) => {

              if (node.override) {
                const start = node.range[0];
                const end = node.range[1] + 1;
                const startLine = node.loc.start.line;
                const endLine = node.loc.end.line;
                const functionName = node.name;
                const original = source.slice(start, end);
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "", this.ID));
              }
            }
          });
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


module.exports = ORFDOperator;
