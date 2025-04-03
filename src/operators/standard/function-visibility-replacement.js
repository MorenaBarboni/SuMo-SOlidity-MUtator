const contextChecker = require("../contextChecker");
const Mutation = require("../../mutation");

class FVROperator {
  constructor() {
    this.ID = "FVR";
    this.name = "function-visibility-replacement";
  }
  getMutations(file, source, visit) {
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
            const functionName = node.name;
            let replacement, replacement2, replacement3;

            //Standard function
            if (!node.isConstructor) {
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
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
            if (replacement2)
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
            if (replacement3)
              pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement3, this.ID));
          }
        }
      }
    });

    /**
      * Push a mutation to the generated mutations list
      * @param {Object} mutation the mutation
       */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }
    return mutations;
  }
}
module.exports = FVROperator;