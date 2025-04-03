const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class ACMOperator {
  constructor() {
    this.ID = "ACM";
    this.name = "argument-change-of-overloaded-method-call";
  }
  getMutations(file, source, visit) {
    const mutations = [];
    var functions = []; // visited function names
    var overloadedFunctions = []; //list of overloaded functions
    var overloadedFunctions = [];
    var calls = [];
    
    visitFunctionDefinition(mutate);

    function visitFunctionDefinition(callback) {
      
      //Save defined functions
      visit({
        FunctionDefinition: (node) => {
          if (node.name) {
            functions.push(node.name);
          }
        }
      });

      //Filter overloaded functions
      const lookup = functions.reduce((a, e) => {
        a[e] = ++a[e] || 0;
        return a;
      }, {});
      overloadedFunctions = functions.filter(e => lookup[e]);
      if (overloadedFunctions.length > 0) {
        callback();
      }
    }

    function mutate() {
      //Visit each function call and check if it is overloaded
      visit({
        FunctionCall: (node) => {
          if (overloadedFunctions.includes(node.expression.name)) {
            calls.push(node);
          }
        }
      });
      if (calls.length > 0) {

        calls.forEach(f => {
          loop1: for (var i = 0; i < calls.length; i++) {

            var r = calls[i];

            if (f !== r && f.expression.name === r.expression.name) {

              //If the calls have a different number of arguments
              if (f.arguments.length !== r.arguments.length) {
                apply(f, r);
                break;
              }
              //If the calls have the same number of arguments but different order
              else {
                for (var i = 0; i < f.arguments.length; i++) {
                  if (f.arguments[i].type !== r.arguments[i].type) {
                    apply(f, r);
                    break;
                  }
                }
                break;
              }
            }
          }
        });
      }
    }

    function apply(originalNode, replacementNode) {

      let oStart = originalNode.range[0];
      let oEnd = originalNode.range[1] + 1;
      let oStartLine = originalNode.loc.start.line;
      let oEndLine = originalNode.loc.end.line;
      let rStart = replacementNode.range[0];
      let rEnd = replacementNode.range[1] + 1;

      var original = source.slice(oStart, oEnd);
      var replacement = source.slice(rStart, rEnd);

      const functionName = contextChecker.getFunctionName(visit, oStartLine, oEndLine);


      pushMutation(new Mutation(file, functionName, oStart, oEnd, oStartLine, oEndLine, original, replacement, "ACM"));
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


module.exports = ACMOperator