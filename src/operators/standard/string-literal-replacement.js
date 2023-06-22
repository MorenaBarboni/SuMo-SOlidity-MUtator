const Mutation = require('../../mutation')

function SLRoperator() {
  this.ID = "SLR";
  this.name = "string-literal-replacement";
}

SLRoperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var prevRange;
  var importStatements = [];
  const excHandFunctions = ["require", "assert", "revert"];
  var ignoreIndexes = [];

  //retrieve indexes of exception handling functions to ignore
  visit({
    FunctionCall: (node) => {
      if (excHandFunctions.includes(node.expression.name)) {
        let ignore = {};
        const start = node.range[0];
        ignore.start = start;
        const temp = source.slice(start);
        const delimiter = temp.indexOf(";");
        ignore.end =  start + delimiter + 1;
        ignoreIndexes.push(ignore);
      }
    }
  });

  /*visit({
    EmitStatement: (node) => {
      let ignore = {};
      ignore.start = node.range[0];
      ignore.end = node.range[1] +1;
      ignoreIndexes.push(ignore);
    }
  });*/

  //retrieve import statements to ignore
  visit({
    ImportDirective: (node) => {
      importStatements.push(node.path);
    }
  });

  visit({
    StringLiteral: (node) => {
      if (prevRange != node.range) {
        if (node.value) {
          const start = node.range[0];
          const end = node.range[1] + 1;
          const startLine = node.loc.start.line;
          const endLine = node.loc.end.line;
          const original = source.slice(start, end);
          let mutate = true;

          if (!importStatements.includes(original.replaceAll("\"", ""))){
              for (let i = 0; i < ignoreIndexes.length; i++) {
                const e = ignoreIndexes[i];
                if(start >= e.start && end <= e.end){
                  mutate = false;
                  break;
                }               
              }       
              if(mutate){
                mutations.push(new Mutation(file, start, end, startLine, endLine, original, "\"\"", this.ID));
              }
          }
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = SLRoperator;
