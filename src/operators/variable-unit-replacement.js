const Mutation = require("../mutation");

function VUROperator() {
}

VUROperator.prototype.ID = "VUR";
VUROperator.prototype.name = "variable-unit-replacement";

VUROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var prevRange;

  visit({
    NumberLiteral: (node) => {
      if (node.subdenomination) {
        if (prevRange != node.range) {
          const start = node.range[0];
          const end = node.range[1];
          var replacement = source.slice(start, end + 1);

          switch (node.subdenomination) {
            //VURe - Ether Units Replacement
            case "wei":
              replacement = replacement.replace("wei", "ether");
              break;
            case "ether":
              replacement = replacement.replace("ether", "wei");
              break;
            //VURt - Time Units Replacement
            case "seconds":
              replacement = replacement.replace("seconds", "minutes");
              break;
            case "minutes":
              replacement = replacement.replace("minutes", "hours");
              break;
            case "hours":
              replacement = replacement.replace("hours", "days");
              break;
            case "days":
              replacement = replacement.replace("days", "weeks");
              break;
            case "weeks":
              replacement = replacement.replace("weeks", "seconds");
              break;
            case "years":
              replacement = replacement.replace("years", "seconds");
          }
          mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
        }
        prevRange = node.range;
      }
    }
  });
  return mutations;
};

module.exports = VUROperator;
