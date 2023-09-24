const Mutation = require('../../mutation')

function ECSOperator() {
  this.ID = "ECS";
  this.name = "explicit-conversion-to-smaller-type";
}

ECSOperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var replacement, original, start, end, startLine, endLine;

  visit({
    FunctionCall: (node) => {
      if (node.expression.type === "ElementaryTypeName") {
        var type = node.expression.name;
        start = node.range[0];
        end = node.range[1] + 1;
        startLine = node.loc.start.line;
        endLine = node.loc.end.line;
        original = source.slice(start, end);

        if (type.startsWith("uint") && type !== "uint8") {
          replacement = original.replace(type, "uint8");
          pushMutation(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
        else if (type.startsWith("int") && type !== "int8") {
          replacement = original.replace(type, "int8");
          pushMutation(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
        else if (type.startsWith("bytes") && type !== "bytes1") {
          replacement = original.replace(type, "bytes1");
          pushMutation(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
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
};

module.exports = ECSOperator;
