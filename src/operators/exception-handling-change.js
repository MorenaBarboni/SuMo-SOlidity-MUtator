const Mutation = require("../mutation");

function EHCOperator() {
}

EHCOperator.prototype.ID = "EHC";
EHCOperator.prototype.name = "exception-handling-statement-change";

EHCOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  const functions = ["require", "assert", "revert"];

  visit({
    FunctionCall: (node) => {
      if (functions.includes(node.expression.name)) {
        const start = node.range[0];
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;   

        //EHD - Exception Handling statement Deletion
        var temp = source.slice(start);
        var delimiter = temp.indexOf(";");
        var end = start + delimiter;
        replacement = "/* " + source.slice(start, end + 1) + " */";
        mutations.push(new Mutation(file, start, end + 1,startLine, endLine, replacement, this.ID));

        //EHR - Exception Handling statement Replacement
        var end = node.range[1];
        if (node.expression.name == "require") {
          const condition = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);
          replacement = "assert(" + condition + ")";
          mutations.push(new Mutation(file, start, end + 1,startLine, endLine, replacement, this.ID));
        }
        if (node.expression.name == "assert") {
          const condition = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);
          replacement = "require(" + condition + ")";
          mutations.push(new Mutation(file, start, end + 1,startLine, endLine, replacement, this.ID));
        }
      }
    }
  });
  return mutations;
};

module.exports = EHCOperator;
