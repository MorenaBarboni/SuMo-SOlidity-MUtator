const Mutation = require("../mutation");

function ACMOperator() {
}

ACMOperator.prototype.ID = "ACM";
ACMOperator.prototype.name = "argument-change-of-overloaded-method-call";

ACMOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var functions = [];
  var overloadedFunctions = [];
  var calls = [];
  var ranges = []; //Visited node ranges


  visitFunctionDefinition(mutate);

  function visitFunctionDefinition(callback) {
    //Save defined functions
    visit({
      FunctionDefinition: (node) => {
        if (!ranges.includes(node.range)) {
          ranges.push(node.range);
          if (node.name) {
            functions.push(node.name);
          }
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
              apply(f.range[0], f.range[1], r.range[0], r.range[1]);
              break;
            }
            //If the calls have the same number of arguments but different order
            else {
              for (var i = 0; i < f.arguments.length; i++) {
                if (f.arguments[i].type !== r.arguments[i].type) {
                  apply(f.range[0], f.range[1], r.range[0], r.range[1]);
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

  function apply(originalStart, originalEnd, replacementStart, replacementEnd) {
    var text = source.slice(replacementStart, replacementEnd + 1);
    mutations.push(new Mutation(file, originalStart, originalEnd + 1, text, this.ID));
  }


  return mutations;
};

module.exports = ACMOperator;
