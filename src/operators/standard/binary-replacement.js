const Mutation = require('../../mutation')

function BOROperator() {
  this.ID = "BOR";
  this.name = "binary-operator-replacement";
}

BOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var ranges = [] //Visited node ranges

  visit({
    BinaryOperation: (node) => {
     if(!ranges.includes(node.range)){
       ranges.push(node.range);
        const start = node.left.range[1] + 1
        const end = node.right.range[0]
        const startLine =  node.left.loc.end.line;
        const endLine =  node.right.loc.start.line;
        const original = source.slice(start, end)
        let replacement, replacement2, replacement3, replacement4, replacement5;

        switch (node.operator) {
        //BORa - Binary Operator Replacement (Arithmetic)
          case '+':
            replacement = original.replace('+', '-')
            replacement2 = original.replace('+', '*')
            replacement3 = original.replace('+', '/')
            replacement4 = original.replace('+', '**')
            replacement5 = original.replace('+', '%')
            break;
          case '-':
            replacement = original.replace('-', '+')
            replacement2 = original.replace('-', '*')
            replacement3 = original.replace('-', '/')
            replacement4 = original.replace('-', '**')
            replacement5 = original.replace('-', '%')
            break;
          case '*':
            replacement = original.replace('*', '+')
            replacement2 = original.replace('*', '-')
            replacement3 = original.replace('*', '/')
            replacement4 = original.replace('*', '**')
            replacement5 = original.replace('*', '%')
            break;
          case '**':
            replacement = original.replace('**', '+')
            replacement2 = original.replace('**', '-')
            replacement3 = original.replace('**', '*')
            replacement4 = original.replace('**', '/')
            replacement5 = original.replace('**', '%')
            break;
          case '/':
            replacement = original.replace('/', '+')
            replacement2 = original.replace('/', '-')
            replacement3 = original.replace('/', '*')
            replacement4 = original.replace('/', '**')
            replacement5 = original.replace('/', '%')
            break;
          case '%':
            replacement = original.replace('%', '+')
            replacement2 = original.replace('%', '-')
            replacement3 = original.replace('%', '*')
            replacement4 = original.replace('%', '/')
            replacement5 = original.replace('%', '**')
            break;
          case '<<':
            replacement = original.replace('<<', '>>')
            break;
          case '>>':
            replacement = original.replace('>>', '<<')
            break;
          case '|':
            replacement = original.replace('|', '&')
            replacement2 = original.replace('|', '^')
            break;
          case '&':
            replacement = original.replace('&', '|')
            replacement2 = original.replace('&', '^')
            break;
          case '^':
            replacement = original.replace('^', '&')
            replacement = original.replace('^', '|')
            break;
        //BORc - Binary Operator Replacement (Conditional)
        case '&&':
            replacement = original.replace('&&', '||')
            break;
          case '||':
            replacement = original.replace('||', '&&')
            break;
        //BORr - Binary Operator Replacement (Relational)
          case '<':
            replacement = original.replace('<', '<=')
            replacement2 = original.replace('<', '>= ')
            replacement3 = original.replace('<', '>')
            replacement4 = original.replace('<', '!=')
            replacement5 = original.replace('<', '==')
            break;
          case '>':
            replacement = original.replace('>', '>= ')
            replacement2 = original.replace('>', '<= ')
            replacement3 = original.replace('>', '<')
            replacement4 = original.replace('>', '!=')
            replacement5 = original.replace('>', '==')
            break;
          case '<=':
            replacement = original.replace('<=', ' <')
            replacement2 = original.replace('<=', ' >')
            replacement3 = original.replace('<=', '>=')
            replacement4 = original.replace('<=', '!=')
            replacement5 = original.replace('<=', '==')
            break;
          case '>=':
            replacement = original.replace('>=', ' >')
            replacement2 = original.replace('>=', ' <')
            replacement3 = original.replace('>=', '<=')
            replacement4 = original.replace('>=', '!=')
            replacement5 = original.replace('>=', '==')
            break;
          case '!=':
            replacement = original.replace('!=', '> ')
            replacement2 = original.replace('!=', ' <')
            replacement3 = original.replace('!=', '<=')
            replacement4 = original.replace('!=', '>=')
            replacement5 = original.replace('!=', '==')
          break;
          case '==':
            replacement = original.replace('==', '<=')
            replacement2 = original.replace('==', '>=')
            replacement3 = original.replace('==', ' <')
            replacement4 = original.replace('==', ' >')
            replacement5 = original.replace('==', '!=')
          break;
        }

        if (replacement) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID))
        }
        if(replacement2){
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement2, this.ID))
        }
        if (replacement3) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement3, this.ID))
        }
        if(replacement4){
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement4, this.ID))
        }
        if (replacement5) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement5, this.ID))
        }
    }}
  })

  return mutations
}

module.exports = BOROperator
