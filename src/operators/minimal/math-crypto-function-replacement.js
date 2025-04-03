const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class MCROperator {
  constructor() {
    this.ID = "MCR";
    this.name = "math-and-crypto-function-replacement";
  }
  getMutations(file, source, visit) {
    const mutations = [];
    const functions = ["addmod", "mulmod", "keccak256", "sha256", "ripemd160"];
    const OZsignedMathFunctions = ["min", "max", "average"];
    var imports = [];

    //Check libraries imported in the contract
    visit({
      ImportDirective: (node) => {
        if (node.path.includes("SignedMath")) {
          imports.push("SignedMath");
        }
        if (node.path.includes("Math")) {
          imports.push("Math");
        }
        if (node.path.includes("SafeMath")) {
          imports.push("SafeMath");
        }
      }
    });

    visit({
      FunctionCall: (node) => {
        const start = node.expression.range[0];
        const end = node.expression.range[1] + 1;
        const startLine = node.expression.loc.start.line;
        const endLine = node.expression.loc.end.line;
        const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
        const original = source.slice(start, end);

        if (functions.includes(node.expression.name)) {
          switch (node.expression.name) {
            case "addmod":
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "mulmod", this.ID));
              break;
            case "mulmod":
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "addmod", this.ID));
              break;
            case "keccak256":
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "sha256", this.ID));
              break;
            case "sha256":
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "keccak256", this.ID));
              break;
            case "ripemd160":
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "sha256", this.ID));
              break;
          }

        }
      }
    });

    if (imports.includes("SafeMath")) {
      visit({
        MemberAccess: (node) => {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const lineStart = node.loc.start.line;
          const lineEnd = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);

          var replacement;

          switch (node.memberName) {
            case 'add':
              replacement = original.replace('add', 'sub');
              break;
            case 'sub':
              replacement = original.replace('sub', 'add');
              break;
            case 'mul':
              replacement = original.replace('mul', 'add');
              break;
            case 'div':
              replacement = original.replace('div', 'sub');
              break;
            case 'mod':
              replacement = original.replace('mod', 'div');
              break;
          }
          if (replacement) {
            pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement, this.ID));
          }
          if (replacement2) {
            pushMutation(new Mutation(file, functionName, start, end, lineStart, lineEnd, original, replacement2, this.ID));
          }
        }
      });
    }

    if (imports.includes("Math") || imports.includes("SignedMath")) {
      visit({
        MemberAccess: (node) => {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
          const original = source.slice(start, end);

          if (node.expression?.name && OZsignedMathFunctions.includes(node.expression?.name)) {
            switch (node.expression.name) {
              case "min":
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "max", this.ID));
                break;
              case "max":
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "min", this.ID));
                break;
              case "average":
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, "min", this.ID));
                break;
            }
          }
        }
      });
    }

    /**
    * Add a mutation to the mutations list
    * @param {Object} mutation the mutation object
    */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = MCROperator;