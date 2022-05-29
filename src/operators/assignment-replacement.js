const Mutation = require("../mutation");

function AOROperator() {
}

AOROperator.prototype.ID = "AOR";
AOROperator.prototype.name = "assignment-operator-replacement";

AOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    BinaryOperation: (node) => {
      const start = node.left.range[1] + 1;
      const end = node.right.range[0];
      const text = source.slice(start, end);

      let replacement;
      let replacement2;

      switch (node.operator) {
        case "+=":
          replacement = text.replace("+=", "-=");
          replacement2 = text.replace("+=", " =");
          break;
        case "-=":
          replacement = text.replace("-=", "+=");
          replacement2 = text.replace("-=", " =");
          break;
        case "*=":
          replacement = text.replace("*=", "/=");
          replacement2 = text.replace("*=", " =");
          break;
        case "/=":
          replacement = text.replace("/=", "*=");
          replacement2 = text.replace("/=", " =");
          break;
        case "%=":
          replacement = text.replace("%=", "*=");
          replacement2 = text.replace("%=", " =");
          break;
        case "<<=":
          replacement = text.replace("<<=", ">>=");
          replacement2 = text.replace("<<=", " =");
          break;
        case ">>=":
          replacement = text.replace(">>=", "<<=");
          replacement2 = text.replace(">>=", " =");
          break;
        case "|=":
          replacement = text.replace("|=", "&=");
          replacement2 = text.replace("|=", " =");
          break;
        case "&=":
          replacement = text.replace("&=", "|=");
          replacement2 = text.replace("&=", " =");
          break;
        case "^=":
          replacement = text.replace("^=", "&=");
          replacement2 = text.replace("^=", " =");
          break;
      }

      if (replacement)
        mutations.push(new Mutation(file, start, end, replacement, this.ID));
      if (replacement2)
        mutations.push(new Mutation(file, start, end, replacement2, this.ID));

    }
  });

  return mutations;
};

module.exports = AOROperator;
