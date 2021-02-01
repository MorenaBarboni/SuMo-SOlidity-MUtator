const Mutation = require('../mutation')

function ILROperator() {}

ILROperator.prototype.ID = 'ILR'
ILROperator.prototype.name = 'integer-literal-replacement'

ILROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var prevRange;

  visit({
     NumberLiteral: (node) => {
      //Avoid duplicate mutants
      if(prevRange != node.range){ 
        if(node.number % 1 == 0){
        var subdenomination ="";
        if (node.subdenomination){
          subdenomination = " "+node.subdenomination;
        }
        if (node.number == 1) {
          var sliced = source.slice(node.range[0]-1, node.range[0])
          if(sliced === '-')
          mutations.push(new Mutation(file, node.range[0]-1, node.range[1] + 1, '0'+subdenomination))
          else
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, '0'+subdenomination))

        } else if (node.number == 0) {
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, '1'+subdenomination))
        } else {
          var num = Number(node.number)
          var inc;
          var dec;

          if(num < Number.MAX_SAFE_INTEGER ){
            inc = num+1;
            dec = num-1;
          }else{
          num = BigInt(node.number)
          inc = BigInt(num +1n);
          dec = BigInt(num -1n);
          }
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, dec + subdenomination))
          mutations.push(new Mutation(file, node.range[0], node.range[1] + 1, inc+ subdenomination))
      }
    }
    }
     prevRange = node.range;
    }
  })
  return mutations
}

module.exports = ILROperator
