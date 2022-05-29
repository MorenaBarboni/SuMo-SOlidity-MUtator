const Mutation = require('../../mutation')

function AOROperator() {}

AOROperator.prototype.ID = 'AOR'
AOROperator.prototype.name = 'assignment-operator-replacement'

AOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []

  visit({
    BinaryOperation: (node) => {
      const start = node.left.range[1] + 1
      const end = node.right.range[0]
      const text = source.slice(start, end)

      let replacement;
      let replacement2;
      let replacement3;
      let replacement4;
      let replacement5;

      switch (node.operator) {
        case '+=':
          replacement = text.replace('+=', '-=')
          replacement2 = text.replace('+=', ' =')
          replacement3 = text.replace('+=', '/=')
          replacement4 = text.replace('+=', '*=')
          replacement5 = text.replace('+=', '%=')

          break;
        case '-=':
          replacement = text.replace('-=', '+=')
          replacement2 = text.replace('-=', ' =')
          replacement3 = text.replace('-=', '/=')
          replacement4 = text.replace('-=', '*=')
          replacement5 = text.replace('-=', '%=')
          break;
        case '*=':
          replacement = text.replace('*=', '/=')
          replacement2 = text.replace('*=', ' =')
          replacement3 = text.replace('*=', '+=')
          replacement4 = text.replace('*=', '-=')
          replacement5 = text.replace('*=', '%=')
          break;
        case '/=':
          replacement = text.replace('/=', '*=')
          replacement2 = text.replace('/=', ' =')
          replacement3 = text.replace('/=', '+=')
          replacement4 = text.replace('/=', '-=')
          replacement5 = text.replace('/=', '%=')
          break;
        case '%=':
          replacement = text.replace('%=', '*=')
          replacement2 = text.replace('%=', ' =')
          replacement3 = text.replace('%=', '+=')
          replacement4 = text.replace('%=', '-=')
          replacement5 = text.replace('%=', '/=')
          break;
        case '<<=':
          replacement = text.replace('<<=', '>>=')
          replacement2 = text.replace('<<=', ' =')
          break;
        case '>>=':
          replacement = text.replace('>>=', '<<=')
          replacement2 = text.replace('>>=', ' =')
          break;
        case '|=':
          replacement = text.replace('|=', '&=')
          replacement2 = text.replace('|=', ' =')
          replacement3 = text.replace('|=', '^=')
          break;
        case '&=':
          replacement = text.replace('&=', '|=')
          replacement2 = text.replace('&=', ' =')
          replacement3 = text.replace('&=', '^=')
          break;
        case '^=':
          replacement = text.replace('^=', '&=')
          replacement2 = text.replace('^=', ' =')
          replacement3 = text.replace('^=', '|=')
          break;
        }

        if (replacement) {
          mutations.push(new Mutation(file, start, end, replacement, this.ID))
        }
        if(replacement2){
          mutations.push(new Mutation(file, start, end, replacement2, this.ID))
        }
        if (replacement3) {
          mutations.push(new Mutation(file, start, end, replacement3, this.ID))
        }
        if(replacement4){
          mutations.push(new Mutation(file, start, end, replacement4, this.ID))
        }
        if (replacement5) {
          mutations.push(new Mutation(file, start, end, replacement5, this.ID))
        }
    },
  })

  return mutations
}

module.exports = AOROperator
