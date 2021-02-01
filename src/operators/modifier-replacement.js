const Mutation = require('../mutation')

function MOROperator() {}

MOROperator.prototype.ID = 'MOR'
MOROperator.prototype.name = 'modifier-replacement'

MOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  const allModifiers = [] //Declared modifiers
  const usedModifiers = [] //Modifiers attached to functions

  visitFunctions(mutate);  
  
  /*Save attached modifiers */
  function visitFunctions(callback) {
    visit({
      FunctionDefinition: (node) => {
        if(node.modifiers.length > 0) {  
          node.modifiers.forEach(m => {
            var mod = source.slice(m.range[0], m.range[1]+1)
            if(!usedModifiers.includes(mod))
            usedModifiers.push(mod);              
           }); 
        }
      }
    })
    callback();
  }

   /*Mutate function modifiers */
   function mutate() {
    visit({
        FunctionDefinition: (node) => {        
        /*If the function is decorated */
        if(node.modifiers.length > 0) {  

          var thisFunctionModifiers = []
            node.modifiers.forEach(m => {
            thisFunctionModifiers.push(m.name);
          });

          for(var i = 0; i < thisFunctionModifiers.length; i++)  {
            var start = node.modifiers[i].range[0]
            var end = node.modifiers[i].range[1]+1
            var thisModifier = source.slice(start, end)
            
            usedModifiers.forEach(m => {

            /*If the replacement is valid*/
            if(m !== thisModifier && !thisFunctionModifiers.includes(m) ){
              mutations.push(new Mutation(file, start, end, m))
            }
            });
          }           
        }
      }
    })
   }  
  
  return mutations
}

module.exports = MOROperator
