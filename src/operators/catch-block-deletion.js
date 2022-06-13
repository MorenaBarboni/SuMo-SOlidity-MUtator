const Mutation = require("../mutation");

function CBDOperator() {
}

CBDOperator.prototype.ID = "CBD";
CBDOperator.prototype.name = "catch-block-deletion";

CBDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  visit({
    TryStatement: (node) => {
      if (node.catchClauses.length > 1) { //If there's more than 1 catch clause    
        node.catchClauses.forEach(c => {
          var start = c.range[0];
          var end = c.range[1];
          var startLine = node.loc.start.line;
          var endLine = node.loc.end.line;
          var text = source.slice(start, end + 1);
          var replacement = "/*" + text + "*/";
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
        });
      }
    }
  });
  return mutations;
};

module.exports = CBDOperator;
