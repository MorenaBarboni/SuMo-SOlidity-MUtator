const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ILROperator {
    constructor() {
        this.ID = "ILR";
        this.name = "integer-literal-replacement";
    }

    getMutations(file, source, visit) {
        const mutations = [];

        visit({
            TupleExpression: (node) => {
                if (node.isArray) {
                    if (node.components[0] && node.components[0].type == "NumberLiteral") {
                        //Mutate the first component and exclude subsequent components
                        mutateIntegerLiteral(node.components[0]);
                    }
                }
            }
        });

        //Visit number literals
        visit({
            NumberLiteral: (node) => {
                mutateIntegerLiteral(node);
            }
        });

        //Apply mutations
        function mutateIntegerLiteral(node) {
            let value = node.number.toString();
            //Check if it is hex
            if (!value.match(/^0x[0-9a-f]+$/i)) {
                if (node.number % 1 == 0) {
                    var subdenomination = "";
                    var start = node.range[0];
                    var end = node.range[1] + 1;
                    const startLine = node.loc.start.line;
                    const endLine = node.loc.end.line;
                    var original = source.slice(start, end);
                    const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                    if (node.subdenomination) {
                        subdenomination = " " + node.subdenomination;
                    }
                    if (node.number == 1) {
                        var sliced = source.slice(node.range[0] - 1, node.range[0]);
                        if (sliced === "-") {
                            start = node.range[0] - 1;
                            original = source.slice(start, end);
                            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "0" + subdenomination, "ILR"));
                        }
                        else {
                            pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "0" + subdenomination, "ILR"));
                        }
                    } else if (node.number == 0) {
                        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "1" + subdenomination, "ILR"));
                    }
                    // the minimal version only increments by one
                    else {
                        var num = Number(node.number);
                        var inc;

                        if (num < Number.MAX_SAFE_INTEGER) {
                            inc = num + 1;
                        }
                        pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, inc + subdenomination, "ILR"));
                    }
                }
            }
        }


        /**
        * Push a mutation to the generated mutations list
        * @param {Object} mutation the mutation
       */
        function pushMutation(mutation) {
            if (!mutations.find(m => m.id === mutation.id)) {
                //No more than 5 mutations per line, limit for hardcoded int arrays
                if (mutations.filter(m => (m.startLine === mutation.startLine && m.endLine === m.endLine)).length <= 5) {
                    mutations.push(mutation);
                }
            }
        }
        return mutations;
    }
}


module.exports = ILROperator;