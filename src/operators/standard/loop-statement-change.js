const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class LSCOperator {
  constructor() {
    this.ID = "LSC";
    this.name = "loop-statement-change";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      ForStatement: (node) => {
        const start = node.conditionExpression.range[0];
        const end = node.conditionExpression.range[1] + 1;
        const startLine = node.conditionExpression.loc.start.line;
        const endLine = node.conditionExpression.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "false", this.ID));
      }
    }),
      visit({
        WhileStatement: (node) => {
          const start = node.condition.range[0];
          const end = node.condition.range[1] + 1;
          const startLine = node.condition.loc.start.line;
          const endLine = node.condition.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);

          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "false", this.ID));
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


module.exports = LSCOperator;