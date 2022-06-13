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
          const end = node.range[1];
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;  
          var replacement = source.slice(start, end + 1)

          switch (node.subdenomination) {
            //VURe - Ether Units Replacement
            case 'wei':
              replacement = replacement.replace('wei','ether')
              break;
            case 'ether':
              replacement = replacement.replace('ether','wei')
              break;
            //VURt - Time Units Replacement
            case 'seconds':
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'minutes', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'hours', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'days', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'weeks', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'years', this.ID))
              break;
            case 'minutes':
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'seconds', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'hours', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'days', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'weeks', this.ID))
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'years', this.ID))
              break;
            case 'hours':
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'seconds', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'minutes', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'days', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'weeks', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'years', this.ID))
              break;
            case 'days':
              mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'seconds', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'minutes', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'hours', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'weeks', this.ID))
               mutations.push(new Mutation(file, start, end + 1, startLine, endLine, 'years', this.ID))
              break;
            case 'weeks':
              mutations.push(new Mutation(file, start, end + 1, replacement = replacement.replace('weeks','seconds', startLine, endLine, this.ID)))
              mutations.push(new Mutation(file, start, end + 1, replacement = replacement.replace('weeks','minutes', startLine, endLine, this.ID)))
              mutations.push(new Mutation(file, start, end + 1, replacement = replacement.replace('weeks','hours', startLine, endLine, this.ID)))
              mutations.push(new Mutation(file, start, end + 1, replacement = replacement.replace('weeks','days', startLine, endLine, this.ID)))
              mutations.push(new Mutation(file, start, end + 1, replacement = replacement.replace('weeks','years', startLine, endLine, this.ID)))
              break;
            case 'years':
               mutations.push(new Mutation(file, start, end + 1, 'seconds', startLine, endLine, this.ID))
               mutations.push(new Mutation(file, start, end + 1, 'minutes', startLine, endLine, this.ID))
               mutations.push(new Mutation(file, start, end + 1, 'hours', startLine, endLine, this.ID))
               mutations.push(new Mutation(file, start, end + 1, 'days', startLine, endLine, this.ID))
               mutations.push(new Mutation(file, start, end + 1, 'weeks', startLine, endLine, this.ID))
            }

        }
        prevRange = node.range;
      }
    }
  })
  return mutations
}

module.exports = VUROperator
