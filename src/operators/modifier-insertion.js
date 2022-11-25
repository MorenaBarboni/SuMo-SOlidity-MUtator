const Mutation = require("../mutation");

function MOIOperator() {
}

MOIOperator.prototype.ID = "MOI";
MOIOperator.prototype.name = "modifier-insertion";

MOIOperator.prototype.getMutations = function(file, source, visit) {
  const ID = this.ID;
  const mutations = [];
  const modifiers = []; //Modifiers attached to functions
  const modifiersNodes = []; //Modifiers nodes attached to functions


  visitModifiers(visitFunctions);

  /*Save attached modifiers */
  function visitModifiers(callback) {
    visit({
      ModifierInvocation: (node) => {
        var m = source.slice(node.range[0], node.range[1] + 1);
        if (!modifiers.includes(m)) {
          modifiers.push(m);
          if (!modifiersNodes.includes(node)) {
            modifiersNodes.push(node);
          }
        }
      }
    });
    if (modifiers.length > 0) {
      callback();
    }
  }

  /*Visit not decorated functions */
  function visitFunctions() {
    visit({
      FunctionDefinition: (node) => {
        /*If the function is not decorated */
        if (node.modifiers.length === 0 && node.body) {
          /*If the function is not special */
          if (node.body && !node.isConstructor && !node.isReceiveEther && !node.isFallback) {

            //Cycle the available modifiers nodes
            for (let i = 0; i < modifiersNodes.length; i++) {
              const m = modifiersNodes[i];

              //If the modifier has parameters, they must be compatible with the function parameters
              if (m.arguments) {

                //If the function has parameters
                if (node && node.parameters) {

                  var modArguments = [];
                  var funcArguments = [];

                  //Save modifier parameters
                  m.arguments.forEach(e => {
                    if (e.name)
                      modArguments.push(e.name);
                    //the argument passed to the modifier are excluded
                    // else if (e.value)
                    //modArguments.push(e.value)
                  });

                  //Save function parameters
                  node.parameters.forEach(e => {
                    funcArguments.push(e.name);
                  });

                  //If the parameters of the modifier are included in the parameters of the function
                  if (modArguments.length > 0) {
                    var is_included = modArguments.every(function(element, index) {
                      return element === funcArguments[index];
                    });
                    if (is_included) {
                      mutate(node, m);
                    }
                  }

                }
                //If the function does not have arguments, skip the mutation
                else {
                  break;
                }
              }
              //If the modifier does not have arguments
              else {
                mutate(node, m);
              }
            }
          }
        }
      }
    });
  }


  /**
   * Applies a mutation to the function
   * @param functionNode the function node to be mutated
   * @param modifierNode the replacement node
   *
   */
  function mutate(functionNode, modifierNode) {

    var startF = functionNode.range[0];
    var endF = functionNode.body.range[0];
    var original = source.substring(startF, endF);  //function signature
    const startLine = functionNode.loc.start.line;
    const endLine = functionNode.body.loc.start.line; 

    var startM = modifierNode.range[0];
    var endM = modifierNode.range[1] + 1;
    var modifier = source.substring(startM, endM);

    //If the function has return parameters
    if (functionNode.returnParameters && functionNode.returnParameters.length > 0) {
      var slice1 = original.split("returns")[0];
      var slice2 = " returns" + original.split("returns")[1];
      var replacement = slice1 + modifier + slice2;
      mutations.push(new Mutation(file, startF, endF, startLine, endLine, original, replacement, ID));
    }
    //If the function has no return parameters
    else {
      var replacement = original + modifier + " ";
      mutations.push(new Mutation(file, startF, endF, startLine, endLine, original, replacement, ID));
    }

  }


  return mutations;
};

module.exports = MOIOperator;
