const Mutation = require('../../mutation')

function HLRoperator() {
  this.ID = "HLR";
  this.name = "hexadecimal-literal-replacement";
}

HLRoperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    HexLiteral: (node) => {
      if (prevRange != node.range) { //Avoid duplicate mutants
        if (node.value) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const original = source.slice(start, end);
          let hexToDecimal = parseInt(node.value, 16);
          let hexToDecimalIncrement = (hexToDecimal + 1).toString(16);
          let hexToDecimalDecrement = (hexToDecimal - 1).toString(16);

          //Even hex- nibbles
          if (hexToDecimalIncrement.length % 2 !== 0) {
            hexToDecimalIncrement = "0" + hexToDecimalIncrement
          }
          if (hexToDecimalDecrement.length % 2 !== 0) {
            hexToDecimalDecrement = "0" + hexToDecimalDecrement
          }

          let replacement = original.replace(node.value, hexToDecimalIncrement);
          let replacement2 = original.replace(node.value, hexToDecimalDecrement);

          if (hexToDecimal === 0) {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
          } else {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement2, this.ID));
          }
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = HLRoperator;
