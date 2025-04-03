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
              //Only mutate keywords to restrict visibility
              switch (node.visibility) {
                case "public":
                  replacement = original.replace("public", "external");
                  break;
                case "external":
                  replacement = original.replace("external", "internal");
                  break;
                case "internal":
                  replacement3 = original.replace("internal", "private");
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