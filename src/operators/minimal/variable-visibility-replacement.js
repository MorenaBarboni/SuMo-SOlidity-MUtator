
const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation')

class VVRoperator {
  constructor() {
    this.ID = "VVR";
    this.name = "variable-visibility-replacement";
  }
  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      StateVariableDeclaration: (node) => {
        if (node.variables[0]?.typeName?.type != "Mapping" &&
          node.variables[0]?.visibility !== "private") {

          const start = node.range[0];
          const end = node.range[1];
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const original = source.slice(start, end)
          let replacement;
          const functionName = contextChecker.getFunctionName(visit, startLine, endLine);

          var varDeclaration = source.substring(node.range[0], node.range[1]);

          //Only visibiliity restriction
          switch (node.variables[0].visibility) {
            case "public":
              replacement = varDeclaration.replace("public", "internal");
              break;
            case "internal":
              replacement = varDeclaration.replace("internal", "private");
              break;
            case "default": //No visibility specified
              var varName = node.variables[0].name.toString();
              if (node.variables[0].typeName.name) {  //Typename
                var varType = node.variables[0].typeName.name.toString();
              } else if (node.variables[0].typeName.namePath) { //User defined typename
                var varType = node.variables[0].typeName.namePath.toString();
              }
              var slice1 = varDeclaration.split(varName)[0];
              var slice2 = varDeclaration.split(varType)[1];
              replacement = slice1 + "private" + slice2;
              break;
          }
          pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });

    //Apply mutations
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}


module.exports = VVRoperator;