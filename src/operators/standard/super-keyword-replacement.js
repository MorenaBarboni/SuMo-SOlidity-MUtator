const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class SKROperator {
  constructor() {
    this.ID = "SKR";
    this.name = "super-keyword-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];
    const overriddenFunctions = [];

    visit({
      ContractDefinition: (node) => {
        if (node.baseContracts.length > 0)
          //Save all overridden function nodes
          visit({
            FunctionDefinition: (node) => {
              if (node.override) {
                overriddenFunctions.push(node);
              }
            }
          });

        visit({
          FunctionCall: (node) => {
            if (overriddenFunctions.some(f => f.name === node.expression.name)) {
              let overriddenFunction = overriddenFunctions.filter(f => f.name === node.expression.name)[0];
              if (contextChecker.contractContaining(visit, overriddenFunction) === contextChecker.contractContaining(visit, node)) {
                mutateAddSuper(visit, node);
              }
            }
          }
        });

        visit({
          MemberAccess: (node) => {
            if (node.expression.name === "super") {
              mutateRemoveSuper(visit, node);
            }
          }
        });
      }
    });

    /**
     * Removes the super keyword from the node
      * @param {Function} visit the visitor
      * @param {Object} node the FunctionCall node to be mutated
     */
    function mutateRemoveSuper(visit, node) {
      const start = node.expression.range[0];
      const end = node.expression.range[1] + 2;
      const startLine = node.expression.loc.start.line;
      const endLine = node.expression.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit,startLine,endLine);
      const original = source.slice(start, end);
      const replacement = "";

      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, "SKID"));
    }

    /**
     * Adds the super keyword to the node
      * @param {Function} visit the visitor
      * @param {Object} node the FunctionCall node to be mutated
     */
    function mutateAddSuper(visit, node) {
      const start = node.expression.range[0];
      const end = node.expression.range[1] + 1;
      const startLine = node.expression.loc.start.line;
      const endLine = node.expression.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit,startLine,endLine);
      const original = source.slice(start, end);
      const replacement = "super." + original;
      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, "SKID"));
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


module.exports = SKROperator;