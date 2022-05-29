const Mutation = require('../../mutation')

function FVROperator() {
}

FVROperator.prototype.ID = "FVR";
FVROperator.prototype.name = "function-visibility-replacement";

FVROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      if (!node.isReceiveEther && !node.isFallback && !node.isVirtual && node.override == null) {
        let replacement;
        let replacement2;
        let replacement3;

        var functionSignature = source.substring(node.range[0], node.range[1]);

        //Constructor
        if (node.isConstructor) {
          if (node.visibility === "public") {
            replacement = functionSignature.replace("public", "internal");
          } else if (node.visibility === "internal") {
            replacement = functionSignature.replace("internal", "public");
          }
        }
        //Standard function
        else {
          switch (node.visibility) {
            case "public":
              replacement = functionSignature.replace("public", "external");
              if (node.stateMutability !== "payable") {
                replacement2 = functionSignature.replace("public", "internal");
                replacement3 = functionSignature.replace("public", "private");
              }
              break;
            case "external":
              replacement = functionSignature.replace("external", "public");
              if (node.stateMutability !== "payable") {
                replacement2 = functionSignature.replace("external", "internal");
                replacement3 = functionSignature.replace("external", "private");
              }
              break;
            case "internal":
              replacement = functionSignature.replace("internal", "public");
              replacement2 = functionSignature.replace("internal", "external");
              replacement3 = functionSignature.replace("internal", "private");
              break;
            case "private":
              replacement = functionSignature.replace("private", "public");
              replacement2 = functionSignature.replace("private", "external");
              replacement3 = functionSignature.replace("private", "internal");
              break;
          }
        }
        if (replacement)
          mutations.push(new Mutation(file, node.range[0], node.range[1], replacement, this.ID));
        if (replacement2)
          mutations.push(new Mutation(file, node.range[0], node.range[1], replacement2, this.ID));
        if (replacement3)
          mutations.push(new Mutation(file, node.range[0], node.range[1], replacement3, this.ID));

      }
    }
  });
  return mutations;
};

module.exports = FVROperator;
