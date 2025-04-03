const Mutation = require("../../mutation");

class OMDOperator {
  constructor() {
    this.ID = "OMD";
    this.name = "overridden-modifier-deletion";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      ContractDefinition: (node) => {

        if (node.baseContracts.length > 0)
          visit({
            ModifierDefinition: (node) => {

              if (node.override) {
                const start = node.range[0];
                const end = node.range[1] + 1;
                const startLine = node.loc.start.line;
                const endLine = node.loc.end.line;
                const functionName = node.name;
                var original = source.slice(start, end);
                mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, "", this.ID));
              }
            }
          });
      }
    });

    return mutations;
  }
}


module.exports = OMDOperator;
