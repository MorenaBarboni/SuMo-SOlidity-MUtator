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
      const start = node.range[0];
      const end = node.range[1] +1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.start.line;   
      if (prevRange != node.range) { //Avoid duplicate mutants
        if (node.value) {
          var randomHex = Math.floor(Math.random() * 16777215).toString(16);
          mutations.push(new Mutation(file, start, end, startLine, endLine, "hex\"0\"", this.ID));
          mutations.push(new Mutation(file, start, end, startLine, endLine, "hex\"" + randomHex + "\"", this.ID));
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = HLRoperator;
