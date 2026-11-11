/** Queries for Solidity type declarations and expressions. */

const literals = require("./literals");

/* ==========================================================================
 * ADDRESS TYPE
 * ========================================================================== */

/**
 * Gets the kind of address declared for a variable.
 *
 * @param {Object} variable - The VariableDeclaration AST node.
 * @returns {string|null} "address", "payable", or null.
 */
function getAddressKind(variable) {
    return getAddressTypeKind(variable?.typeName);
}

/**
 * Checks whether a type is a plain or payable address.
 *
 * @param {Object} typeName - The node that describes the type.
 * @returns {string|null} "address", "payable", or null.
 */
function getAddressTypeKind(typeName) {
    if (typeName?.type !== "ElementaryTypeName" || typeName.name !== "address") {
        return null
    };
    return typeName.stateMutability === "payable" ? "payable" : "address";
}

/**
 * Identifies the kind of address conversion in a call.
 *
 * @param {Object} node - The FunctionCall AST node.
 * @returns {string|null} "address", "payable", or null.
 */
function getAddressFunctionCallKind(node) {
    if (!node || node.type !== "FunctionCall" || !node.expression) return null;

    const expression = node.expression;
    if (expression.type === "Identifier") {
        if (expression.name === "address" || expression.name === "payable") return expression.name;
        return null;
    }

    // Older AST shapes wrap the elementary type name in an expression.
    if (expression.type === "TypeNameExpression" || expression.type === "ElementaryTypeNameExpression") {
        const typeName = expression.typeName;
        if (typeName === "address") return "address";
        return getAddressTypeKind(typeName);
    }

    return getAddressTypeKind(expression);
}

/**
 * Checks whether a node represents an address(...) or payable(...) conversion.
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if if either address-related conversion is recognized.
 */
function isAddressFunctionCall(node) {
    return getAddressFunctionCallKind(node) !== null;
}

/**
 * Checks whether an expression represents the zero address.
 *
 * @param {Object} node - The AST expression.
 * @returns {boolean} True if the expression represents the zero address.
 */
function isZeroAddressExpression(node) {
    if (!node) { return false; }

    if (literals.isZeroNumberLiteral(node)) {
        return true;
    }

    const kind = getAddressFunctionCallKind(node);
    if (!kind || node.arguments?.length !== 1) {
        return false;
    }

    return isZeroAddressExpression(node.arguments[0]);
}

/**
 * Gets the hexadecimal address literal contained in an address expression.
 *
 * @param {Object} node - The address-valued expression.
 * @returns {Object|null} The NumberLiteral AST node, or null.
 */
function getAddressLiteralNode(node) {
    if (!node) { return null; }

    if (literals.isAddressHexLiteral(node)) {
        return node;
    }
    if (getAddressFunctionCallKind(node) && node.arguments?.length === 1) {
        return getAddressLiteralNode(node.arguments[0]);
    }

    return null;
}
/**
 * Heuristically checks whether a node looks like an address-related expression.
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if the node looks like it evaluates to an address.
 */
function isAddressLike(node) {
    if (!node) { return false; }

    if (node.type === "MemberAccess") {
        const objectName = node.expression?.name;
        const isMsgOrTx = objectName === "msg" || objectName === "tx";
        const isSenderOrOrigin = node.memberName === "sender" || node.memberName === "origin";

        return isMsgOrTx && isSenderOrOrigin;
    }

    if (node.type === "Identifier") {
        const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        return identifierPattern.test(node.name);
    }

    return false;
}

/**
 * Heuristically determines whether a binary comparison appears to involve addresses.
 *
 * @param {Object} left - The left operand AST node.
 * @param {Object} right - The right operand AST node.
 * @returns {boolean} True if the comparison appears to involve addresses.
 */
function isAddressComparison(left, right) {
    const bothLookLikeAddresses = isAddressLike(left) && isAddressLike(right);

    if (bothLookLikeAddresses) {
        return true;
    }

    const hasAddressConversion = isAddressFunctionCall(left) || isAddressFunctionCall(right);
    if (hasAddressConversion) {
        return true;
    }

    const hasZeroLiteral = literals.isZeroLiteral(left) || literals.isZeroLiteral(right);
    return hasZeroLiteral;
}

/* ==========================================================================
 * OTHER TYPES
 * ========================================================================== */


/**
 * Builds a stable signature for a parameter type, ignoring source locations.
 * @param {Object} parameterNode - the parameter declaration
 * @returns {string|null} The JSON signature of the parameter type
 * 
 * @example
 * // For `uint256 amount`, a signature could look like:
 * // {"typeName":{"type":"ElementaryTypeName","name":"uint256"},"storageLocation":null}
 */
function getParameterTypeSignature(parameterNode) {
    if (!parameterNode.typeName) {
        return null;
    }

    const normalizedType = normalizeAstNode(parameterNode.typeName);
    return JSON.stringify({
        typeName: normalizedType,
        storageLocation: parameterNode.storageLocation || null
    });
}

/**
 * Makes AST nodes easier to compare by removing source locations, sorting
 * object keys, and replacing Solidity type aliases with their full names.
 *
 * @param {Object|Array} node - The AST node or list of nodes.
 * @returns {Object|Array|null} The normalized AST subtree.
 *
 * @example
 * normalizeAstNode({ type: "ElementaryTypeName", name: "uint", range: [0, 3] });
 * // => { name: "uint256", type: "ElementaryTypeName" }
 */
function normalizeAstNode(node) {
    if (Array.isArray(node)) {
        return node.map((childNode) => normalizeAstNode(childNode));
    }

    if (!node || typeof node !== "object") {
        return node;
    }

    const normalizedNode = {};
    Object.keys(node).sort().forEach((key) => {
        if (key === "range" || key === "loc") {
            return;
        }

        let value = node[key];
        if (node.type === "ElementaryTypeName" && key === "name") {
            value = normalizeElementaryTypeName(value);
        }

        normalizedNode[key] = normalizeAstNode(value);
    });

    return normalizedNode;
}

/**
 * Replaces a Solidity elementary type alias with its full name.
 *
 * @param {string} typeName - The Solidity type name.
 * @returns {string} The full name for a recognized alias, or the original type name.
 *
 * @example
 * normalizeElementaryTypeName("uint");    // => "uint256"
 * normalizeElementaryTypeName("address"); // => "address"
 */
function normalizeElementaryTypeName(typeName) {
    const aliases = {
        uint: "uint256", int: "int256",
        byte: "bytes1",
        fixed: "fixed128x18", ufixed: "ufixed128x18"
    };
    return aliases[typeName] || typeName;
}

module.exports = {
    getAddressKind,
    getAddressFunctionCallKind,
    isAddressFunctionCall,
    isZeroAddressExpression,
    getAddressLiteralNode,
    isAddressLike,
    isAddressComparison,
    getParameterTypeSignature
};
