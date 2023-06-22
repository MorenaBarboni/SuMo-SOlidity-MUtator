const Mutation = require('../../mutation')


function SCECOperator() {
  this.ID = "SCEC";
  this.name = "switch-call-expression-casting";
}

SCECOperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
  var contracts = [];
  var casts = [];
  var prevRange;

  /*Visit and save all user defined contract declarations */
  visit({
    VariableDeclaration: (node) => {
      if (node.typeName.type == "UserDefinedTypeName") {
        if (prevRange != node.range) {
          if (!contracts.includes(node.typeName.namePath)) {
            contracts.push(node.typeName.namePath);
          }
        }
        prevRange = node.range;
      }
    }
  });

  visitContractCast(mutate);

  function visitContractCast(callback) {
    //If there are at least two user defined contracts
    if (contracts.length > 1) {
      visit({
        VariableDeclarationStatement: (node) => {
          //If declaration of a user-defined contract
          if (node.initialValue && node.initialValue.expression && contracts.includes(node.initialValue.expression.name)) {
            //If it is a cast
            if (node.initialValue.arguments[0] && node.initialValue.arguments[0].type === "NumberLiteral" && node.initialValue.arguments[0].number.startsWith("0x")) {
              casts.push(node);
            }
          }
        }
      });
      //If there are at least two contract casting expressions
      if (casts.length > 1) {
        callback();
      }
    }
  }

  /*Callback to mutate contract casting */
  function mutate() {
    var start, end;
    var startLine, endLine;
    var original, replacement;
    
    //Address 1 - original
    casts.forEach(c1 => {
      start = c1.initialValue.arguments[0].range[0];
      end = c1.initialValue.arguments[0].range[1] + 1;

      startLine = c1.initialValue.arguments[0].loc.start.line;
      endLine = c1.initialValue.arguments[0].loc.end.line;
      original = source.slice(start, end);

      //Address 2 - replacement
      for (let i = 0; i < casts.length; i++) {
        replacement = casts[i].initialValue.arguments[0].number; 
        if (original !== replacement) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, "SCEC"));
          break;
        }        
      }
    });
  }

  return mutations;
};

module.exports = SCECOperator;