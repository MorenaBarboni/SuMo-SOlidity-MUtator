const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class VUROperator {
  constructor() {
    this.ID = "VUR";
    this.name = "variable-unit-replacement";
  }

  /**
  * Generates VUR mutations for Ether and time denominations.
  *
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      NumberLiteral: (node) => {
        if (node.subdenomination) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);
          let replacement;

          switch (node.subdenomination) {
            // VURe - Ether Units Replacement
            case 'wei':
              replacement = original.replace('wei', 'ether');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'gwei':
              replacement = original.replace('gwei', 'wei');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'finney':
              replacement = original.replace('finney', 'ether');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'szabo':
              replacement = original.replace('szabo', 'ether');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'ether':
              replacement = original.replace('ether', 'wei');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;

            // VURt - Time Units Replacement
            case 'seconds':
              replacement = original.replace('seconds', 'minutes');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'minutes':
              replacement = original.replace('minutes', 'seconds');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'hours':
              replacement = original.replace('hours', 'minutes');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'days':
              replacement = original.replace('days', 'hours');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'weeks':
              replacement = original.replace('weeks', 'days');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
            case 'years':
              replacement = original.replace('years', 'weeks');
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
              break;
          }
        }
      }
    });

    return mutations;

    /**
     * Adds a mutation to the mutations list unless an equivalent mutation is present.
     *
     * @param {Object} mutation - The mutation to add
     */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }
  }
}

module.exports = VUROperator;