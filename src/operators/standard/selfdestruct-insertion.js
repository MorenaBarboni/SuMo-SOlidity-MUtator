const Mutation = require('../../mutation')

function SFIOperator() {
  this.ID = "SFI";
  this.name = "selfdestruct-function-insertion";
}

SFIOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      var func = node;
      visit({
        FunctionCall: (node) => {
          if (node.expression.name == "selfdestruct") {
            var selfDestruct = source.slice(node.range[0], node.range[1] + 1) + ";";

            if (node.range[0] >= func.range[0] && node.range[1] <= func.range[1]) {

              const start = func.body.range[0];
              const end = func.body.range[0] + 1;
              const startLine = func.body.loc.start.line;
              const endLine = func.body.loc.end.line; 
              const original = source.slice(start, end);  //Start of function body {
              const replacement = original + " " + selfDestruct;
              mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
            }
          }
        }
      });

    }
  });

  return mutations;
};

module.exports = SFIOperator;
