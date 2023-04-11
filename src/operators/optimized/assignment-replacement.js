const Mutation = require("../../mutation");

function AOROperator() {
  this.ID = "AOR";
  this.name = "assignment-operator-replacement";
}

AOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    BinaryOperation: (node) => {
      const start = node.left.range[1] + 1;
      const end = node.right.range[0];
      const startLine =  node.left.loc.end.line;
      const endLine =  node.right.loc.start.line;
      const original = source.slice(start, end);
       let replacement, replacement2;

      switch (node.operator) {
        case "+=":
          replacement = original.replace("+=", "-=");
          replacement2 = original.replace("+=", " =");
          break;
        case "-=":
          replacement = original.replace("-=", "+=");
          replacement2 = original.replace("-=", " =");
          break;
        case "*=":
          replacement = original.replace("*=", "/=");
          replacement2 = original.replace("*=", " =");
          break;
        case "/=":
          replacement = original.replace("/=", "*=");
          replacement2 = original.replace("/=", " =");
          break;
        case "%=":
          replacement = original.replace("%=", "*=");
          replacement2 = original.replace("%=", " =");
          break;
        case "<<=":
          replacement = original.replace("<<=", ">>=");
          replacement2 = original.replace("<<=", " =");
          break;
        case ">>=":
          replacement = original.replace(">>=", "<<=");
          replacement2 = original.replace(">>=", " =");
          break;
        case "|=":
          replacement = original.replace("|=", "&=");
          replacement2 = original.replace("|=", " =");
          break;
        case "&=":
          replacement = original.replace("&=", "|=");
          replacement2 = original.replace("&=", " =");
          break;
        case "^=":
          replacement = original.replace("^=", "&=");
          replacement2 = original.replace("^=", " =");
          break;
      }

      if (replacement)
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      if (replacement2)
        mutations.push(new Mutation(file, start, end,  startLine, endLine, original, replacement2, this.ID));
 
    }
  });

  return mutations;
};

module.exports = AOROperator;
