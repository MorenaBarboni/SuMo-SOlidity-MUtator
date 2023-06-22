const Mutation = require('../../mutation')

function MOROperator() {
  this.ID = "MOR";
  this.name = "modifier-replacement";
}

MOROperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  const modifiers = []; //Modifiers attached to functions
  const modifiersNodes = []; //Modifiers nodes attached to functions

  visitModifiers(visitFunctions);

  /*Save the modifiers attached to each function */
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

  /*Visit each decorated function and replace its first modifier with all possible (legal) modifiers */
  function visitFunctions() {
    visit({
      FunctionDefinition: (fNode) => {

        /*If the function is decorated */
        if (fNode.modifiers.length > 0) {
          /*If the function is not special */
          if (fNode.body && !fNode.isConstructor && !fNode.isReceiveEther && !fNode.isFallback) {

            //Cycle the available modifiers nodes
            for (let i = 0; i < modifiersNodes.length; i++) {
              const mNode = modifiersNodes[i];

              //If the modifier has parameters, they must be compatible with the function parameters
              if (mNode.arguments && mNode.arguments.length > 0) {

                //If the function has parameters
                if (fNode && fNode.parameters) {

                  var modArguments = [];
                  var funcArguments = [];

                  //Save modifier parameters
                  mNode.arguments.forEach(e => {
                    if (e.name)
                      modArguments.push(e.name);
                  });

                  //Save function parameters
                  fNode.parameters.forEach(e => {
                    funcArguments.push(e.name);
                  });

                  //If the parameters of the modifier are included in the parameters of the function
                  if (modArguments.length > 0) {
                    var params_included = modArguments.every(function (element, index) {
                      return element === funcArguments[index];
                    });
                    if (params_included) {
                      const result = mutate(fNode, mNode);
                      if (result) {
                        mutations.push(result);
                      }
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
                const result = mutate(fNode, mNode);
                if (result) {
                  mutations.push(result);
                }
              }
            }
          }
        }
      }
    });
  }


  /**
       * Checks if the modifier is a valid mutation candidate for the function.
       * The modifier must be used in the same contract in which the function is defined, and it must not already be attached to the function signature. 
       * @param functionNode the function node to be mutated
       * @param modifierNode the potential modifier replacement node
       * @returns a mutation if the modifier can be used, false otherwise
    */
  function mutate(functionNode, modifierNode) {

    if (contractContaining(functionNode) === contractContaining(modifierNode) && contractContaining(functionNode)) {

      /*retrieve modifier nodes attached to the current function node*/
      var funcModifiers = [];
      functionNode.modifiers.forEach(m => {
        funcModifiers.push(source.slice(m.range[0], m.range[1] + 1));
      });

      /*swap the first modifier attached to the current function node with a single different modifier*/
      var start = functionNode.modifiers[0].range[0];
      var end = functionNode.modifiers[0].range[1] + 1;
      const startLine = functionNode.loc.start.line;
      const endLine = functionNode.body.loc.start.line;
      var original = source.substring(start, end);  //function modifier
      var replacement = source.slice(modifierNode.range[0], modifierNode.range[1] + 1);

      /*the replacement is valid if it does not match any of the attached modifiers*/
      if (replacement !== original && !funcModifiers.find(m => m === replacement)) {
        const mutation = new Mutation(file, start, end, startLine, endLine, original, replacement, "MOR");
        return mutation;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Checks to which contract a node belongs to
   * @param node the input node
   * @returns the contract name (or false if no contract is found)
   */
  function contractContaining(node) {
    const nodeStart = node.range[0];
    const nodeEnd = node.range[1];
    let cName = false;
    visit({
      ContractDefinition: (cNode) => {
        if (nodeStart >= cNode.range[0] && nodeEnd <= cNode.range[1]) {
          cName = cNode.name;
        }
      }
    });
    return cName;
  }

  return mutations;
};

module.exports = MOROperator;
