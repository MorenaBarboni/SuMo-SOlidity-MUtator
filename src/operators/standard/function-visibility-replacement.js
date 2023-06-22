const Mutation = require('../../mutation')

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
          let replacement2;
          let replacement3;

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
                replacement = original.replace("public", "external");
                if (node.stateMutability !== "payable") {
                  replacement2 = original.replace("public", "internal");
                  replacement3 = original.replace("public", "private");
                }
                break;
              case "external":
                replacement = original.replace("external", "public");
                if (node.stateMutability !== "payable") {
                  replacement2 = original.replace("external", "internal");
                  replacement3 = original.replace("external", "private");
                }
                break;
              case "internal":
                replacement = original.replace("internal", "public");
                replacement2 = original.replace("internal", "external");
                replacement3 = original.replace("internal", "private");
                break;
              case "private":
                replacement = original.replace("private", "public");
                replacement2 = original.replace("private", "external");
                replacement3 = original.replace("private", "internal");
                break;
            }
          }
          if (replacement)
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
          if (replacement2)
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement2, this.ID));
          if (replacement3)
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement3, this.ID));
        }
      }
    }
  });
  return mutations;
};

module.exports = FVROperator;
