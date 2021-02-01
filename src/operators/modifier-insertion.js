const Mutation = require('../mutation')

function MOIOperator() {}

MOIOperator.prototype.ID = 'MOI'
MOIOperator.prototype.name = 'modifier-insertion'

MOIOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  const usedModifiers = [] //Used modifiers

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
    if(usedModifiers.length > 0){
      callback();
    }
  }

   /*Mutate function modifiers */
   function mutate() {
    visit({
        FunctionDefinition: (node) => {        
        /*If the function is not decorated */
        if(node.modifiers.length === 0 && node.body) {
          if(node.body && !node.isConstructor && !node.isReceiveEther && !node.isFallback){
          var start = node.range[0];
          var end =  node.body.range[0];
          var functionSignature = source.substring(start, end);

          //If the function has return parameters
          if(node.returnParameters && node.returnParameters.length >0 ){
           var slice1 = functionSignature.split("returns")[0];
           var slice2 = " returns"+functionSignature.split("returns")[1];
           usedModifiers.forEach(m => {
             var replacement =  slice1+ m + slice2
              mutations.push(new Mutation(file, start, end, replacement))            
            });  
          //If the function does not have return parameters  
          }else{
            usedModifiers.forEach(m => {
              var replacement =  functionSignature + m + " " 
               mutations.push(new Mutation(file, start, end, replacement))            
             });  
          }        
                       
        }}
      }
    })
   }  
  
  return mutations
}

module.exports = MOIOperator
