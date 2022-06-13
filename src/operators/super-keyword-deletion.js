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
              const start = node.expression.range[0];
              const end = node.expression.range[1];
              const startLine = node.loc.start.line;
              const endLine = node.loc.end.line;   
              mutations.push(new Mutation(file, start, end + 2, startLine, endLine, "", this.ID));
            }
          }
        });
    }
  });
  return mutations;
};

module.exports = SKDOperator;
