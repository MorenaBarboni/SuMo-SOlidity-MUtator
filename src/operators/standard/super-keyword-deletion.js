const Mutation = require('../../mutation')

function SKDOperator() {
  this.ID = "SKD";
  this.name = "super-keyword-deletion";
}

SKDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];


  visit({
    ContractDefinition: (node) => {
      if (node.baseContracts.length > 0)
        visit({
          MemberAccess: (node) => {
            if (node.expression.name == "super") {
              var start = node.expression.range[0];
              var end = node.expression.range[1] + 2;

              const startLine = node.expression.loc.start.line;
              const endLine = node.expression.loc.end.line;
              const original = source.slice(start, end);

              let mutation = new Mutation(file, start, end, startLine, endLine, original,  "", this.ID);
              if (mutations.filter(m => m.hash() === mutation.hash()).length === 0) {
                mutations.push(mutation);
              }  
            }
          }
        });
    }
  });
  return mutations;
};

module.exports = SKDOperator;
