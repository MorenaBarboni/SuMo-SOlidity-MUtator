const Mutation = require("../mutation");

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
        const start = node.range[0];
        const end = node.range[1];
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;   

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
              if (node.stateMutability !== "payable") {
                replacement = functionSignature.replace("public", "internal");
              }
              break;
            case "external":
              if (node.stateMutability !== "payable") {
                replacement = functionSignature.replace("external", "internal");
              }
              break;
            case "internal":
              replacement = functionSignature.replace("internal", "public");
              break;
            case "private":
              replacement = functionSignature.replace("private", "public");
              break;
          }
        }
        if (replacement)
          mutations.push(new Mutation(file, start, end, startLine, endLine, replacement, this.ID));
         }
    }
  });
  return mutations;
};

module.exports = FVROperator;
