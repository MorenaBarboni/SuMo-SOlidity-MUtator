const Mutation = require("../mutation");

function HLRoperator() {
}

HLRoperator.prototype.ID = "HLR";
HLRoperator.prototype.name = "hexadecimal-literal-replacement";

HLRoperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    HexLiteral: (node) => {
      if (prevRange != node.range) { //Avoid duplicate mutants
        if (node.value) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine =  node.loc.start.line;
          const endLine =  node.loc.end.line;
          const original = source.slice(start, end);
          var randomHex = Math.floor(Math.random() * 16777215).toString(16);
          let replacement = "hex\"0\"";
          let replacement2 = "hex\"" + randomHex + "\"";

          mutations.push(new Mutation(file, start , end, startLine, endLine, original, replacement, this.ID));
          mutations.push(new Mutation(file, start , end, startLine, endLine, original, replacement2, this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = HLRoperator;
