const Mutation = require("../../mutation");

function VVRoperator() {
  this.ID = "VVR";
  this.name = "variable-visibility-replacement";
}

VVRoperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    StateVariableDeclaration: (node) => {
      if (node.variables[0].typeName.type != "Mapping") {

        const start = node.range[0];
        const end = node.range[1];
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end)
        let replacement;
        var varDeclaration = source.substring(node.range[0], node.range[1]);

        switch (node.variables[0].visibility) {
          case "public":
            replacement = varDeclaration.replace("public", "internal");
            break;
          case "internal":
            replacement = varDeclaration.replace("internal", "public");
            break;
          case "private":
            replacement = varDeclaration.replace("private", "public");
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
            replacement = slice1 + "public" + slice2;
            break;
        }
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
      }
    }
  });
  return mutations;
};

module.exports = VVRoperator;
