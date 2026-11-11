const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class FCDOperator {
    constructor() {
        this.ID = "FCD";
        this.name = "function-call-deletion";
    }
    /**
     * Generates FCD mutations for standalone function calls
     * 
     * @param {string} file - The path of the Solidity source file
     * @param {string} source - The Solidity source code
     * @param {Function} visit - The solidity-parser-ast visitor function
     * 
     * @returns {Mutation[]} The generated mutations
     */
    getMutations(file, source, visit) {
        const mutations = [];
        const protectedFunctions = [];
        const ignoreFunctionCalls = ["require", "assert", "revert", "blockhash", "keccak256", "sha256", "ripemd160"];

        // Exclude constructors and initialize functions
        visit({
            FunctionDefinition: (node) => {
                if (!node.range) {
                    return;
                }
                if (node.isConstructor || node.name === "initialize") {
                    protectedFunctions.push(node);
                }
            }
        });

        visit({
            ExpressionStatement: (node, parent) => {
                const call = node.expression;

                // Only mutate standalone function calls
                if (!call || call.type !== "FunctionCall") {
                    return;
                }
                // Exclude calls in for-loop initialization and iteration expressions
                if (parent && parent.type === "ForStatement") {
                    if (parent.initExpression === node || parent.loopExpression === node) {
                        return;
                    }
                }
                // Exclude calls inside constructors and initialize functions
                for (const protectedFunction of protectedFunctions) {
                    if (contextChecker.containsRange(protectedFunction, node)) {
                        return;
                    }
                }

                if (!call.expression) {
                    return;
                }
                // Exclude explicit type conversions
                if (call.expression.type === "ElementaryTypeName" || call.expression.type === "TypeNameExpression") {
                    return;
                }
                // Exclude selected Solidity built-in functions
                if (ignoreFunctionCalls.includes(contextChecker.getCalledFunctionName(call))) {
                    return;
                }
                // Exclude ABI encoding and decoding operations
                if (call.expression.type === "MemberAccess") {
                    const receiver = call.expression.expression;
                    const memberName = call.expression.memberName;
                    if (receiver && receiver.type === "Identifier" && receiver.name === "abi") {
                        if (memberName === "decode" || memberName.startsWith("encode")) {
                            return;
                        }
                    }
                }

                const start = node.range[0];
                const end = node.range[1] + 1;
                const startLine = node.loc.start.line;
                const endLine = node.loc.end.line;
                const original = source.slice(start, end);
                const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                // Only comment out complete statements that include their semicolon
                if (!original.trimEnd().endsWith(";")) {
                    return;
                }
                // Avoid accidentally terminating a generated block comment.
                if (original.includes("*/")) {
                    return;
                }

                let replacement = "/*" + original + "*/";

                // Unbraced control-flow bodies still require an executable statement.
                if (parent && ["IfStatement", "WhileStatement", "DoWhileStatement", "ForStatement"].includes(parent.type)) {
                    replacement += ";";
                }

                const mutation = new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID);
                pushMutation(mutation);
            }
        });

        /**
         * Push a mutation to the generated mutations list
         * @param {Object} mutation the mutation to add
        */
        function pushMutation(mutation) {
            mutations.push(mutation);
        }

        return mutations;
    }
}

module.exports = FCDOperator;
