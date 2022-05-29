const Mutation = require("../mutation");

function SFIOperator() {
}

SFIOperator.prototype.ID = "SFI";
SFIOperator.prototype.name = "selfdestruct-function-insertion";

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
              var replacement = source.slice(func.body.range[0], func.body.range[0] + 1);  //Start of function body {
              replacement = replacement + " " + selfDestruct;
              mutations.push(new Mutation(file, func.body.range[0], func.body.range[0] + 1, replacement, this.ID));
            }
          }
        }
      });

    }
  });

  return mutations;
};

module.exports = SFIOperator;
