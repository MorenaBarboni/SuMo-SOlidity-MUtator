/**
 * Shared AST queries and Solidity source parsing for mutation operators.
 */

const literals = require("./context/literals");
const types = require("./context/types");

/* ==========================================================================
 * GENERIC AST HELPERS
 * ========================================================================== */

/**
 * Finds the smallest collected source range containing a node or offset.
 *
 * @param {Object[]} ranges - Objects containing start and end source offsets.
 * @param {Object|number} nodeOrOffset - An AST node or a source offset to locate.
 * @returns {Object|null} The smallest containing range object, or null.
 */
function findSmallestContainingRange(ranges, nodeOrOffset) {
    const rangeToFind = typeof nodeOrOffset === "number" ? [nodeOrOffset, nodeOrOffset] : nodeOrOffset?.range;
    if (!rangeToFind) return null;

    const [start, end] = rangeToFind;

    let result = null;
    let smallestSize = Infinity;

    for (const range of ranges) {
        if (range.start <= start && range.end >= end) {
            const size = range.end - range.start;
            if (size < smallestSize) {
                result = range;
                smallestSize = size;
            }
        }
    }

    return result;
}

/**
 * Checks whether the inclusive source range of one AST node contains another.
 *
 * @param {Object} outer - The potential containing AST node.
 * @param {Object} inner - The potential contained AST node.
 * @returns {boolean} True if outer contains inner.
 */
function containsRange(outer, inner) {
    return Boolean(outer?.range && inner?.range && outer.range[0] <= inner.range[0] && outer.range[1] >= inner.range[1]);
}

/** Checks whether two AST nodes have the same inclusive source range. 
 * @param {Object} first - The first AST node.
 * @param {Object} second - The second AST node.
 * @returns {boolean} True if first and second have the same source range. 
*/
function sameRange(first, second) {
    return Boolean(first?.range && second?.range && first.range[0] === second.range[0] && first.range[1] === second.range[1]);
}

/** Returns the distance between the endpoints of an AST node's source range. 
 * @param {Object} node - The  AST node.
 * @returns {number} The distance between the endpoints.
 */
function rangeSize(node) {
    return node.range[1] - node.range[0];
}

/** Checks whether an AST node has both source offsets and line locations. 
 * @param {Object} node - The  AST node.
 * @returns {Boolean} True if the node has source location information.
*/
function hasSourceLocation(node) {
    return Boolean(node?.range && node.loc?.start && node.loc?.end);
}

/**
 * Yields AST nodes in depth-first order traversal.
 *
 * @param {Object} node - Root object or array to traverse.
 * @param {function(Object, string): boolean} [skipChild] - Receives the
 *   containing object and property name. Return true to skip that property's
 *   entire subtree.
 * @yields {Object} Each visited object with a truthy `type` property.
 */
function* walkAst(node, skipChild) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const child of node) yield* walkAst(child, skipChild);
        return;
    }

    if (node.type) yield node;

    for (const key of Object.keys(node)) {
        if (key === "type" || key === "range" || key === "loc" || key === "comments" || skipChild?.(node, key)) continue;
        yield* walkAst(node[key], skipChild);
    }
}

/** Checks whether any node in an AST subtree satisfies a predicate.
 * 
 * @param {Object} node - The root AST node to search.
 * @param {function(Object): boolean} predicate - Called with each visited node.
 * @param {function(Object, string): boolean} [skipChild] - Receives the containing
 * object and property name. Return true to skip that property's  entire subtree.
 * @returns {boolean} Whether a visited node matched the predicate.
 */
function astContains(node, predicate, skipChild) {
    for (const child of walkAst(node, skipChild)) {
        if (predicate(child)) return true;
    }
    return false;
}

/** Returns the distinct identifier names in an AST subtree or list of nodes.
 * @param {Object} node - Root object or array to search.
 * @returns {Set<string>} The distinct identifier names.
 */
function getIdentifierNames(node) {
    const names = new Set();
    for (const child of walkAst(node)) {
        if (child.type === "Identifier" && child.name) names.add(child.name);
    }
    return names;
}

/* ==========================================================================
 * EXPRESSIONS AND STATEMENTS
 * ========================================================================== */

/**
 * Finds a containing statement or construct for a FunctionCall node.
 * Candidate types are checked in priority order.
 *
 * @param {Function} visit - The visitor bound to the source file.
 * @param {Object} functionCallNode - The FunctionCall AST node.
 * @returns {Object|null} The parent AST node, or null if none is found.
 */
function getFunctionCallParentStatement(visit, functionCallNode) {
    let parentNode = null;

    const nodeTypes = ["ExpressionStatement", "VariableDeclarationStatement", "EmitStatement", "ReturnStatement", "RevertStatement", "IfStatement", "ForStatement", "WhileStatement", "FunctionCall", "FunctionDefinition"];

    for (const nodeType of nodeTypes) {
        visit({
            [nodeType]: (node) => {
                if (nodeType === "FunctionDefinition" && (node.isConstructor || node.name === "initialize") && containsRange(node, functionCallNode)) {
                    parentNode = node;
                    return;
                }

                if (nodeType === "ExpressionStatement" && node.expression?.type !== "FunctionCall" && containsRange(node, functionCallNode)) {
                    parentNode = node;
                    return;
                }

                if ((nodeType === "VariableDeclarationStatement" || nodeType === "ReturnStatement" || nodeType === "EmitStatement" || nodeType === "RevertStatement") && containsRange(node, functionCallNode)) {
                    parentNode = node;
                    return;
                }

                if ((nodeType === "IfStatement" || nodeType === "WhileStatement") && containsRange(node.condition, functionCallNode)) {
                    parentNode = node;
                    return;
                }

                if (nodeType === "ForStatement" && containsRange(node.conditionExpression, functionCallNode)) {
                    parentNode = node;
                    return;
                }

                if (nodeType === "FunctionCall" && !sameRange(node, functionCallNode) && containsRange(node, functionCallNode)) {
                    parentNode = node;
                }
            }
        });

        if (parentNode) break;
    }

    return parentNode;
}

/**
 * Gets the identifier name of a direct function call.
 * @param {Object} node - The function call node.
 * @returns {string|null} The function name, or null if there is no direct name.
 * 
 * @example
 * For the call `transfer(amount)`, returns "transfer".
 * For the call `token.transfer(amount)`, returns null.
 */
function getCalledFunctionName(node) {
    if (node.expression?.type === "Identifier") {
        return node.expression.name || null;
    } else { return null; }
}

/**
 * Gets the original source text of each argument in a Solidity function call.
 * 
 * @param {Object} node - The function call node.
 * @param {string} source - The source code containing the call.
 * @returns {string[]} The argument texts with surrounding whitespace removed.
 * 
 * @example
 * For `transfer( recipient, amount + fee )`, returns: ["recipient", "amount + fee"]
 */
function getArgumentTexts(node, source) {
    return node.arguments.map(argument =>
        source.slice(argument.range[0], argument.range[1] + 1).trim()
    );
}

/**
 * Finds the exact source range occupied by a prefix or postfix operator (e.g., `++` or `--`).
 *
 * @param {Object} node A UnaryOperation AST node.
 * @returns {{start: number, end: number}} The operator token's source range.
 */
function getUnaryOperatorRange(node) {
    const operatorLength = node.operator.length;
    let start = node.range[0];

    // In postfix expressions, the operator is the final token in node.range.
    if (!node.isPrefix) {
        start = node.range[1] + 1 - operatorLength;
    }

    return { start: start, end: start + operatorLength };
}

/**
 * Gets the `for` loop's update expression, such as `i++`.
 *
 * @param {Object} [progression] - The update expression or a statement that contains it.
 * @returns {Object|null} The update expression node.
 */
function getProgressionExpression(progression) {
    if (progression && progression.type === "ExpressionStatement") {
        return progression.expression;
    }

    return progression || null;
}

/**
 * Finds the zero literal node (if any) in a canonical ascending for-loop initializer.
 *
 * @param {Object} node A ForStatement AST node.
 * @param {string} source The Solidity source text containing the for-loop.
 * @returns {Object|null} The initializer's NumberLiteral, or null.
 * 
 * @example
 * // For `for (uint i = 0; i < limit; i++) {}`, returns the node for `0`.
 * // For `for (uint i = 1; i < limit; i++) {}`, returns null.
 */
function getZeroBasedLoopInitializer(node, source) {
    const initialization = node.initExpression;

    // The loop must declare exactly one counter.
    if (!initialization || initialization.type !== "VariableDeclarationStatement" ||
        !Array.isArray(initialization.variables) || initialization.variables.length !== 1) {
        return null;
    }

    const variable = initialization.variables[0];
    const literal = initialization.initialValue;
    if (!variable || !variable.name || !literal || literal.type !== "NumberLiteral" || !literal.range) {
        return null;
    }

    // Match a plain decimal zero without a unit.
    if (literal.subdenomination) {
        return null;
    }

    const original = source.slice(literal.range[0], literal.range[1] + 1);
    if (!/^0(?:_?0)*$/.test(original)) {
        return null;
    }

    if (!hasAscendingLoopCondition(node.conditionExpression, variable.name)) {
        return null;
    }

    if (!incrementsLoopCounter(node.loopExpression, variable.name)) {
        return null;
    }

    return literal;
}

/**
 * Checks whether the loop condition has the form `i < limit` or `i <= limit`.
 *
 * @param {Object} condition - The for-loop condition AST node.
 * @param {string} counterName - The declared loop counter's name, such as `i`.
 * @returns {boolean} `true` if the named counter is on the left of `<` or `<=`.
 */
function hasAscendingLoopCondition(condition, counterName) {
    if (!condition || condition.type !== "BinaryOperation") {
        return false;
    }

    if (condition.operator !== "<" && condition.operator !== "<=") {
        return false;
    }

    const leftOperand = condition.left;
    return Boolean(leftOperand && leftOperand.type === "Identifier" && leftOperand.name === counterName);
}

/**
 * Checks whether the for-loop update uses `++` on the named counter.
 *
 * @param {Object} progression - The for-loop update AST node.
 * @param {string} counterName - The declared loop counter's name, such as `i`.
 * @returns {boolean} True when the update is ++counter or counter++.
 */
function incrementsLoopCounter(progression, counterName) {
    const expression = getProgressionExpression(progression);

    if (!expression || expression.type !== "UnaryOperation" || expression.operator !== "++") {
        return false;
    }

    const operand = expression.subExpression;
    return Boolean(operand && operand.type === "Identifier" && operand.name === counterName);
}

/* ==========================================================================
 * MUTATION LOCATION AND ENCLOSING CONTEXT
 * ========================================================================== */

/**
 * Gets the function or modifier node enclosing a mutation.
 *
 * @param {Function} visit - The visitor bound to the source file.
 * @param {number} mutantStartLine - The mutation start line.
 * @param {number} mutantEndLine - The mutation end line.
 * @returns {Object|null} The enclosing FunctionDefinition or ModifierDefinition.
 */
function getEnclosingNode(visit, mutantStartLine, mutantEndLine) {
    let enclosingNode = null;

    visit({
        FunctionDefinition: (node) => {
            if (mutantStartLine >= node.loc.start.line && mutantEndLine <= node.loc.end.line) enclosingNode = node;
        }
    });

    if (enclosingNode) return enclosingNode;

    visit({
        ModifierDefinition: (node) => {
            if (mutantStartLine >= node.loc.start.line && mutantEndLine <= node.loc.end.line) enclosingNode = node;
        }
    });

    return enclosingNode;
}

/**
 * Gets the name of the function or modifier enclosing a mutation.
 *
 * @param {Function} visit - The visitor bound to the source file.
 * @param {number} mutantStartLine - The mutation start line.
 * @param {number} mutantEndLine - The mutation end line.
 * @param {Object|null} mutantEnclosingNode - Optional pre-resolved enclosing node.
 * @returns {string} The name of the enclosing mutation context.
 */
function getFunctionName(visit, mutantStartLine, mutantEndLine, mutantEnclosingNode = null) {
    const enclosingNode = mutantEnclosingNode || getEnclosingNode(visit, mutantStartLine, mutantEndLine);
    if (!enclosingNode) return "stateVariable";

    switch (enclosingNode.type) {
        case "FunctionDefinition":
            if (enclosingNode.isConstructor) return "constructor";
            if (enclosingNode.isFallback) return "fallback";
            if (enclosingNode.isReceiveEther) return "receive";
            return enclosingNode.name || "anonymousFunction";
        case "ModifierDefinition":
            return `modifier:${enclosingNode.name}`;
        default:
            return "stateVariable";
    }
}

/**
 * Gets the name of the contract containing an AST node.
 *
 * @param {Function} visit - The visitor bound to the source file.
 * @param {Object} node - The AST node.
 * @returns {string|boolean} The contract name, or false if no contract is found.
 */
function contractContaining(visit, node) {
    const contract = contractNodeContaining(visit, node);
    return contract ? contract.name : false;
}

/**
 * Gets the AST node of the contract containing an AST node.
 *
 * @param {Function} visit - The visitor bound to the source file.
 * @param {Object} node - The AST node.
 * @returns {Object|boolean} The containing ContractDefinition node, or false if no contract is found.
 */
function contractNodeContaining(visit, node) {
    let containingContract = false;

    visit({
        ContractDefinition: (contractNode) => {
            if (containsRange(contractNode, node)) {
                containingContract = contractNode;
            }
        }
    });

    return containingContract;
}


module.exports = {
    // AST traversal and source ranges
    astContains,
    getIdentifierNames,
    containsRange,
    sameRange,
    rangeSize,
    hasSourceLocation,
    findSmallestContainingRange,

    // Expressions and statements
    getCalledFunctionName,
    getArgumentTexts,
    getFunctionCallParentStatement,
    getUnaryOperatorRange,
    getProgressionExpression,
    getZeroBasedLoopInitializer,

    // Enclosing context
    getEnclosingNode,
    getFunctionName,
    contractContaining,
    contractNodeContaining,

    // Literal parsing
    isZeroLiteral: literals.isZeroLiteral,
    isHexadecimalLiteral: literals.isHexadecimalLiteral,
    isAddressHexLiteral: literals.isAddressHexLiteral,
    parseIntegerLiteral: literals.parseIntegerLiteral,
    getNumberLiteralSource: literals.getNumberLiteralSource,
    parseHexStringLiteral: literals.parseHexStringLiteral,

    // Solidity type queries
    ...types
};
