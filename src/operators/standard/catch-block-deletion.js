const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class CBDOperator {
  constructor() {
    this.ID = "CBD";
    this.name = "catch-block-deletion";
  }

  getMutations(file, source, visit) {
    const mutations = [];
    visit({
      TryStatement: (node) => {
        if (node.catchClauses.length > 1) { //If there's more than 1 catch clause
          let start, end;
          let lineStart, lineEnd;
          node.catchClauses.forEach(c => {
            start = c.range[0];
            end = c.range[1] + 1;
            lineStart = c.loc.start.line;
            lineEnd = c.loc.end.line;
            const functionName = contextChecker.getFunctionName(visit,startLine,endLine);
            const original = source.slice(start, end);
            const replacement = "";
            mutations.push(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
          });
        }
      }
    });
    return mutations;
  }
}


module.exports = CBDOperator;