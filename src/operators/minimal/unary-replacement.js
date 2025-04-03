const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class UORDOperator {
    constructor() {
        this.ID = "UORD";
        this.name = "unary-operator-replacement";
    }

    getMutations(file, source, visit) {
        const mutations = [];

        visit({
            UnaryOperation: (node) => {

                let replacement;
                let start, end;

                if (node.isPrefix) {
                    start = node.range[0];
                    end = node.range[1] + 1;
                } else {
                    start = node.range[0] + 1;
                    end = node.range[1] + 1;
                }
                const startLine = node.loc.end.line;
                const endLine = node.loc.start.line;
                const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
                const original = source.slice(start, end);

                switch (node.operator) {
                    //UORDa - Unary Operator Replacement (Arithmetic)
                    case "++":
                        replacement = original.replace("++", " ");
                        break;
                    case "--":
                        replacement = original.replace("--", " ");
                        break;
                    case "-":
                        replacement = original.replace("-", " ");
                        break;
                    case "~":
                        replacement = original.replace("~", " ");
                        break;
                    //UORDc - Unary Operator Replacement (Conditional)
                    case "!":
                        replacement = original.replace("!", " ");
                        break;
                }

                if (replacement)
                    pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            }
        });

        /**
        * Add a mutation to the mutations list
        * @param {Object} mutation the mutation object
        */
        function pushMutation(mutation) {
            if (!mutations.find(m => m.id === mutation.id)) {
                mutations.push(mutation);
            }
        }

        return mutations;
    }
}


module.exports = UORDOperator;