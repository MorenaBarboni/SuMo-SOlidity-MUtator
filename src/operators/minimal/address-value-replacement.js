const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class AVROperator {
  constructor() {
    this.ID = "AVR";
    this.name = "address-value-replacement";
  }

  /**
   * Generates AVR mutations for address-valued expressions
   *
   * @param {string} file - The path of the Solidity source file
   * @param {string} source - The Solidity source code
   * @param {Function} visit - The solidity-parser-ast visitor function
   * 
   * @returns {Mutation[]} The generated mutations
   */
  getMutations(file, source, visit) {
    const ID = this.ID;
    const mutations = [];
    const contracts = [];
    const scopes = [];

    collectScopes();
    collectDeclarations();

    const sites = getAddressValueSites();

    for (const site of sites) mutateAddressSite(site);

    return mutations;

    /**
     * Collects contract, function, and modifier ranges used for identifier resolution.
     *
     * @returns {void}
     */
    function collectScopes() {
      visit({
        ContractDefinition: (node) => {
          if (node.range) contracts.push({ node, start: node.range[0], end: node.range[1], stateVariables: new Map() });
        },
        FunctionDefinition: (node) => {
          if (node.range) scopes.push({ node, start: node.range[0], end: node.range[1], variables: new Map() });
        },
        ModifierDefinition: (node) => {
          if (node.range) scopes.push({ node, start: node.range[0], end: node.range[1], variables: new Map() });
        }
      });
    }

    /**
     * Collects state and local declarations needed to recognize assignments
     * to known address variables.
     *
     * @returns {void}
     */
    function collectDeclarations() {
      visit({
        StateVariableDeclaration: (node) => {
          const contract = getContainingContract(node);
          if (!contract) return;

          for (const variable of node.variables || []) {
            if (!variable?.name) continue;
            contract.stateVariables.set(variable.name, contextChecker.getAddressKind(variable) || "other");
          }
        }
      });

      visit({
        VariableDeclaration: (node) => {
          if (!node.name) return;

          const scope = getContainingScope(node);
          if (!scope) return;

          const kind = contextChecker.getAddressKind(node) || "other";
          if (!scope.variables.has(node.name)) scope.variables.set(node.name, kind);
          else if (scope.variables.get(node.name) !== kind) scope.variables.set(node.name, "ambiguous");
        }
      });
    }

    /**
     * Collects address-valued expressions that AVR can mutate.
     *
     * @returns {Object[]} Address mutation sites with node and address kind.
     */
    function getAddressValueSites() {
      const sites = [];
      const conversions = [];

      function addSite(node, kind) {
        if (!node?.range || !kind) return;
        if (sites.some(site => contextChecker.sameRange(site.node, node))) return;
        sites.push({ node, kind });
      }

      visit({
        StateVariableDeclaration: (node) => {
          if (node.variables?.length !== 1 || !node.variables[0] || !node.initialValue) return;

          const kind = contextChecker.getAddressKind(node.variables[0]);
          if (kind) addSite(node.initialValue, kind);
        }
      });

      visit({
        VariableDeclarationStatement: (node) => {
          if (node.variables?.length !== 1 || !node.variables[0] || !node.initialValue) return;

          const kind = contextChecker.getAddressKind(node.variables[0]);
          if (kind) addSite(node.initialValue, kind);
        }
      });

      visit({
        BinaryOperation: (node) => {
          if (node.operator !== "=" || node.left?.type !== "Identifier" || !node.right) return;

          const kind = resolveAddressIdentifier(node.left.name, node);
          if (kind) addSite(node.right, kind);
        }
      });

      visit({
        FunctionCall: (node) => {
          const kind = contextChecker.getAddressFunctionCallKind(node);
          if (kind && node.range) conversions.push({ node, kind });
        }
      });

      conversions.sort((a, b) => contextChecker.rangeSize(b.node) - contextChecker.rangeSize(a.node));

      for (const conversion of conversions) {
        const alreadyCovered = sites.some(site => contextChecker.containsRange(site.node, conversion.node));
        if (!alreadyCovered) addSite(conversion.node, conversion.kind);
      }

      return sites;
    }

    /**
     * Replaces one nonzero address-valued expression with the zero address.
     *
     * @param {Object} site - The AVR mutation site.
     * @returns {void}
     */
    function mutateAddressSite(site) {
      if (isSpecializedMemberAccess(site.node)) return;
      if (contextChecker.isZeroAddressExpression(site.node)) return;

      const node = site.node;
      const start = node.range[0];
      const end = node.range[1] + 1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const original = source.slice(start, end);
      const replacement = site.kind === "payable" ? "payable(address(0))" : "address(0)";
      const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

      mutations.push(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, ID));
    }

    /**
     * Resolves an identifier to a known address declaration.
     *
     * Function/modifier declarations take precedence over state variables to
     * conservatively account for shadowing.
     *
     * @param {string} name - The identifier name.
     * @param {Object} node - The AST node where the identifier is used.
     * @returns {string|null} "address", "payable", or null.
     */
    function resolveAddressIdentifier(name, node) {
      const scope = getContainingScope(node);

      if (scope && scope.variables.has(name)) {
        const kind = scope.variables.get(name);
        return kind === "address" || kind === "payable" ? kind : null;
      }

      const contract = getContainingContract(node);
      if (!contract || !contract.stateVariables.has(name)) return null;

      const kind = contract.stateVariables.get(name);
      return kind === "address" || kind === "payable" ? kind : null;
    }

    /**
     * Checks whether a direct MemberAccess target belongs to a more specialized
     * address mutation operator.
     *
     * @param {Object} node - The AST expression.
     * @returns {boolean} True for tx.origin and block.coinbase.
     */
    function isSpecializedMemberAccess(node) {
      if (!node || node.type !== "MemberAccess" || node.expression?.type !== "Identifier") return false;
      return (node.expression.name === "tx" && node.memberName === "origin") || (node.expression.name === "block" && node.memberName === "coinbase");
    }

    /**
     * Gets the contract metadata containing an AST node.
     *
     * @param {Object} node - The AST node.
     * @returns {Object|null} The containing contract metadata.
     */
    function getContainingContract(node) {
      return contextChecker.findSmallestContainingRange(contracts, node);
    }

    /**
     * Gets the function or modifier metadata containing an AST node.
     *
     * @param {Object} node - The AST node.
     * @returns {Object|null} The containing scope metadata.
     */
    function getContainingScope(node) {
      return contextChecker.findSmallestContainingRange(scopes, node);
    }

  }
}

module.exports = AVROperator;
