const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class BLROperator {
    constructor() {
        this.ID = "BLR";
        this.name = "boolean-literal-replacement";
    }
    /**
     * Generates BLR mutations for boolean literal values.
     *
     * @param {string} file - The path of the Solidity source file
     * @param {string} source - The Solidity source code
     * @param {Function} visit - The solidity-parser-ast visitor function
     * 
     * @returns {Mutation[]} The generated mutations
     */
    getMutations(file, source, visit) {
        const mutations = [];

        /**
         * Visit and mutate each boolean literal value
         */
        visit({
            BooleanLiteral: (node) => {
                mutateBooleanValue(node);
            }
        });

        /**
        * Mutates a literal value into true or false
        * @param {Object} node the boolean value node
        */
        function mutateBooleanValue(node) {
            const start = node.range[0];
            const end = node.range[1] + 1;
            const startLine = node.loc.start.line;
            const endLine = node.loc.end.line;
            const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
            const original = source.slice(start, end);
            if (node.value) {
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "false", "BLR"));
            } else {
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "true", "BLR"));
            }
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
}


module.exports = BLROperator;