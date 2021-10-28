const Mutation = require('../mutation')

function BOROperator() {}

BOROperator.prototype.ID = 'BOR'
BOROperator.prototype.name = 'binary-operator-replacement'

BOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = []
  var ranges = [] //Visited node ranges

  visit({
    BinaryOperation: (node) => {
     if(!ranges.includes(node.range)){
       ranges.push(node.range);
        const start = node.left.range[1] + 1
        const end = node.right.range[0]
        const text = source.slice(start, end)

        let replacement;
        let replacement2;
        let replacement3;
        let replacement4;
        let replacement5;


        switch (node.operator) {
        //BORa - Binary Operator Replacement (Arithmetic)
          case '+':
            replacement = text.replace('+', '-')
            replacement2 = text.replace('+', '*')
            replacement3 = text.replace('+', '/')
            replacement4 = text.replace('+', '**')
            replacement5 = text.replace('+', '%')
            break;
          case '-':
            replacement = text.replace('-', '+')
            replacement2 = text.replace('-', '*')
            replacement3 = text.replace('-', '/')
            replacement4 = text.replace('-', '**')
            replacement5 = text.replace('-', '%')    
            break;
          case '*':
            replacement = text.replace('*', '+')
            replacement2 = text.replace('*', '-')
            replacement3 = text.replace('*', '/')
            replacement4 = text.replace('*', '**')
            replacement5 = text.replace('*', '%')  
            break;
          case '**':
            replacement = text.replace('**', '+')
            replacement2 = text.replace('**', '-')
            replacement3 = text.replace('**', '*')
            replacement4 = text.replace('**', '/')
            replacement5 = text.replace('**', '%')  
            break;
          case '/':
            replacement = text.replace('/', '+')
            replacement2 = text.replace('/', '-')
            replacement3 = text.replace('/', '*')
            replacement4 = text.replace('/', '**')
            replacement5 = text.replace('/', '%')  
            break;
          case '%':
            replacement = text.replace('%', '+')
            replacement2 = text.replace('%', '-')
            replacement3 = text.replace('%', '*')
            replacement4 = text.replace('%', '/')
            replacement5 = text.replace('%', '**')  
            break;
          case '<<':
            replacement = text.replace('<<', '>>')
            break;
          case '>>':
            replacement = text.replace('>>', '<<')
            break;
          case '|':
            replacement = text.replace('|', '&')
            replacement2 = text.replace('|', '^')
            break;
          case '&':
            replacement = text.replace('&', '|')
            replacement2 = text.replace('&', '^')
            break;
          case '^':
            replacement = text.replace('^', '&')
            replacement = text.replace('^', '|')
            break;
        //BORc - Binary Operator Replacement (Conditional)
        case '&&':
            replacement = text.replace('&&', '||')
            break;
          case '||':
            replacement = text.replace('||', '&&')
            break;
        //BORr - Binary Operator Replacement (Relational)
          case '<':
            replacement = text.replace('<', '<=')
            replacement2 = text.replace('<', '>= ')
            replacement3 = text.replace('<', '>')
            replacement4 = text.replace('<', '!=')
            replacement5 = text.replace('<', '==')  
            break;
          case '>':
            replacement = text.replace('>', '>= ')
            replacement2 = text.replace('>', '<= ')
            replacement3 = text.replace('>', '<')
            replacement4 = text.replace('>', '!=')
            replacement5 = text.replace('>', '==')  
            break;
          case '<=':
            replacement = text.replace('<=', ' <')
            replacement2 = text.replace('<=', ' >')
            replacement3 = text.replace('<=', '>=')
            replacement4 = text.replace('<=', '!=')
            replacement5 = text.replace('<=', '==')  
            break;
          case '>=':
            replacement = text.replace('>=', ' >')
            replacement2 = text.replace('>=', ' <')
            replacement3 = text.replace('>=', '<=')
            replacement4 = text.replace('>=', '!=')
            replacement5 = text.replace('>=', '==')  
            break;
          case '!=':
            replacement = text.replace('!=', '> ')
            replacement2 = text.replace('!=', ' <')
            replacement3 = text.replace('!=', '<=')
            replacement4 = text.replace('!=', '>=')
            replacement5 = text.replace('!=', '==')  
          break;
          case '==':
            replacement = text.replace('==', '<=')
            replacement2 = text.replace('==', '>=')
            replacement3 = text.replace('==', ' <')
            replacement4 = text.replace('==', ' >')
            replacement5 = text.replace('==', '!=')  
          break;
        }

        if (replacement) {
          mutations.push(new Mutation(file, start, end, replacement))
        }
        if(replacement2){
          mutations.push(new Mutation(file, start, end, replacement2))
        }
        if (replacement3) {
          mutations.push(new Mutation(file, start, end, replacement3))
        }
        if(replacement4){
          mutations.push(new Mutation(file, start, end, replacement4))
        }  
        if (replacement5) {
          mutations.push(new Mutation(file, start, end, replacement5))
        }
    }}
  })

  return mutations
}

module.exports = BOROperator
