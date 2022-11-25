const Mutation = require("../mutation");

function ECSOperator() {
}

ECSOperator.prototype.ID = "ECS";
ECSOperator.prototype.name = "explicit-conversion-to-smaller-type";

ECSOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var replacement, original;
  var prevRange;
  var start, end;
  var startLine, endLine;

  visit({
    FunctionCall: (node) => {
      if (node.expression.type === "TypeNameExpression") {
        if (prevRange != node.range) {
          var type = node.expression.typeName.name;
          start = node.range[0];
          end = node.range[1] + 1;
          startLine =  node.loc.start.line;
          endLine =  node.loc.end.line;
          original = source.slice(start, end);

          if (type.startsWith("uint") && type !== "uint8") {           
            replacement = original.replace(type, "uint8");
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
          } else if (type.startsWith("bytes") && type !== "bytes1") {
            replacement = original.replace(type, "bytes1");
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
          }
        }
        prevRange = node.range;
      }
    }
  });
  return mutations;
};

module.exports = ECSOperator;
