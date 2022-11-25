const Mutation = require('../../mutation')

function VUROperator() {}

VUROperator.prototype.ID = 'VUR'
VUROperator.prototype.name = 'variable-unit-replacement'

VUROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var prevRange;

   visit({
    NumberLiteral: (node) => {
      if(node.subdenomination){
        if(prevRange != node.range){
          const start = node.range[0];
          const end = node.range[1]  + 1;
          const lineStart = node.loc.start.line;
          const lineEnd = node.loc.end.line;
          const original = source.slice(start, end);
          let replacement;
          

          switch (node.subdenomination) {
            //VURe - Ether Units Replacement
            case 'wei':
              replacement = original.replace('wei','ether');
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID))
              break;
            case 'ether':
              replacement = original.replace('ether','wei');
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID))
              break;
            //VURt - Time Units Replacement
            case 'seconds':
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'minutes', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'hours', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'days', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'weeks', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'years', this.ID))
              break;
            case 'minutes':
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'seconds', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'hours', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'days', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'weeks', this.ID))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'years', this.ID))
              break;
            case 'hours':
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'seconds', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'minutes', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'days', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'weeks', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'years', this.ID))
              break;
            case 'days':
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'seconds', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'minutes', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'hours', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'weeks', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'years', this.ID))
              break;
            case 'weeks':
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement = original.replace('weeks','seconds', this.ID)))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement = original.replace('weeks','minutes', this.ID)))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement = original.replace('weeks','hours', this.ID)))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement = original.replace('weeks','days', this.ID)))
              mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement = original.replace('weeks','years', this.ID)))
              break;
            case 'years':
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'seconds', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'minutes', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'hours', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'days', this.ID))
               mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, 'weeks', this.ID))
            }

        }
        prevRange = node.range;
      }
    }
  })
  return mutations
}

module.exports = VUROperator
