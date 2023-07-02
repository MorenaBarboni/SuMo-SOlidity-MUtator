const Mutation = require("../../mutation");

function CBDOperator() {
  this.ID = "CBD";
  this.name = "catch-block-deletion";
}

CBDOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  visit({
    TryStatement: (node) => {
      if (node.catchClauses.length > 1) { //If there's more than 1 catch clause
        var start, end;
        var lineStart, lineEnd;
        node.catchClauses.forEach(c => {
          start = c.range[0];
          end = c.range[1] + 1;
          lineStart = c.loc.start.line;
          lineEnd = c.loc.end.line;
          var original = source.slice(start, end);
          var replacement = "";
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID));
        });
      }
    }
  });
  return mutations;
};

module.exports = CBDOperator;
