const Mutation = require("../mutation");

function SCECOperator() {
}

SCECOperator.prototype.ID = "SCEC";
SCECOperator.prototype.name = "switch-call-expression-casting";

SCECOperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  var contracts = [];
  var casts = [];
  var prevRange;

  /*Visit and save all user defined contract declarations */
  visit({
    VariableDeclaration: (node) => {
      if (node.typeName.type == "UserDefinedTypeName") {
        if (prevRange != node.range) {
          contracts.push(node.typeName.namePath);
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
        FunctionCall: (node) => {
          if (contracts.includes(node.expression.name))
            casts.push(node);
        }
      });
    }
    //If there are at least two contract casting expressions
    if (casts.length > 1)
      callback();
  }

  /*Callback to mutate contract casting */
  function mutate() {
    var start;
    var end;
    var address;
    var address2;

    casts.forEach(c1 => {
      start = c1.arguments[0].range[0];
      end = c1.arguments[0].range[1];
      address = c1.arguments[0].number;
      casts.forEach(c2 => {
        address2 = c2.arguments[0].number;
        if (address !== address2) {
          mutations.push(new Mutation(file, start, end + 1, address2, this.ID));
        }
      });
    });
  }

  return mutations;
};

module.exports = SCECOperator;
