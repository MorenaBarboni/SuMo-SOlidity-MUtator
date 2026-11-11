
const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class DLROperator {
  constructor() {
    this.ID = "DLR";
    this.name = "data-location-replacement";
  }

  /**
  * Generates DLR mutations for data location keywords.
  * DLR mutations only replaces 'storage' with 'memory' in local variable declarations
  * when the variable refers to a valid state variable.
  *
  * @param {string} file - The path of the Solidity source file
  * @param {string} source - The Solidity source code
  * @param {Function} visit - The solidity-parser-ast visitor function
  * 
  * @returns {Mutation[]} The generated mutations
  */
  getMutations(file, source, visit) {
    const mutations = [];
    const statements = [];
    const contracts = [];
    const structs = new Map();

    // Collect the AST nodes needed to validate mutations
    visit({
      ContractDefinition: (node) => {
        contracts.push(node);
      },
      StructDefinition: (node) => {
        if (!structs.has(node.name)) {
          structs.set(node.name, []);
        }

        structs.get(node.name).push(node);
      },
      VariableDeclarationStatement: (node) => {
        statements.push(node);
      }
    });

    // Examine each local variable declaration.
    for (const statement of statements) {
      const declarations = statement.variables || [];

      // Ignore tuple declarations and empty declarations.
      if (declarations.length !== 1) {
        continue;
      }

      const node = declarations[0];

      if (!node) {
        continue;
      }

      // Only replace storage with memory
      if (node.storageLocation !== "storage") {
        continue;
      }

      if (!node.name || !node.range || !node.loc) {
        continue;
      }

      // A local storage reference must have an initializer
      if (!statement.initialValue) {
        continue;
      }

      // The declared type must be copyable to memory
      if (!this.isCopyable(node.typeName, structs)) {
        continue;
      }

      // Find the contract containing the declaration.
      let contract = null;

      for (const candidate of contracts) {
        if (candidate.kind !== "contract") {
          continue;
        }

        if (contextChecker.containsRange(candidate, statement)) {
          contract = candidate;
          break;
        }
      }

      if (!contract) {
        continue;
      }

      // Find the root identifier of the initializer.
      // For example, balances[user].amount has root 'balances'.
      let root = statement.initialValue;

      while (root) {
        if (root.type === "IndexAccess") {
          root = root.base;
        } else if (root.type === "MemberAccess") {
          root = root.expression;
        } else {
          break;
        }
      }

      if (!root || root.type !== "Identifier") {
        continue;
      }

      // Collect the state variables declared in the contract
      const stateVariableNames = [];

      for (const sub of contract.subNodes || []) {
        if (sub.type !== "StateVariableDeclaration") {
          continue;
        }

        for (const variable of sub.variables || []) {
          if (variable && variable.name) {
            stateVariableNames.push(variable.name);
          }
        }
      }

      // The initializer must reference a state variable
      if (!stateVariableNames.includes(root.name)) {
        continue;
      }

      // Find the function containing the declaration
      let enclosingFunction = null;

      for (const sub of contract.subNodes || []) {
        if (sub.type !== "FunctionDefinition") {
          continue;
        }

        if (contextChecker.containsRange(sub, statement)) {
          enclosingFunction = sub;
          break;
        }
      }

      if (!enclosingFunction) {
        continue;
      }

      // Check whether a parameter or return variable shadows the state variable referenced by the initializer
      const parameters = [...(enclosingFunction.parameters || []), ...(enclosingFunction.returnParameters || [])];

      let shadowed = false;

      for (const parameter of parameters) {
        if (parameter && parameter.name === root.name) {
          shadowed = true;
          break;
        }
      }

      if (shadowed) {
        continue;
      }

      // Check whether an earlier local declaration shadows the referenced state variable.
      for (const previous of statements) {
        if (previous === statement) {
          continue;
        }

        if (!contextChecker.containsRange(enclosingFunction, previous)) {
          continue;
        }

        if (previous.range[0] >= statement.range[0]) {
          continue;
        }

        for (const variable of previous.variables || []) {
          if (variable && variable.name === root.name) {
            shadowed = true;
            break;
          }
        }

        if (shadowed) {
          break;
        }
      }

      if (shadowed) {
        continue;
      }

      // Extract the declaration and locate its storage keyword.
      const declarationStart = node.range[0];
      const declarationEnd = node.range[1] + 1;
      const declaration = source.slice(declarationStart, declarationEnd);

      const offset = this.findStorageToken(declaration);

      if (offset === null) {
        continue;
      }

      // Mutate only the storage keyword, not the whole declaration.
      const start = declarationStart + offset;
      const end = start + "storage".length;
      const original = source.slice(start, end);
      const replacement = "memory";

      if (original !== "storage") {
        continue;
      }

      // Determine the exact source line of the keyword.
      const precedingText = source.slice(declarationStart, start);
      const lineBreaks = precedingText.match(/\n/g) || [];
      const startLine = node.loc.start.line + lineBreaks.length;
      const endLine = startLine;

      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

      pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
    }

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

  /**
   * Checks whether a Solidity type can be copied from storage to memory.
   *
   * Supports strings, bytes, arrays and structs without mappings.
   * Unknown or ambiguous user-defined types are excluded.
   *
   * @param {Object} type - The AST node describing the type.
   * @param {Map} structs - Struct definitions in the source file.
   * @param {Set} visited - Structs already examined.
   * @returns {boolean} True if the type is considered copyable.
   */
  isCopyable(type, structs, visited = new Set()) {
    if (!type) {
      return false;
    }

    // Mappings and function types cannot be copied
    if (type.type === "Mapping" || type.type === "FunctionTypeName") {
      return false;
    }

    // Only string and bytes are relevant elementary reference types
    if (type.type === "ElementaryTypeName") {
      return type.name === "string" || type.name === "bytes";
    }

    // Arrays are copyable if their elements can be copied
    if (type.type === "ArrayTypeName") {
      const baseType = type.baseTypeName;

      if (!baseType) {
        return false;
      }

      if (baseType.type === "ElementaryTypeName") {
        return true;
      }

      return this.isCopyable(baseType, structs, visited);
    }

    // Structs are copyable only if all their members are copyable
    if (type.type === "UserDefinedTypeName") {
      const name = (type.namePath || "").split(".").pop();
      const matches = structs.get(name) || [];

      // Avoid ambiguous or unknown struct names
      if (matches.length !== 1) {
        return false;
      }

      const struct = matches[0];

      // Avoid recursive examination of the same struct
      if (visited.has(struct)) {
        return false;
      }

      const nextVisited = new Set(visited);
      nextVisited.add(struct);

      for (const member of struct.members || []) {
        const memberType = member.typeName;

        if (!memberType) {
          return false;
        }

        // Elementary struct members can be copied
        if (memberType.type === "ElementaryTypeName") {
          continue;
        }

        if (!this.isCopyable(memberType, structs, nextVisited)) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Finds the 'storage' keyword in a variable declaration.
   *
   * Comments, quoted strings and longer identifiers are ignored
   * to ensure that only the actual keyword is replaced.
   *
   * @param {string} text - The source text of the declaration.
   * @returns {number|null} The keyword offset, or null if ambiguous.
   */
  findStorageToken(text) {
    const matches = [];
    let i = 0;

    while (i < text.length) {

      // Skip single-line comments.
      if (text.startsWith("//", i)) {
        const end = text.indexOf("\n", i + 2);
        if (end === -1) {
          break;
        }
        i = end;
        continue;
      }

      // Skip multi-line comments.
      if (text.startsWith("/*", i)) {
        const end = text.indexOf("*/", i + 2);
        if (end === -1) {
          return null;
        }
        i = end + 2;
        continue;
      }

      // Skip quoted strings.
      if (text[i] === '"' || text[i] === "'") {
        const quote = text[i];
        i++;
        while (i < text.length) {
          if (text[i] === "\\") {
            i += 2;
          } else if (text[i] === quote) {
            i++;
            break;
          } else {
            i++;
          }
        }
        continue;
      }

      // Read complete identifiers to avoid partial matches
      if (/[A-Za-z_$]/.test(text[i])) {
        const start = i;
        i++;

        while (i < text.length && /[A-Za-z0-9_$]/.test(text[i])) {
          i++;
        }

        const word = text.slice(start, i);

        if (word === "storage") {
          matches.push(start);
        }
        continue;
      }

      i++;
    }

    // There must be exactly one storage keyword
    if (matches.length !== 1) {
      return null;
    }

    return matches[0];
  }

}

module.exports = DLROperator;
