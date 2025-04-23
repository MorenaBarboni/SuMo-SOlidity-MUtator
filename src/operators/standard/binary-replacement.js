const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class BOROperator {
  constructor() {
    this.ID = "BOR";
    this.name = "binary-operator-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      BinaryOperation: (node) => {
        const start = node.left.range[1] + 1;
        const end = node.right.range[0];
        const startLine = node.left.loc.end.line;
        const endLine = node.right.loc.start.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);
        let replacement, replacement2, replacement3;

        switch (node.operator) {
          //BORa - Binary Operator Replacement (Arithmetic)
          case '+':
            replacement = original.replace('+', '-');
            replacement2 = original.replace('+', '*');
            break;
          case '-':
            replacement = original.replace('-', '+');
            replacement2 = original.replace('-', '/');
            break;
          case '*':
            replacement = original.replace('*', '+');
            replacement2 = original.replace('*', '**');
            break;
          case '**':
            replacement = original.replace('**', '*');
            break;
          case '/':
            replacement = original.replace('/', '+');
            replacement2 = original.replace('/', '-');
            break;
          case '%':
            replacement = original.replace('%', '/');
            break;
          case '<<':
            replacement = original.replace('<<', '>>');
            break;
          case '>>':
            replacement = original.replace('>>', '<<');
            break;
          case '|':
            replacement = original.replace('|', '&');
            replacement2 = original.replace('|', '^');
            break;
          case '&':
            replacement = original.replace('&', '|');
            replacement2 = original.replace('&', '^');
            break;
          case '^':
            replacement = original.replace('^', '&');
            replacement2 = original.replace('^', '|');
            break;
          //BORc - Binary Operator Replacement (Conditional)
          case '&&':
            replacement = original.replace('&&', '||');
            break;
          case '||':
            replacement = original.replace('||', '&&');
            break;
          //BORr - Binary Operator Replacement (Relational)
          case '<':
            replacement = original.replace('<', '>');
            replacement2 = original.replace('<', '<=');
            break;
          case '>':
            replacement = original.replace('>', '<');
            replacement2 = original.replace('>', '>= ');
            break;
          case '<=':
            replacement = original.replace('<=', ' <');
            replacement2 = original.replace('<=', '>=');
            replacement3 = original.replace('<=', '==');
            break;
          case '>=':
            replacement = original.replace('>=', ' >');
            replacement2 = original.replace('>=', '<=');
            replacement3 = original.replace('>=', '==');
            break;
          case '!=':
            if (contextChecker.isAddressComparison(node.left, node.right)) {
              replacement = original.replace('!=', '==');
            } else {
              replacement = original.replace('!=', '<=');
              replacement2 = original.replace('!=', '>=');
              replacement3 = original.replace('!=', '==');
            }
            break;
          case '==':
            if (contextChecker.isAddressComparison(node.left, node.right)) {
              replacement = original.replace('==', '!=');
            }
            else {
              replacement = original.replace('==', '<=');
              replacement2 = original.replace('==', '>=');
              replacement3 = original.replace('==', '!=');
            }
            break;
        }
        if (replacement) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
        if (replacement2) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
        }
        if (replacement3) {
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement3, this.ID));
        }
      }
    });

    /**
     * Push a mutation to the generated mutations list
     * @param {Object} mutation the mutation
    */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = BOROperator
