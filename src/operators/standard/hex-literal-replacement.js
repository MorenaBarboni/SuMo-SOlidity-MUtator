const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class HLRoperator {
  constructor() {
    this.ID = "HLR";
    this.name = "hexadecimal-literal-replacement";
  }
  
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      HexLiteral: (node) => {
        if (node.value) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit,startLine,endLine);
          const original = source.slice(start, end);
          let hexToDecimal = parseInt(node.value, 16);
          let hexToDecimalIncrement = (hexToDecimal + 1).toString(16);
          let hexToDecimalDecrement = (hexToDecimal - 1).toString(16);

          //Even hex- nibbles
          if (hexToDecimalIncrement.length % 2 !== 0) {
            hexToDecimalIncrement = "0" + hexToDecimalIncrement;
          }
          if (hexToDecimalDecrement.length % 2 !== 0) {
            hexToDecimalDecrement = "0" + hexToDecimalDecrement;
          }

          let replacement = original.replace(node.value, hexToDecimalIncrement);
          let replacement2 = original.replace(node.value, hexToDecimalDecrement);

          if (hexToDecimal === 0) {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
          } else {
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
          }
        }
      }
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


module.exports = HLRoperator;