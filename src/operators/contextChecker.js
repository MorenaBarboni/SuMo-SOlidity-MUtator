
/* Utility module to extract the context of a mutation */

/**
 * Get the name of the function (or modifier) enclosing a mutation.
 * @param {Function} visit the visitor bound to the source file
 * @param {Number} mutantStartLine the mutation start line
 * @param {Number} mutantEndLine the mutation end line
 * @param {Object} mutantEnclosingNode (optional) the mutation's FunctionDefinition or ModifierDefinition node, if already available
 * 
 * @returns {Object} - The name of the mutation's enclosing function or modifier ("stateVariable" if a state var).
 */
function getFunctionName(visit, mutantStartLine, mutantEndLine, mutantEnclosingNode = null) {

    let enclosingNodeName = null;

    //Retrieve mutantEnclosingNode: the type and name of the function/modifier definition enclosing the mutant
    if (mutantEnclosingNode !== null) {
        enclosingNodeName = mutantEnclosingNode;
    }
    else {
        let enclosingNode = getEnclosingNode(visit, mutantStartLine, mutantEndLine);
        enclosingNodeName = (enclosingNode === null) ? null : enclosingNode.name;
    }
    if (enclosingNodeName === null) {
        enclosingNodeName = "stateVariable"
    }

    return enclosingNodeName;
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
    getFunctionName: getFunctionName,
    getFunctionCallParentStatement: getFunctionCallParentStatement
}