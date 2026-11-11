/** Source parsing and AST queries for Solidity literals. */

/**
 * Checks for the exact decimal spelling "0".
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if the node is a NumberLiteral equal to zero.
 */
function isZeroLiteral(node) {
    return node?.type === "NumberLiteral" && node.number === "0";
}

/**
 * Checks for decimal or hexadecimal zero after removing digit separators.
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if the node represents zero.
 */
function isZeroNumberLiteral(node) {
    if (!node || node.type !== "NumberLiteral" || typeof node.number !== "string") return false;

    const value = node.number.replace(/_/g, "").toLowerCase();
    return value === "0" || /^0x0+$/.test(value);
}

/** Checks whether a NumberLiteral is a Hexadecimal literal
 * (i.e., starts with a hexadecimal prefix `0x` or `0X`). 
 * 
 * @param {Object} node - The number literal node from the Solidity AST.
 * @param {string} source - The Solidity source code containing the literal.
 * @returns {boolean} `true` if the literal starts with a hexadecimal prefix.
 * 
 * @example
 * For the literal `0x2A`, returns true. For `42`, returns false.
 */
function isHexadecimalLiteral(node, source) {
    const [start, end] = node.range;
    const literalText = source.slice(start, end + 1);
    const hasHexadecimalPrefix = /^0[xX]/.test(literalText);

    return hasHexadecimalPrefix;
}

/**
 * Checks whether a NumberLiteral is a 20-byte hexadecimal address literal.
 *
 * @param {Object} node - The AST node.
 * @returns {boolean} True if the node is a hexadecimal address literal.
 */
function isAddressHexLiteral(node) {
    if (!node || node.type !== "NumberLiteral" || typeof node.number !== "string") return false;

    const value = node.number.replace(/_/g, "");
    return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/**
 * Parses a decimal Solidity literal exactly, including digit separators,
 * fractional coefficients and scientific notation. Returns null for non-integral values
 * and excessively large exponents.
 *
 * @param {string} literal The numeric portion of a decimal literal.
 * @returns {bigint|null} The exact integer value, or null if unsupported.
 */
function parseIntegerLiteral(literal) {
    const value = literal.replace(/_/g, "");
    const match = value.match(/^(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?$/);
    if (!match) {
        return null;
    }

    const parts = match[1].split(".");
    const wholePart = parts[0] || "0";
    const fractionalPart = parts[1] || "";
    const exponent = Number(match[2] || "0");

    // Bound the exponent so malformed input cannot create huge BigInt values.
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) {
        return null;
    }

    const digits = wholePart + fractionalPart;
    const decimalPlaces = fractionalPart.length - exponent;
    let integer = BigInt(digits);

    if (decimalPlaces > 0) {
        // Removing fractional places must preserve the exact value.
        if (decimalPlaces > digits.length) {
            return integer === 0n ? 0n : null;
        }

        const divisor = 10n ** BigInt(decimalPlaces);
        if (integer % divisor !== 0n) {
            return null;
        }

        integer /= divisor;
    } else if (decimalPlaces < 0) {
        integer *= 10n ** BigInt(-decimalPlaces);
    }

    return integer;
}

/**
 * Escapes a denomination before it is inserted into a regular expression.
 *
 * @param {string} value The denomination text.
 * @returns {string} The escaped regular-expression text.
 */
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts the original text of a Solidity number literal, such as `1 ether`.
 * Returns the numeric part and any unit separately, with a source range
 * covering the entire literal.
 *
 * @param {Object} node A NumberLiteral AST node.
 * @param {string} source The Solidity source text.
 * @returns {Object|null} Literal source details, or null.
 * 
 * @example
 * // For `1 ether` starting at index 0:
 * // => { start: 0, end: 7, literal: "1", denomination: " ether" }
 */
function getNumberLiteralSource(node, source) {
    const start = node.range[0];
    let end = node.range[1] + 1;
    let literal = source.slice(start, end);
    let denomination = "";

    if (!node.subdenomination) {
        return { start: start, end: end, literal: literal, denomination: denomination };
    }

    const unit = escapeRegExp(node.subdenomination);
    const unitAtEnd = literal.match(new RegExp("\\s+" + unit + "\\b$"));

    if (unitAtEnd) {
        denomination = unitAtEnd[0];
        literal = literal.slice(0, -denomination.length);
    } else {
        // Include the denomination in the mutation range when the parser omits it.
        const unitAfterRange = source.slice(end).match(new RegExp("^\\s+" + unit + "\\b"));
        if (!unitAfterRange) {
            return null;
        }

        denomination = unitAfterRange[0];
        end += denomination.length;
    }

    return { start: start, end: end, literal: literal, denomination: denomination };
}

/**
 * Parses the source text of a Solidity hex string, and joins its segments into one string.
 * Returns the combined digits without separators and the opening quote.
 *
 * @param {string} original - The source text of the hex string literal.
 * @returns {{digits: string, quote: string}|null} The combined digits and the
 *   first segment's quote character, or `null` if the text cannot be parsed.
 *
 * @example
 * parseHexStringLiteral(`hex"ab_cd" /* join *\/ hex'EF'`);
 * // => { digits: "abcdEF", quote: '"' }
 */
function parseHexStringLiteral(original) {
    const segments = [...original.matchAll(/hex(["'])([0-9a-fA-F_]*)\1/g)];
    if (segments.length === 0) {
        return null;
    }

    let digits = "";
    let previousEnd = 0;

    for (const segment of segments) {
        // Between segments, only whitespace or Solidity comments are permitted.
        const separator = original.slice(previousEnd, segment.index);
        const separatorWithoutComments = separator
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/[^\r\n]*/g, "");

        if (separatorWithoutComments.trim() !== "") {
            return null;
        }

        digits += segment[2].replace(/_/g, "");
        previousEnd = segment.index + segment[0].length;
    }

    // The entire AST range must consist only of the hexadecimal segments.
    if (original.slice(previousEnd).trim() !== "") {
        return null;
    }

    return { digits, quote: segments[0][1] };
}

module.exports = {
    isZeroLiteral,
    isZeroNumberLiteral,
    isHexadecimalLiteral,
    isAddressHexLiteral,
    parseIntegerLiteral,
    getNumberLiteralSource,
    parseHexStringLiteral
};
