const Mutation = require("../mutation");

function SFROperator() {
}

SFROperator.prototype.ID = "SFR";
SFROperator.prototype.name = "safemath-function-replacement";

SFROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    MemberAccess: (node) => {
      if (node.expression.name === "SafeMath") {
        const start = node.range[0];
        const end = node.range[1];
        var replacement = source.slice(start, end + 1);

        switch (node.memberName) {
          case "add":
            replacement = replacement.replace("add", "sub");
            break;
          case "sub":
            replacement = replacement.replace("sub", "add");
            break;
          case "mul":
            replacement = replacement.replace("mul", "div");
            break;
          case "div":
            replacement = replacement.replace("div", "mul");
            break;
          case "mod":
            replacement = replacement.replace("mod", "mul");
            break;
        }
        mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));

      }
    }
  });
  return mutations;
};

module.exports = SFROperator;
