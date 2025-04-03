const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class VUROperator {
  constructor() {
    this.ID = "VUR";
    this.name = "variable-unit-replacement";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      NumberLiteral: (node) => {
        if (node.subdenomination) {

          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit,startLine,endLine);
          const lineStart = node.loc.start.line;
          const lineEnd = node.loc.end.line;
          const original = source.slice(start, end);
          let replacement;

          switch (node.subdenomination) {
            //VURe - Ether Units Replacement
            case 'wei':
              replacement = original.replace('wei', 'gwei');
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
              break;
            case 'gwei':
              replacement = original.replace('gwei', 'wei');
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
              break;
            case 'finney':
              replacement = original.replace('finney', 'gwei');
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
              break;
            case 'szabo':
              replacement = original.replace('szabo', 'gwei');
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
              break;
            case 'ether':
              replacement = original.replace('ether', 'gwei');
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
              break;
            //VURt - Time Units Replacement
            case 'seconds':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('seconds', 'minutes'), this.ID));
              break;
            case 'minutes':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('minutes', 'seconds'), this.ID));
              break;
            case 'hours':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('hours', 'minutes'), this.ID));
              break;
            case 'days':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('days', 'hours'), this.ID));
              break;
            case 'weeks':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('weeks', 'days', this.ID)));
              break;
            case 'years':
              pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, original.replace('years', 'weeks'), this.ID));
          }
        }
      }
    });

    //Apply mutations
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = VUROperator
