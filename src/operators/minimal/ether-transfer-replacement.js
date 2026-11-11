const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation');

class ETROperator {
    constructor() {
        this.ID = "ETR";
        this.name = "ether-transfer-function-replacement";
    }
    /**
    * Generates ETR mutations for Solidity-native ether transfer functions.
    *
    * @param {string} file - The path of the Solidity source file
    * @param {string} source - The Solidity source code
    * @param {Function} visit - The solidity-parser-ast visitor function
    * 
    * @returns {Mutation[]} The generated mutations
    */
    getMutations(file, source, visit) {
        const mutations = [];
        const functions = ["transfer", "transferFrom", "send", "call"];

        visit({
            FunctionCall: (node) => {
                if (node.expression.type === "MemberAccess" ||
                    (node.expression.expression && node.expression.expression.type === "MemberAccess")) {
                    if (functions.includes(node.expression.memberName) ||
                        (node.expression.expression && functions.includes(node.expression.expression.memberName))) {

                        // Calls with gas or value options, e.g. call{value: ..., gas: ...}("")
                        if (node.expression.expression &&
                            functions.includes(node.expression.expression.memberName)) {
                            let replacement;
                            const start = node.range[0];
                            const end = node.range[1] + 1;
                            const startLine = node.loc.start.line;
                            const endLine = node.loc.end.line;
                            const original = source.slice(start, end);
                            const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                            const addressStart = node.expression.expression.expression.range[0];
                            const addressEnd = node.expression.expression.expression.range[1];
                            const address = source.slice(addressStart, addressEnd + 1);
                            const callArguments = node.arguments.map(argument =>
                                source.slice(argument.range[0], argument.range[1] + 1)
                            ).join(", ");

                            // Exclude old call() syntax.
                            if (node.expression.arguments &&
                                node.expression.expression.memberName === "call") {
                                const nameValueList = node.expression.arguments.names;
                                let gas;
                                const gasIndex = nameValueList.indexOf("gas");
                                if (gasIndex !== -1) {
                                    const gasArg = node.expression.arguments.arguments[gasIndex];
                                    gas = source.slice(gasArg.range[0], gasArg.range[1] + 1);
                                }

                                replacement = address + ".staticcall";
                                if (gas) {
                                    replacement += "{gas:" + gas + "}";
                                }
                                replacement += "(" + callArguments + ")";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                            }
                        }
                        // Calls without gas or value options.
                        else {
                            // Native Ether send/transfer take exactly one amount argument.
                            // Skip custom calls such as ERC-20 transfer(recipient, amount).
                            if ((node.expression.memberName === "send" || node.expression.memberName === "transfer") &&
                                node.arguments.length !== 1) {
                                return;
                            }

                            let start = node.expression.range[0];
                            let end = node.expression.range[1] + 1;
                            let startLine = node.expression.loc.start.line;
                            let endLine = node.expression.loc.end.line;
                            let original = source.slice(start, end);
                            let replacement, replacement2;
                            let functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                            const addressStart = node.expression.expression.range[0];
                            const addressEnd = node.expression.expression.range[1];
                            const address = source.slice(addressStart, addressEnd + 1);

                            const firstArg = node.arguments[0];
                            const arg = firstArg ? source.slice(firstArg.range[0], firstArg.range[1] + 1) : undefined;
                            const subdenomination = firstArg && firstArg.subdenomination;

                            if (node.expression.memberName === "call") {
                                replacement = address + ".staticcall";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                            }
                            else if (node.expression.memberName === "send") {
                                replacement = address + ".transfer";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));

                                start = node.range[0];
                                end = node.range[1] + 1;
                                original = source.slice(start, end);
                                startLine = node.loc.start.line;
                                endLine = node.loc.end.line;
                                functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                                replacement2 = address + ".call{value: " + arg;
                                if (subdenomination && !source.slice(firstArg.range[0], firstArg.range[1] + 1).includes(subdenomination)) {
                                    replacement2 += " " + subdenomination;
                                }
                                replacement2 += "}(\"\")";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
                            }
                            else if (node.expression.memberName === "transfer") {
                                replacement = address + ".send";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));

                                start = node.range[0];
                                end = node.range[1] + 1;
                                original = source.slice(start, end);
                                startLine = node.loc.start.line;
                                endLine = node.loc.end.line;
                                functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                                replacement2 = address + ".call{value: " + arg;
                                if (subdenomination && !source.slice(firstArg.range[0], firstArg.range[1] + 1).includes(subdenomination)) {
                                    replacement2 += " " + subdenomination;
                                }
                                replacement2 += "}(\"\")";
                                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
                            }
                        }
                    }
                }
            }
        });

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
}

module.exports = ETROperator;
