const Mutation = require("../mutation");

function SLRoperator() {
}

SLRoperator.prototype.ID = "SLR";
SLRoperator.prototype.name = "string-literal-replacement";

SLRoperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var prevRange;

  var importStatements = [];

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
          const original = source.slice(start, end);
          if (!importStatements.includes(original.replaceAll("\"", ""))) {
            mutations.push(new Mutation(file, start, end, "\"\"", this.ID));
          }
        }
      }
      prevRange = node.range;
    }
  });
  return mutations;
};

module.exports = SLRoperator;
