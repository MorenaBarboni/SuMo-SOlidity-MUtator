const Mutation = require('../../mutation')

function EHCOperator() {
  this.ID = "EHC";
  this.name = "exception-handling-statement-change";
}

EHCOperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  const functions = ["require", "assert", "revert"];

  visit({
    FunctionCall: (node) => {
      if (functions.includes(node.expression.name)) {

        //EHD - Exception Handling statement Deletion
        const start = node.range[0];
        var temp = source.slice(start);
        var delimiter = temp.indexOf(";");
        var end = start + delimiter + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end);
        var replacement = "/* " + original + " */";
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));

        //EHR - Exception Handling statement Replacement
        /*end = node.range[1] +1;

        if (node.expression.name == "require") {
          const condition = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);
          replacement = "assert(" + condition + ")";
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
        if (node.expression.name == "assert") {
          const condition = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);
          replacement = "require(" + condition + ")";
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }*/
      }
    }
  });
  return mutations;
};

module.exports = EHCOperator;
