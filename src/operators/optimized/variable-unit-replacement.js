const Mutation = require("../../mutation");

function VUROperator() {
  this.ID = "VUR";
  this.name = "variable-unit-replacement";
}

VUROperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    NumberLiteral: (node) => {
      if (node.subdenomination) {
        if (prevRange != node.range) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const lineStart = node.loc.start.line;
          const lineEnd = node.loc.end.line;
          const original = source.slice(start, end);
          let replacement;

          switch (node.subdenomination) {
            //VURe - Ether Units Replacement
            case "wei":
              replacement = original.replace("wei", "ether");
              break;
            case 'gwei':
              replacement = original.replace('gwei', 'wei');
              break;
            case 'finney':
              replacement = original.replace('finney', 'wei');
              break;
            case 'szabo':
              replacement = original.replace('szabo', 'wei');
              break;
            case "ether":
              replacement = original.replace("ether", "wei");
              break;
            //VURt - Time Units Replacement
            case "seconds":
              replacement = original.replace("seconds", "minutes");
              break;
            case "minutes":
              replacement = original.replace("minutes", "hours");
              break;
            case "hours":
              replacement = original.replace("hours", "days");
              break;
            case "days":
              replacement = original.replace("days", "weeks");
              break;
            case "weeks":
              replacement = original.replace("weeks", "seconds");
              break;
            case "years":
              replacement = original.replace("years", "seconds");
          }
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID));
        }
        prevRange = node.range;
      }
    }
  });
  return mutations;
};

module.exports = VUROperator;
