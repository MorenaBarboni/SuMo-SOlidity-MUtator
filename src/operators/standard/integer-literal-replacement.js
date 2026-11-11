const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ILROperator {
  constructor() {
    this.ID = "ILR";
    this.name = "integer-literal-replacement";
  }
  /**
  * Generates ILR mutations for integer literals
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const arrayRestrictions = [];
    const addressArguments = [];
    const negativeLiterals = new Map();
    const loopInitializerLiterals = new Set();
    const ID = this.ID;

    // Record contexts where another operator owns the numeric mutation.
    visit({
      // Collect the zero initializer of canonical ascending for loops.
      //These are skipped because they are handled by LSC, not by ILR.
      ForStatement: (node) => {
        const initializer = contextChecker.getZeroBasedLoopInitializer(node, source);
        if (initializer) {
          loopInitializerLiterals.add(getRangeKey(initializer.range));
        }
      },

      //Collect array restrictions. When an array has numeric elements, 
      // only the first element is mutated by ILR, the rest are skipped.
      TupleExpression: (node) => {
        // Only inline array literals need the one-element mutation restriction.
        if (!node.isArray || !node.range || !Array.isArray(node.components)) {
          return;
        }
        const selected = getFirstNumericArrayElement(node.components);
        if (selected) {
          arrayRestrictions.push({ node, selected });
        }
      },

      // Address conversions (e.g., address(0)) are skipped because they are handled by AVR.
      FunctionCall: (node) => {
        if (contextChecker.getAddressFunctionCallKind(node) !== "address" || !Array.isArray(node.arguments)) {
          return;
        }
        for (const argument of node.arguments) {
          if (argument && argument.range) {
            addressArguments.push(argument);
          }
        }
      },

      // Collect negative literals for mutation. 
      // A negative literal is represented by '-' around a NumberLiteral.
      UnaryOperation: (node) => {
        const isNegativeNumber = node.operator === "-" && node.range && node.loc &&
          node.subExpression && node.subExpression.type === "NumberLiteral";
        if (isNegativeNumber) {
          negativeLiterals.set(node.subExpression, node);
        }
      }
    });

    visit({
      NumberLiteral: (node) => {
        mutateIntegerLiteral(node);
      }
    });

    /**
    * Generates the +/- 1 mutations for one eligible decimal integer literal.
    *
    * @param {Object} node A NumberLiteral AST node.
    * @returns {void}
    */
    function mutateIntegerLiteral(node) {
      // Source offsets and line information are required to create a mutation.
      if (!node.range || !node.loc || shouldSkipLiteral(node)) {
        return;
      }

      // HLR handles hexadecimal values; ILR requires a valid decimal source range.
      const details = contextChecker.getNumberLiteralSource(node, source);
      if (!details || contextChecker.isHexadecimalLiteral(node, source)) {
        return;
      }

      const value = contextChecker.parseIntegerLiteral(details.literal);
      if (value === null) {
        return;
      }

      // Include the unary minus in both the original text and the replacement value.
      const negation = negativeLiterals.get(node);
      let start = details.start;
      let end = details.end;
      let signedValue = value;
      let startLine = node.loc.start.line;
      let endLine = node.loc.end.line;

      if (negation) {
        start = negation.range[0];
        end = Math.max(negation.range[1] + 1, details.end);
        signedValue = -value;
        startLine = negation.loc.start.line;
        endLine = negation.loc.end.line;
      }

      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
      const original = source.slice(start, end);
      const denomination = details.denomination;

      // Zero has only one useful adjacent integer; one has two boundary-specific replacements.
      if (signedValue === 0n) {
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "1" + denomination, ID));
      } else if (signedValue === 1n) {
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "0" + denomination, ID));
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "2" + denomination, ID));
      } else if (signedValue === -1n) {
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "0" + denomination, ID));
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "-2" + denomination, ID));
      } else {
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, (signedValue - 1n).toString() + denomination, ID));
        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, (signedValue + 1n).toString() + denomination, ID));
      }
    }

    /**
     * Finds the first decimal integer element in an inline array literal.
     * Negative elements are represented by a unary operation around the number.
     *
     * @param {Object[]} components The array literal's AST components.
     * @returns {Object|null} The first eligible NumberLiteral, if present.
     */
    function getFirstNumericArrayElement(components) {
      for (const component of components) {
        const literal = getDecimalLiteralFromArrayComponent(component);
        if (literal) {
          return literal;
        }
      }

      return null;
    }

    /**
     * Extracts a decimal NumberLiteral from an array component.
     *
     * @param {Object} component An array component AST node.
     * @returns {Object|null} The decimal NumberLiteral, if the component is numeric.
     */
    function getDecimalLiteralFromArrayComponent(component) {
      if (!component) {
        return null;
      }
      // Hexadecimal literals are skipped because they are handled by HLR.
      if (component.type === "NumberLiteral") {
        return contextChecker.isHexadecimalLiteral(component, source) ? null : component;
      }

      // Solidity represents a negative array element as UnaryOperation('-').
      if (component.type !== "UnaryOperation" || component.operator !== "-") {
        return null;
      }

      const operand = component.subExpression;
      if (!operand || operand.type !== "NumberLiteral") {
        return null;
      }

      // Keep hexadecimal array elements under HLR, even when they are negative.
      if (contextChecker.isHexadecimalLiteral(operand, source)) {
        return null;
      }

      return operand;
    }

    /**
    * Builds a key that identifies an AST node by its source range.
    *
    * @param {number[]} range The node's inclusive source range.
    * @returns {string} A stable key for the range.
    */
    function getRangeKey(range) {
      return range[0] + ":" + range[1];
    }

    /**
     * Checks whether a literal belongs to a context handled by another operator
     * or is a non-selected element of an inline numeric array.
     *
     * @param {Object} node A NumberLiteral AST node.
     * @returns {boolean} True when ILR must not mutate the literal.
     */
    function shouldSkipLiteral(node) {
      // LSC owns the zero initializer of canonical ascending for loops.
      if (loopInitializerLiterals.has(getRangeKey(node.range))) {
        return true;
      }

      // AVR owns every numeric argument converted explicitly to address.
      for (const argument of addressArguments) {
        const isInsideArgument = contextChecker.containsRange(argument, node);
        if (isInsideArgument) {
          return true;
        }
      }

      // Only the first numeric element of each inline array is mutated by ILR.
      for (const restriction of arrayRestrictions) {
        const isInsideArray = contextChecker.containsRange(restriction.node, node);
        if (isInsideArray && restriction.selected !== node) {
          return true;
        }
      }

      return false;
    }

    /**
     * Adds a mutation unless an identical mutation identifier is already present.
     *
     * @param {Mutation} mutation The candidate mutation.
     * @returns {void}
     */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = ILROperator;