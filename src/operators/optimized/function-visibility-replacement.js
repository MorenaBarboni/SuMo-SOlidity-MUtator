const Mutation = require("../../mutation");

function FVROperator() {
  this.ID = "FVR";
  this.name = "function-visibility-replacement";
}

FVROperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];

  visit({
    FunctionDefinition: (node) => {
      if (!node.isReceiveEther && !node.isFallback && !node.isVirtual && node.override == null) {
        if (node.body) {
          const start = node.range[0];
          const end = node.body.range[0];
          const startLine = node.loc.start.line;
          const endLine = node.body.loc.start.line;
          const original = source.substring(start, end); //function signature  
          let replacement;

          //Constructor
          if (node.isConstructor) {
            if (node.visibility === "public") {
              replacement = original.replace("public", "internal");
            } else if (node.visibility === "internal") {
              replacement = original.replace("internal", "public");
            }
          }
          //Standard function
          else {
            switch (node.visibility) {
              case "public":
                if (node.stateMutability !== "payable") {
                  replacement = original.replace("public", "internal");
                }
                break;
              case "external":
                if (node.stateMutability !== "payable") {
                  replacement = original.replace("external", "internal");
                }
                break;
              case "internal":
                replacement = original.replace("internal", "public");
                break;
              case "private":
                replacement = original.replace("private", "public");
                break;
            }
          }
          if (replacement)
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    }
  });
  return mutations;
};

module.exports = FVROperator;
