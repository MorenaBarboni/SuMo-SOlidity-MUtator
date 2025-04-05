const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class SLRoperator {
  constructor() {
    this.ID = "SLR";
    this.name = "string-literal-replacement";
  }
  getMutations(file, source, visit) {
    const mutations = [];
    const ignoreFunctions = ["require", "assert", "revert", "keccak256", "sha256", "ripemd160"]; //Do not mutate hashing functions and exception handling messages
    var ignoreNodes = []; //Indexes of nodes to be ignored
 
    /**
    * Add functions to the list of indexes to be ignored
    */
    visit({
      FunctionCall: (node) => {
        if (ignoreFunctions.includes(node.expression.name)) {
          let ignore = {};
          ignore.start = node.range[0];
          ignore.end = node.range[1] + 1;
          ignoreNodes.push(ignore);
        }
      }
    });

    /**
     * Add import directives to the list of indexes to be ignored
     */
    visit({
      ImportDirective: (node) => {
        let ignore = {};
        ignore.start = node.range[0];
        ignore.end = node.range[1];
        ignoreNodes.push(ignore);
      }
    });

    /**
    * Visit and mutate each string literal value
    */
    visit({
      StringLiteral: (node) => {
        if (node.value) {
          const functionName = contextChecker.getFunctionName(visit, node.loc.start.line, node.loc.end.line);
          mutateEmptyString(visit, node, functionName);
        }
      }
    });

    /**
    * Mutates the right-hand side of an assignment to the empty string
    * @param {*} visit the visitor
    * @param {Object} node the right-hand expression node
    * @param {null} [functionName=null] the name of the function enclosing the node
    */
    function mutateEmptyString(visit, node, fName = null) {
      const start = node.range[0];
      const end = node.range[1] + 1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const functionName = (fName === null) ? contextChecker.getFunctionName(visit, start, end) : fName;
      const original = source.slice(start, end);
      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "\"\"", "SLR"));
    }

    /**
    * Add a mutation to the mutations list
    * @param {Object} mutation the mutation object
    */
    function pushMutation(mutation) {
      let mutate = true;
      for (let i = 0; i < ignoreNodes.length; i++) {
        const e = ignoreNodes[i];
        if (mutation.start >= e.start && mutation.end <= e.end) {
          mutate = false;
          break;
        }
      }
      if (mutate && !mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = SLRoperator;