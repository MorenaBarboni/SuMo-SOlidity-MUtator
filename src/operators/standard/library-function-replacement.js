const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class LFROperator {
  constructor() {
    this.ID = "LFR";
    this.name = "library-function-replacement";
  }
  /**
   * Generates LFR mutations for various Solidity libraries.
  * 
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const { importedLibraries, usingLibraries } = this.collectLibraries(visit);

    visit({
      FunctionCall: (node) => {
        this.mutateFunctionCall(node, file, source, visit, importedLibraries, usingLibraries, pushMutations);
      }
    });

    /** Adds a mutation unless an identical mutation already exists. */
    function pushMutations(mutation) {
      if (!mutations.find(existing => existing.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }

  /**
 * Collects recognized OpenZeppelin imports and using-for declarations
 *
 * @param {Function} visit - AST visitor
 * @returns {Object} Recognized imports and extension libraries
 */
  collectLibraries(visit) {
    const libraryNames = ["SafeMath", "SignedSafeMath", "Math", "SignedMath", "Arrays", "EnumerableSet"];
    const importedLibraries = {};
    const usingLibraries = new Set();
    // Identify the supported libraries and their locally imported names
    visit({
      ImportDirective: (node) => {
        if (typeof node.path !== "string") {
          return;
        }

        const path = node.path.replace(/\\/g, "/");
        const fileName = path.split("/").pop();
        if (!fileName || !fileName.endsWith(".sol")) {
          return;
        }

        const library = fileName.slice(0, -4);
        if (!libraryNames.includes(library)) {
          return;
        }

        // Avoid matching unrelated local files with coincidentally equal names
        if (!path.includes("@openzeppelin/") && !path.includes("openzeppelin-contracts/") && library !== "SafeMath" && library !== "SignedSafeMath") {
          return;
        }

        // A namespace import (import * as OZ) is not a direct library identifier
        if (node.unitAlias) {
          return;
        }

        let localName = library;
        if (Array.isArray(node.symbolAliases)) {
          // Named imports may omit a library or rename it locally.
          const importedSymbol = node.symbolAliases.find(alias => alias[0] === library);
          if (!importedSymbol) {
            return;
          }
          if (importedSymbol[1]) {
            localName = importedSymbol[1];
          }
        }

        importedLibraries[localName] = library;
      }
    });

    // Record explicit using-for declarations (including imported aliases).
    visit({
      UsingForDeclaration: (node) => {
        if (typeof node.libraryName !== "string") {
          return;
        }

        if (importedLibraries[node.libraryName]) {
          usingLibraries.add(node.libraryName);
        }
      }
    });

    return { importedLibraries, usingLibraries };
  }

  /**
   * Validates a call, resolves its library, and creates the mutation
   *
   * @param {Object} node - Function-call AST node
   * @param {string} file - Solidity file path
   * @param {string} source - Solidity source
   * @param {Function} visit - AST visitor
   * @param {Object} importedLibraries - Mapping of local symbols to libraries
   * @param {Set} usingLibraries - Libraries available through using-for
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateFunctionCall(node, file, source, visit, importedLibraries, usingLibraries, pushMutations) {
    // Mutate actual calls, not unrelated member accesses
    if (!node.expression || node.expression.type !== "MemberAccess") {
      return;
    }

    const expression = node.expression;
    if (!expression.range || !expression.loc || !expression.expression) {
      return;
    }

    // Named arguments and malformed calls are not supported
    if (!Array.isArray(node.arguments) || (Array.isArray(node.names) && node.names.length > 0)) {
      return;
    }

    const receiver = expression.expression;
    let library = null;
    let isDirectCall = false;

    if (receiver.type === "Identifier" && importedLibraries[receiver.name]) {
      library = importedLibraries[receiver.name];
      isDirectCall = true;
    } else {
      // Extension syntax is considered only when a using-for directive exists
      const candidates = [];
      for (const localName of usingLibraries) {
        const candidate = importedLibraries[localName];
        if (this.isSupportedMethod(candidate, expression.memberName)) {
          candidates.push(candidate);
        }
      }

      // Do not guess which library provides a method when several qualify.
      if (candidates.length !== 1) {
        return;
      }
      library = candidates[0];
    }

    const memberName = expression.memberName;
    if (!this.isSupportedMethod(library, memberName)) {
      return;
    }

    // Most supported methods accept two explicit operands. Membership
    // operations accept one explicit operand when used with `using for`.
    let expectedArguments = isDirectCall ? 2 : 1;
    if (library === "Math" && this.isRoundingMethod(memberName)) {
      expectedArguments = isDirectCall ? (memberName === "mulDiv" ? 4 : 2) : (memberName === "mulDiv" ? 3 : 1);
    }

    if (node.arguments.length !== expectedArguments) {
      return;
    }

    if (library === "Math" && this.isRoundingMethod(memberName)) {
      this.mutateRounding(node, receiver, isDirectCall, file, source, visit, importedLibraries, pushMutations);
      return;
    }

    // Replace only the final member identifier, retaining the receiver
    const end = expression.range[1] + 1;
    const start = end - memberName.length;
    if (start < expression.range[0]) {
      return;
    }

    const original = source.slice(start, end);
    if (original !== memberName) {
      return;
    }

    const startLine = expression.loc.end.line;
    const endLine = expression.loc.end.line;
    const functionName = contextChecker.getFunctionName(visit, startLine, endLine);


    if (library === "SafeMath" || library === "SignedSafeMath") {
      this.mutateSafeMath(file, functionName, start, end, startLine, endLine, original, memberName, library, this.ID, pushMutations);
    }
    else if (library === "Math" || library === "SignedMath") {
      this.mutateMath(file, functionName, start, end, startLine, endLine, original, memberName, this.ID, pushMutations);
    }
    else if (library === "Arrays") {
      this.mutateArrays(file, functionName, start, end, startLine, endLine, original, memberName, this.ID, pushMutations);
    }
    else if (library === "EnumerableSet") {
      this.mutateEnumerableSet(file, functionName, start, end, startLine, endLine, original, memberName, this.ID, pushMutations);
    }
  }

  /*
  ------------------------------------------------------
  LIBRARY-SPECIFIC MUTATIONS
  -------------------------------------------------------
  */


  /**
   * Mutates OpenZeppelin Math rounding modes in compatible function calls
   *
   * @param {Object} node - Function-call AST node
   * @param {Object} receiver - Expression receiving the library method
   * @param {boolean} isDirectCall - Whether the call uses qualified syntax
   * @param {string} file - Solidity file path
   * @param {string} source - Solidity source
   * @param {Function} visit - AST visitor
   * @param {Object} importedLibraries - Recognized library symbols
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateRounding(node, receiver, isDirectCall, file, source, visit, importedLibraries, pushMutations) {
    const roundingArgument = node.arguments[node.arguments.length - 1];
    if (!roundingArgument || roundingArgument.type !== "MemberAccess") {
      return;
    }

    const roundingType = roundingArgument.expression;
    if (!roundingType || roundingType.type !== "MemberAccess" || roundingType.memberName !== "Rounding") {
      return;
    }

    const roundingLibrary = roundingType.expression;
    if (!roundingLibrary || roundingLibrary.type !== "Identifier" || importedLibraries[roundingLibrary.name] !== "Math") {
      return;
    }

    // The rounding enum must belong to the library providing the function
    if (isDirectCall && receiver.name !== roundingLibrary.name) {
      return;
    }

    if (!roundingArgument.range || !roundingArgument.loc) {
      return;
    }

    const end = roundingArgument.range[1] + 1;
    const start = end - roundingArgument.memberName.length;
    const original = source.slice(start, end);
    if (original !== roundingArgument.memberName) {
      return;
    }

    const startLine = roundingArgument.loc.end.line;
    const endLine = roundingArgument.loc.end.line;
    const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
    const ID = this.ID;

    if (roundingArgument.memberName === "Floor") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "Ceil", ID));
    }
    else if (roundingArgument.memberName === "Ceil") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "Floor", ID));
    }
  }

  /**
   * Mutates compatible legacy SafeMath and SignedSafeMath arithmetic calls.
   *
   * @param {String} file - Path to the mutated smart contract
   * @param {String} functionName - Name of the mutated function
   * @param {Number} start - Start character of the mutation
   * @param {Number} end - End character of the mutation
   * @param {Number} startLine - Start line of the mutation
   * @param {Number} endLine - End line of the mutation
   * @param {String} memberName - Member name of the mutated expression
   * @param {String} library - Resolved library name
   * @param {String} ID - ID of the mutation operator  
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateSafeMath(file, functionName, start, end, startLine, endLine, original, memberName, library, ID, pushMutations) {
    if (memberName === "add") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "sub", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "div", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mul", ID));
      if (library === "SafeMath") {
        pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mod", ID));
      }
    }
    else if (memberName === "sub") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "add", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "div", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mul", ID));
      if (library === "SafeMath") {
        pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mod", ID));
      }
    }
    else if (memberName === "mul") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "add", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "div", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "sub", ID));
      if (library === "SafeMath") {
        pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mod", ID));
      }
    }
    else if (memberName === "div") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mul", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "add", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "sub", ID));
      if (library === "SafeMath") {
        pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mod", ID));
      }
    }
    else if (library === "SafeMath" && memberName === "mod") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "mul", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "add", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "sub", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "div", ID));
    }
  }

  /**
   * Mutates OpenZeppelin Math and SignedMath min/max/average calls
   *
   * @param {Object} mutationData - Source location and library details
   * @param {String} file - Path to the mutated smart contract
   * @param {String} functionName - Name of the mutated function
   * @param {Number} start - Start character of the mutation
   * @param {Number} end - End character of the mutation
   * @param {Number} startLine - Start line of the mutation
   * @param {Number} endLine - End line of the mutation
   * @param {String} memberName - Member name of the mutated expression
   * @param {String} ID - ID of the mutation operator  
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateMath(file, functionName, start, end, startLine, endLine, original, memberName, ID, pushMutations) {
    if (memberName === "min") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "max", ID));
    }
    else if (memberName === "max") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "min", ID));
    }
    else if (memberName === "average") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "min", ID));
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "max", ID));
    }
  }

  /**
   * Mutates sorted-array boundary selection calls
   *
   * @param {Object} mutationData - Source location and library details
   * @param {String} file - Path to the mutated smart contract
   * @param {String} functionName - Name of the mutated function
   * @param {Number} start - Start character of the mutation
   * @param {Number} end - End character of the mutation
   * @param {Number} startLine - Start line of the mutation
   * @param {Number} endLine - End line of the mutation
   * @param {String} memberName - Member name of the mutated expression
   * @param {String} ID - ID of the mutation operator  
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateArrays(file, functionName, start, end, startLine, endLine, original, memberName, ID, pushMutations) {
    if (memberName === "lowerBound") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "upperBound", ID));
    }
    else if (memberName === "upperBound") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "lowerBound", ID));
    }
  }

  /**
   * Mutates EnumerableSet membership updates.
   *
   * @param {String} file - Path to the mutated smart contract
   * @param {String} functionName - Name of the mutated function
   * @param {Number} start - Start character of the mutation
   * @param {Number} end - End character of the mutation
   * @param {Number} startLine - Start line of the mutation
   * @param {Number} endLine - End line of the mutation
   * @param {String} memberName - Member name of the mutated expression
   * @param {String} ID - ID of the mutation operator  
   * @param {Function} pushMutations - Adds a distinct mutation
   */
  mutateEnumerableSet(file, functionName, start, end, startLine, endLine, original, memberName, ID, pushMutations) {
    if (memberName === "add") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "remove", ID));
    }
    else if (memberName === "remove") {
      pushMutations(new Mutation(file, functionName, start, end, startLine, endLine, original, "add", ID));
    }
  }


  /*
  ------------------------------------------------------
  UTILS
  -------------------------------------------------------
  */

  /**
   * Checks whether a library provides a supported method with compatible replacements.
   *
   * @param {string} library - Resolved library name
   * @param {string} method - Original method name
   * 
   * @returns {boolean} Whether this method has a replacement rule
   */
  isSupportedMethod(library, method) {
    if (library === "SafeMath" || library === "SignedSafeMath") {
      switch (method) {
        case "add":
        case "sub":
        case "mul":
        case "div":
          return true;
        case "mod":
          return library === "SafeMath";
        default:
          return false;
      }
    }

    if (library === "Math" || library === "SignedMath") {
      switch (method) {
        case "min":
        case "max":
        case "average":
          return true;
        case "mulDiv":
        case "sqrt":
        case "log2":
        case "log10":
        case "log256":
          return library === "Math";
        default:
          return false;
      }
    }

    if (library === "Arrays") {
      return method === "lowerBound" || method === "upperBound";
    }

    if (library === "EnumerableSet") {
      return method === "add" || method === "remove";
    }

    return false;
  }

  /**
   * Checks whether the Math method has an OpenZeppelin rounding overload.
   *
   * @param {string} method - Mathematical function name.
   * @returns {boolean} Whether the method supports explicit rounding.
   */
  isRoundingMethod(method) {
    if (method === "mulDiv") {
      return true;
    }
    if (method === "sqrt") {
      return true;
    }
    if (method === "log2") {
      return true;
    }
    if (method === "log10") {
      return true;
    }
    if (method === "log256") {
      return true;
    }
    return false;
  }

}

module.exports = LFROperator;
