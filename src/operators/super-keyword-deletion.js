const Mutation = require("../mutation");

function SKDOperator() {
}

SKDOperator.prototype.ID = "SKD";
SKDOperator.prototype.name = "super-keyword-deletion";

SKDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];


  visit({
    ContractDefinition: (node) => {
      if (node.baseContracts.length > 0)
        visit({
          MemberAccess: (node) => {
            if (node.expression.name == "super") {
              var start = node.expression.range[0];
              var end = node.expression.range[1];
              mutations.push(new Mutation(file, start, end + 2, "", this.ID));
            }
          }
        });
    }
  });
  return mutations;
};

module.exports = SKDOperator;
