
/** UTILITIES FOR SUPPRESSION RULES HEURISTICS */

/**
  * Checks if a node represents a function call to `address(...)`.
  * @param {Object} node - The AST node.
  * @returns {boolean} True if node is a call to `address(...)`.
  */
function isAddressFunctionCall(node) {
    return node?.type === "FunctionCall" && node.expression?.name === "address";
}

/**
 * Checks if a node represents a numeric literal with value 0.
 * This helps suppress `== 0` or `!= 0` for address comparisons.
 * @param {Object} node - The AST node.
 * @returns {boolean} True if node is a NumberLiteral and equals '0'.
 */
function isZeroLiteral(node) {
    return node?.type === "NumberLiteral" && node.number === '0';
}

/**
 * Heuristically checks if a node looks like an address-related expression.
 * - Covers common MemberAccess patterns like `msg.sender`, `tx.origin`
 * - Simple identifiers (e.g., `admin`, `owner`) are assumed address variables
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if node looks like it evaluates to an address.
 */
function isAddressLike(node) {
    return (
        (node.type === "MemberAccess" &&
            (node.expression?.name === "msg" || node.expression?.name === "tx") &&
            (node.memberName === "sender" || node.memberName === "origin")) ||
        (node.type === "Identifier" &&
            /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(node.name))
    );
}

/**
 * Heuristically determines whether both operands in a binary comparison
 * appear to be related to addresses, and therefore, relational mutation
 * should be suppressed.
 *
 * This combines the following:
 *  - msg.sender / tx.origin style MemberAccess
 *  - Identifiers likely representing addresses (e.g., 'admin', 'owner')
 *  - Function calls to address(...)
 *  - Literals like 0 (used in address != 0 checks)
 *
 * @param {Object} left - Left operand AST node.
 * @param {Object} right - Right operand AST node.
 * @returns {boolean} True if mutation should be suppressed for address context.
 */
function isAddressComparison(left, right) {
    return (
        (isAddressLike(left) && isAddressLike(right)) ||
        isAddressFunctionCall(left) || isAddressFunctionCall(right) ||
        isZeroLiteral(left) || isZeroLiteral(right)
    );
}

/** MUTATION CONTEXT */

/**
 * Get the name of the function (or modifier) enclosing a mutation.
 * Handles special cases like constructors, fallback, and receive functions.
 * 
 * @param {Function} visit - The visitor bound to the source file.
 * @param {Number} mutantStartLine - The mutation start line.
 * @param {Number} mutantEndLine - The mutation end line.
 * @param {Object} mutantEnclosingNode - Optional FunctionDefinition or ModifierDefinition node.
 * 
 * @returns {String} - The name of the enclosing function or modifier.
 *                     Returns "<functionName>" "constructor", "fallback", "receive", "modifier:<name>", or "stateVariable".
 */
function getFunctionName(visit, mutantStartLine, mutantEndLine, mutantEnclosingNode = null) {
    let enclosingNode = mutantEnclosingNode || getEnclosingNode(visit, mutantStartLine, mutantEndLine);

    if (!enclosingNode) {
        return "stateVariable"; // Default fallback
    }

    // Handle different function types
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
 * Gets the function or modifier node including a certain mutantStartLine and mutantEndLine
 * @param {Function} visit the visitor bound to the source file
 * @param {Number} mutantStartLine the mutation start line
 * @param {Number} mutantEndLine the mutation end line
 * 
 * @returns {Object} - the function node including the specified start and end line (or null)
 */
function getEnclosingNode(visit, mutantStartLine, mutantEndLine) {
    let functionNode = null;
    visit({
        FunctionDefinition: (node) => {
            if (mutantStartLine >= node.loc.start.line && mutantEndLine <= node.loc.end.line) {
                functionNode = node;
                return;
            }
        }
    });
    if (functionNode === null) {
        visit({
            ModifierDefinition: (node) => {
                if (mutantStartLine >= node.loc.start.line && mutantEndLine <= node.loc.end.line) {
                    functionNode = node;
                    return;
                }
            }
        });
    }
    return functionNode;
}

/**
* Given a contract source, it checks to which specific contract within the source a node belongs to
* @param {Function} visit the visitor bound to the source file
* @param {Object} node the input node
* @returns the contract name (or false if no contract is found)
*/
function contractContaining(visit, node) {
    const nodeStart = node.range[0];
    const nodeEnd = node.range[1];
    let cName = false;
    visit({
        ContractDefinition: (cNode) => {
            if (nodeStart >= cNode.range[0] && nodeEnd <= cNode.range[1]) {
                cName = cNode.name;
            }
        }
    });
    return cName;
}

/**
 * Checks if a FunctionCall node is enclosed by a node among several preset types.
 *
 * @param {Function} visit the visitor
 * @param {Object} functionCallNode the functionCall node to check
 * @returns the parentNode or null
 */
function getFunctionCallParentStatement(visit, functionCallNode) {
    const nodeStart = functionCallNode.range[0];
    const nodeEnd = functionCallNode.range[1] + 1;
    let parentNode = null;


    const nodeTypes = ["ExpressionStatement", "VariableDeclarationStatement",
        "EmitStatement", "ReturnStatement", "RevertStatement", "IfStatement",
        "ForStatement", "WhileStatement", "FunctionCall", "FunctionDefinition"];

    for (const nodeType of nodeTypes) {
        visit({
            [nodeType]: (node) => {
                if (nodeType === "FunctionDefinition" && (node.isConstructor || node.name === "initialize") && node?.range && nodeStart >= node.range[0] && nodeEnd <= node.range[1] + 1) {
                    parentNode = node;
                    return;
                }
                else if (nodeType === "ExpressionStatement" && node.expression?.type !== "FunctionCall" && node?.range && nodeStart >= node.range[0] && nodeEnd <= node.range[1] + 1) {
                    parentNode = node;
                    return;
                }
                else if ((nodeType === "VariableDeclarationStatement" || nodeType === "ReturnStatement" || nodeType === "EmitStatement" || nodeType === "RevertStatement")
                    && node?.range && nodeStart >= node.range[0] && nodeEnd <= node.range[1] + 1) {
                    parentNode = node;
                    return;
                } else if ((nodeType === "IfStatement" || nodeType === "WhileStatement") && node?.condition?.range && nodeStart >= node.condition.range[0] && nodeEnd <= node.condition.range[1] + 1) {
                    parentNode = node;
                    return;
                }
                else if (nodeType === "ForStatement" && nodeStart >= node.conditionExpression?.range[0] && nodeEnd <= node.conditionExpression?.range[1] + 1) {
                    parentNode = node;
                    return;
                }
                else if (nodeType === "FunctionCall" && (node?.range[0] !== nodeStart && node?.range[1] !== nodeEnd) && node?.range && nodeStart >= node.range[0] && nodeEnd <= node.range[1] + 1) {
                    parentNode = node;
                    return;
                }
            },
        });
        if (parentNode) break;
    }
    return parentNode;
}


module.exports = {
    contractContaining: contractContaining,
    isAddressFunctionCall: isAddressFunctionCall,
    isZeroLiteral: isZeroLiteral,
    isAddressComparison: isAddressComparison,
    isAddressLike: isAddressLike,
    getFunctionName: getFunctionName,
    getFunctionCallParentStatement: getFunctionCallParentStatement
}