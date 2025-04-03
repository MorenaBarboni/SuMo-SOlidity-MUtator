const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation')

class GVROperator {
  constructor() {
    this.ID = "GVR";
    this.name = "global-variable-replacement";
  }

  getMutations(file, source, visit) {
    const ID = this.ID;
    const mutations = [];

    visit({
      MemberAccess: (node) => {
        var keywords = ['basefee', 'blockhash', 'chainid', 'coinbase', 'difficulty', 'gaslimit', 'gasprice', 'number', 'timestamp', 'value'];

        if (keywords.includes(node.memberName)) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);

          if (node.expression.name === 'msg' && node.memberName === 'value') {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "msg.value+1", ID));
          }
          else if (node.expression.name === 'tx' && node.memberName === 'gasprice') {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'tx.gasprice+1', ID));
          }
          else if (node.expression.name === 'block') {
            if (node.memberName === 'basefee') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.basefee+1', ID));
            } else if (node.memberName === 'chainid') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.chainid-1', ID));
            } else if (node.memberName === 'coinbase') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'msg.sender', ID));
            } else if (node.memberName === 'difficulty') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.prevrandao', ID));
            } else if (node.memberName === 'gaslimit') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.gaslimit+1', ID));
            } else if (node.memberName === 'number') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.number+1', ID));
            } else if (node.memberName === 'timestamp') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'block.prevrandao', ID));
            }
          }
        }
      },
    });

    visit({
      FunctionCall: (node) => {
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        if (node.expression.name) {
          if (node.expression.name === 'gasleft') {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'gasleft()+1', ID));
          } else {
            if (node.expression.name === 'blockhash') {
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, '0', ID));
            }
          }
        }
      },
    });

    visit({
      Identifier: (node) => {
        //Alias for block.timestamp
        if (node.name === 'now') {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, 'now+1', ID));
        }
      },
    });

    /**
    * Push a mutation to the generated mutations list
    * @param {Object} mutation the mutation
    */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = GVROperator