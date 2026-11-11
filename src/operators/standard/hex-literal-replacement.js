const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class HLRoperator {
  constructor() {
    this.ID = "HLR";
    this.name = "hexadecimal-literal-replacement";
  }
  /**
  * Generates HLR mutations for hex string literals
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
      HexLiteral: (node) => {
        // Ignore nodes without a valid source range or location
        if (!contextChecker.hasSourceLocation(node)) {
          return;
        }

        const start = node.range[0];
        const end = node.range[1] + 1;

        if (start < 0 || end > source.length || start >= end) {
          return;
        }

        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end);

        const literal = contextChecker.parseHexStringLiteral(original);
        if (!literal) {
          return;
        }
        const { digits, quote: startQuote } = literal;

        // Hex strings consist of complete bytes; empty hex strings are not mutated
        if (digits.length === 0 || digits.length % 2 !== 0) {
          return;
        }

        const value = BigInt("0x" + digits);
        const maximum = (1n << BigInt(digits.length * 4)) - 1n;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

        // Preserve the original number of bytes to avoid changing fixed-bytes types.
        if (value < maximum) {
          const increment = (value + 1n).toString(16).padStart(digits.length, "0");
          const replacement = "hex" + startQuote + increment + startQuote;

          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }

        // Avoid generating negative values for all-zero hexadecimal literals.
        if (value > 0n) {
          const decrement = (value - 1n).toString(16).padStart(digits.length, "0");
          const replacement = "hex" + startQuote + decrement + startQuote;

          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });

    /**
     * Adds a mutation unless another mutation with the same ID already exists.
     *
     * @param {Mutation} mutation Mutation to add.
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
