const Mutation = require("../mutation");

function MOROperator() {
}

MOROperator.prototype.ID = "MOR";
MOROperator.prototype.name = "modifier-replacement";

MOROperator.prototype.getMutations = function(file, source, visit) {
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

  /*Visit decorated functions */
  function visitFunctions() {
    visit({
      FunctionDefinition: (node) => {

        /*If the function is decorated */
        if (node.modifiers.length > 0) {
          /*If the function is not special */
          if (node.body && !node.isConstructor && !node.isReceiveEther && !node.isFallback) {

            //Cycle the available modifiers nodes
            for (let i = 0; i < modifiersNodes.length; i++) {
              const m = modifiersNodes[i];

              //If the modifier has parameters, they must be compatible with the function parameters
              if (m.arguments && m.arguments.length > 0) {

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
   * @param modifierNode the potential replacement node
   *
   */
  function mutate(functionNode, modifierNode) {

    /*retrieve modifier nodes attached to the current function node*/
    var funcModifiers = [];
    functionNode.modifiers.forEach(m => {
      funcModifiers.push(source.slice(m.range[0], m.range[1] + 1));
    });

    /*cycle the modifiers attached to the current function node*/
    for (var i = 0; i < funcModifiers.length; i++) {
      var start = functionNode.modifiers[i].range[0];
      var end = functionNode.modifiers[i].range[1] + 1;
      var funcModifier = source.slice(start, end);

      var replacement = source.slice(modifierNode.range[0], modifierNode.range[1] + 1);

      /*the replacement is valid if it does not match any of the attached modifiers*/
      if (replacement !== funcModifier && !funcModifiers.includes(replacement)) {
        mutations.push(new Mutation(file, start, end, replacement, "MOR"));
      }
    }
  }

  return mutations;
};

module.exports = MOROperator;
