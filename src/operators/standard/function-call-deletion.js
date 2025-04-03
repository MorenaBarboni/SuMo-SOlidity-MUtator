const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class FCDOperator {
    constructor() {
        this.ID = "FCD";
        this.name = "function-call-deletion";
    }
    getMutations(file, source, visit) {
        const mutations = [];
        const ignoreFunctionCalls = ["address", "require", "assert", "revert", "blockhash", "keccak", "sha", "encode",
            "decode", "send", "transfer", "call", "delegateCall", "staticCall", "safeTransfer", "push", "pop"];

        visit({
            FunctionCall: (node) => {
                if (node.expression?.type !== "ElementaryTypeName" &&
                    ignoreFunctionCalls.every(e => !node.expression?.memberName?.startsWith(e)) &&
                    ignoreFunctionCalls.every(e => !node.expression?.name?.startsWith(e))) {

                    // check if the function call is stand-alone
                    let parentNode = contextChecker.getFunctionCallParentStatement(visit, node);
                    if (!parentNode) {
                        const start = node.range[0];
                        const end = node.range[1] + 2;
                        const startLine = node.loc.start.line;
                        const endLine = node.loc.end.line;
                        const original = source.slice(start, end);
                        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
                        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "/*" + original + "*/", this.ID));
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
module.exports = FCDOperator;