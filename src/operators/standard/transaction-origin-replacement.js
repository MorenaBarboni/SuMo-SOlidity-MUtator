const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class TOROperator {
  constructor() {
    this.ID = "TOR";
    this.name = "transaction-origin-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      MemberAccess: (node) => {
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        if ((node.memberName == "origin")) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "msg.sender", this.ID));
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

module.exports = TOROperator;