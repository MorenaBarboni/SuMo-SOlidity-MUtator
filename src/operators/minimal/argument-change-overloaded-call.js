const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ACMOperator {
    constructor() {
        this.ID = "ACM";
        this.name = "argument-change-of-overloaded-method-call";
    }

    /**
     * Generates ACM for calls to overloaded functions.
     *
     * ACM first identifies function names that are overloaded within each contract
     * and then collects direct calls to those functions. Existing calls to the same
     * overloaded function in the same contract are used as argument donors.
     * 
     * @param {string} file - The path of the Solidity source file
     * @param {string} source - The Solidity source code
     * @param {Function} visit - The solidity-parser-ast visitor function
     * 
     * @returns {Mutation[]} The generated mutations
     */
    getMutations(file, source, visit) {
        const mutations = [];
        const contracts = [];
        const calls = [];

        visit({
            ContractDefinition: (node) => {
                const functionCounts = {};

                (node.subNodes || []).forEach(subNode => {
                    if (subNode.type === "FunctionDefinition" && subNode.name) {
                        functionCounts[subNode.name] =
                            (functionCounts[subNode.name] || 0) + 1;
                    }
                });

                const overloadedFunctions = Object.keys(functionCounts)
                    .filter(name => functionCounts[name] > 1);

                if (overloadedFunctions.length > 0) {
                    contracts.push({
                        node,
                        overloadedFunctions
                    });
                }
            }
        });

        if (contracts.length === 0) {
            return mutations;
        }

        visit({
            FunctionCall: (node) => {
                const functionName = contextChecker.getCalledFunctionName(node);

                if (!functionName) {
                    return;
                }

                if (node.names && node.names.length > 0) {
                    return;
                }

                const contract = contracts.find(candidate => contextChecker.containsRange(candidate.node, node));

                if (
                    contract &&
                    contract.overloadedFunctions.includes(functionName)
                ) {
                    calls.push({
                        node,
                        functionName,
                        contract
                    });
                }
            }
        });

        calls.forEach(originalCall => {
            const candidates = calls
                .filter(candidate =>
                    candidate !== originalCall &&
                    candidate.contract === originalCall.contract &&
                    candidate.functionName === originalCall.functionName &&
                    isUsefulReplacement(originalCall.node, candidate.node)
                )
                .sort((a, b) =>
                    getCandidateScore(originalCall.node, a.node) -
                    getCandidateScore(originalCall.node, b.node)
                );

            if (candidates.length > 0) {
                apply(originalCall.node, candidates[0].node);
            }
        });

        /**
         * Creates an ACM mutant by replacing the argument list of one function call with 
         * the argument list taken from another call to the same overloaded function.
         *
         * Textually identical replacements are discarded.
         *
         * @param {Object} originalNode FunctionCall node to mutate.
         * @param {Object} replacementNode FunctionCall node whose arguments are used as the replacement.
         * @returns {void}
         */
        function apply(originalNode, replacementNode) {
            const oStart = originalNode.range[0];
            const oEnd = originalNode.range[1] + 1;
            const oStartLine = originalNode.loc.start.line;
            const oEndLine = originalNode.loc.end.line;

            const originalExpressionEnd = originalNode.expression.range[1] + 1;
            const replacementExpressionEnd = replacementNode.expression.range[1] + 1;
            const replacementEnd = replacementNode.range[1] + 1;
            const original = source.slice(oStart, oEnd);
            const originalExpression = source.slice(oStart, originalExpressionEnd);
            const replacementArguments = source.slice(replacementExpressionEnd, replacementEnd);
            const replacement = originalExpression + replacementArguments;

            // Avoid equivalent textual replacements.
            if (original === replacement) {
                return;
            }

            const functionName = contextChecker.getFunctionName(visit, oStartLine, oEndLine);

            pushMutation(new Mutation(file, functionName, oStart, oEnd, oStartLine, oEndLine, original, replacement, "ACM"));
        }

        /**
        * Add a mutation to the mutations list
        * @param {Object} mutation the mutation object
        */
        function pushMutation(mutation) {
            if (!mutations.find(m => m.id === mutation.id)) {
                mutations.push(mutation);
            }
        }

        /**
        * Determines whether the arguments of another call form a useful ACM
        * replacement for the arguments of the original call.
        *
        * A replacement is considered useful when the calls have different arities,
        * when the replacement is a permutation of the original arguments, or when
        * corresponding arguments have different AST node types. This is deliberately
        * a syntactic heuristic and does not compare Solidity types or guarantee that
        * the resulting mutant compiles.
        *
        * @param {Object} originalNode FunctionCall node being considered for mutation.
        * @param {Object} replacementNode FunctionCall node used as the argument donor.
        * @returns {boolean} `true` if the replacement should be considered by ACM; otherwise `false`.
        */
        function isUsefulReplacement(originalNode, replacementNode) {
            if (originalNode.arguments.length !== replacementNode.arguments.length) {
                return true;
            }

            if (isArgumentPermutation(originalNode, replacementNode)) {
                return true;
            }

            return hasDifferentArgumentShape(originalNode, replacementNode);
        }


        /**
         * Checks whether two calls contain the same argument expressions in a different order.
         *
         * Arguments are compared using their exact source text rather than Solidity
         * type information.
         *
         * @param {Object} originalNode FunctionCall node containing the original argument sequence.
         * @param {Object} replacementNode FunctionCall node containing the candidate argument sequence.
         * @returns {boolean} `true` if the replacement arguments are a permutation of the original arguments; otherwise `false`.
         */
        function isArgumentPermutation(originalNode, replacementNode) {
            if (originalNode.arguments.length < 2) {
                return false;
            }

            const originalArgs = contextChecker.getArgumentTexts(originalNode, source);
            const replacementArgs = contextChecker.getArgumentTexts(replacementNode, source);

            if (arraysEqual(originalArgs, replacementArgs)) {
                return false;
            }

            const sortedOriginal = [...originalArgs].sort();
            const sortedReplacement = [...replacementArgs].sort();

            return arraysEqual(sortedOriginal, sortedReplacement);
        }

        /**
        * Assigns a preference score to an ACM donor call.
        *
        * The minimal ACM operator generates at most one replacement for each target call. 
        * Candidate donors are therefore ranked so that smaller and more structurally meaningful argument changes are preferred.
        *
        * The ranking is:
        * - `0`: same arguments in a different order;
        * - `1`: an arity difference of exactly one argument;
        * - `2`: an arity difference greater than one argument;
        * - `3`: same arity but different argument AST shapes.
        *
        * Lower scores represent preferred candidates.
        *
        * @param {Object} originalNode FunctionCall node being mutated.
        * @param {Object} replacementNode Candidate FunctionCall node used as the argument donor.
        * @returns {number} Numeric candidate priority, where a lower value is preferred.
        */
        function getCandidateScore(originalNode, replacementNode) {
            if (isArgumentPermutation(originalNode, replacementNode)) {
                return 0;
            }

            const arityDifference = Math.abs(originalNode.arguments.length - replacementNode.arguments.length);

            if (arityDifference === 1) {
                return 1;
            }

            if (arityDifference > 1) {
                return 2;
            }

            return 3;
        }
        /**
             * Checks whether corresponding arguments of two same-arity function calls have different AST node types.
             *
             * @param {Object} originalNode FunctionCall node containing the original arguments.
             * @param {Object} replacementNode FunctionCall node containing the candidate replacement arguments.
             * @returns {boolean} `true` if at least one corresponding argument has a different AST node type; otherwise `false`.
             */
        function hasDifferentArgumentShape(originalNode, replacementNode) {
            for (let i = 0; i < originalNode.arguments.length; i++) {
                if (originalNode.arguments[i].type !== replacementNode.arguments[i].type) {
                    return true;
                }
            }

            return false;
        }

        /**
         * Performs an ordered strict-equality comparison of two arrays.
         *
         * @param {Array<*>} a First array to compare.
         * @param {Array<*>} b Second array to compare.
         * @returns {boolean} `true` if both arrays have the same length and every
         * element at the same index is strictly equal; otherwise `false`.
         */
        function arraysEqual(a, b) {
            if (a.length !== b.length) {
                return false;
            }

            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) {
                    return false;
                }
            }

            return true;
        }

        return mutations;
    }
}

module.exports = ACMOperator;