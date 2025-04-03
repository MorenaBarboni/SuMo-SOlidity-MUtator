const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class SCDOperator {
  constructor() {
    this.ID = "SCD";
    this.name = "selfdestruct-call-deletion";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      FunctionCall: (node) => {
        if (node.expression.name === "selfdestruct") {
          mutateDeleteSelfdestruct(visit, node);
        }
      }
    });

    /**
   * Comments out the selfdestruct invocation
   * @param {*} visit the visitor
   * @param {Object} node the node to be mutated
   */
    function mutateDeleteSelfdestruct(visit, node) {
      const start = node.range[0];
      const temp = source.slice(start);
      const delimiter = temp.indexOf(";");
      const end = start + delimiter + 1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
      const original = source.slice(start, end);
      const replacement = "/* " + original + " */";
      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
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


module.exports = SCDOperator;