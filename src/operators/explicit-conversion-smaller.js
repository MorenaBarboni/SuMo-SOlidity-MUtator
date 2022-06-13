const Mutation = require("../mutation");

function ECSOperator() {
}

ECSOperator.prototype.ID = "ECS";
ECSOperator.prototype.name = "explicit-conversion-to-smaller-type";

ECSOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var replacement;
  var prevRange;

  visit({
    FunctionCall: (node) => {
      if (node.expression.type === "TypeNameExpression") {
        if (prevRange != node.range) {
          var type = node.expression.typeName.name;
          const start = node.range[0];
          const end = node.range[1];
          const startLine = node.loc.start.line;
          const endLine = node.loc.start.line;   

          if (type.startsWith("uint") && type !== "uint8") {                    
            var text = source.slice(start, end + 1);
            replacement = text.replace(type, "uint8");
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
          } else if (type.startsWith("bytes") && type !== "bytes1") {
            var text = source.slice(start, end + 1);
            replacement = text.replace(type, "bytes1");
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, replacement, this.ID));
          }
        }
        prevRange = node.range;
      }
    }
  });
  return mutations;
};

module.exports = ECSOperator;
