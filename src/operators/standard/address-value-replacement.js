const Mutation = require("../../mutation");

function AVROperator() {
  this.ID = "AVR";
  this.name = "address-value-replacement";
}

AVROperator.prototype.getMutations = function (file, source, visit) {

  const ID = this.ID;
  const mutations = [];

  var prevRange;
  var literalAddress = []; //Unique literal addresses
  var globalAddressNode = []; //All declared global addresses
  var functiondAddressNode = []; //All declared address within functions
  var declaredAddressIdentifiers = []; //All declared address identifiers

  visitStateAddress(mutateStateAddress);

  /*Visit and mutate all the address state variables */
  function visitStateAddress(callback) {
    visit({
      VariableDeclaration: (node) => {
        if (prevRange != node.range) {
          if (node.typeName.name === "address") {

            //Names of declared addresses
            if (!declaredAddressIdentifiers.includes(node.name)) {
              declaredAddressIdentifiers.push(node.name);
            }

            if (node.expression && node.expression.type == "Identifier") {
              globalAddressNode.push(node);

            } else if (node.expression && node.expression.type === "NumberLiteral") {
              var addrValue = parseInt(node.expression.number);
              globalAddressNode.push(node);
              if (addrValue !== 0 && (!literalAddress.includes(node.expression.number))) {
                literalAddress.push(node.expression.number);
              }
            } else if (node.expression && node.expression.type === "FunctionCall") {
              if (node.expression.arguments[0].type == "NumberLiteral") {
                var addrValue = parseInt(node.expression.arguments[0].number);
                var sliced = source.slice(node.expression.range[0], node.expression.range[1] + 1);
                if (addrValue !== 0 && (!literalAddress.includes(sliced))) {
                  literalAddress.push(sliced);
                }
              }
              globalAddressNode.push(node);
            }
          }
        }
        prevRange = node.range;
      }
    });
    callback();
  }

  /*Apply mutations*/
  function mutateStateAddress() {
    globalAddressNode.forEach(node => {
      if (node.expression && (node.expression.type === "NumberLiteral" || node.expression.type === "Identifier")) {
        mutateSimpleAddress(node.expression);
      }
    });
  }

  visitFunctionAddress(mutateFunctionAddress);

  /*Visit and mutate all the address variables declared within functions */
  function visitFunctionAddress(callback) {
    visit({
      VariableDeclarationStatement: (node) => {
        if (prevRange != node.range) {

          if (node.variables[0] && node.variables[0].typeName && node.variables[0].typeName.name == "address") {

            if (node.initialValue && node.initialValue.type == "Identifier") {
              functiondAddressNode.push(node.initialValue);
            }
            if (node.initialValue && node.initialValue.type == "NumberLiteral") {
              var addrValue = parseInt(node.initialValue.number);
              functiondAddressNode.push(node.initialValue);
              if (addrValue !== 0 && (!literalAddress.includes(node.initialValue.number))) {
                literalAddress.push(node.initialValue.number);
              }
            } else if (node.initialValue && node.initialValue.type == "FunctionCall") {
              if (node.initialValue.arguments[0]) {
                if (node.initialValue.arguments[0].type == "NumberLiteral") {
                  var addrValue = parseInt(node.initialValue.arguments[0].number);
                  var sliced = source.slice(node.initialValue.range[0], node.initialValue.range[1] + 1);
                  if (addrValue !== 0 && (!literalAddress.includes(sliced))) {
                    literalAddress.push(sliced);
                  }
                }
              }
              functiondAddressNode.push(node.initialValue);
            }
          }
        }
        prevRange = node.range;
      }
    });
    callback();
  }

  /*Apply mutations*/
  function mutateFunctionAddress() {
    functiondAddressNode.forEach(node => {
      if (node.type == "NumberLiteral" || node.type == "Identifier") {
        mutateSimpleAddress(node);
      } else if (node.type == "FunctionCall" && node.expression.memberName == "address") {
        mutateFunctionCall(node);
      }
    });
  }


  //Visit function calls
  visit({
    FunctionCall: (node) => {
      if (prevRange != node.range) {
        if (node.expression && node.expression.typeName && node.expression.typeName.name &&
          node.expression.typeName.name === "address") {
          mutateFunctionCall(node);
        }
        prevRange = node.range;
      }
    }
  });


  //Visit address assignments
  visit({
    BinaryOperation: (node) => {
      if (prevRange != node.range) {
        if (node.operator == "=") {
          //Mutate each address literal: a = 0x5acc...
          if (node.right.type === "NumberLiteral" && node.right.number.startsWith("0x") && node.right.number.length == 42) {
            mutateSimpleAddress(node.right);
          }
          //Mutate identifiers: a = owner
          else if (node.right.type === "Identifier" && declaredAddressIdentifiers.includes(node.left.name)) {
            mutateSimpleAddress(node.right);
          }
        }
        prevRange = node.range;
      }
    }
  });

  //Mutates simple literal addresses and identifiers
  function mutateSimpleAddress(node) {
    const start = node.range[0];
    var end = node.range[1] + 1;
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const original = source.slice(start, end)

    mutations.push(new Mutation(file, start, end, startLine, endLine, original, "address(this)", ID));
    mutations.push(new Mutation(file, start, end, startLine, endLine, original, "address(0)", ID));

    //Swap the literal address with each declared literal address
    literalAddress.forEach(a => {
      if (a !== node.number) {
        end = node.range[1] + 2;
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, a + ";", ID));
      }
    });
  }

  //Mutates address function calls
  function mutateFunctionCall(node) {
    const start = node.arguments[0].range[0];
    const end = node.arguments[0].range[1] + 1;
    const startLine = node.arguments[0].loc.start.line;
    const endLine = node.arguments[0].loc.end.line;
    const original = source.slice(start, end);

    var arg = node.arguments[0];
    var thisExpr = source.slice(node.range[0], node.range[1] + 1);

    //Mutate assignment to address(varName)
    if (arg.type === "Identifier" && arg.name !== "this") {
      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "this", ID));
      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "0", ID));
    }
    //Mutate assignment to address(this)
    else if (arg.type === "Identifier" && arg.name === "this") {
      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "0", ID));
    }

    //address(0x123)
    else if (arg.type === "NumberLiteral") {
      var addrValue = parseInt(arg.number);
      if (addrValue !== 0) {
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, "0", ID));
      }
      mutations.push(new Mutation(file, start, end, startLine, endLine, original, "this", ID));
    }
    //Swap the function with each declared address
    literalAddress.forEach(a => {
      if (a !== thisExpr) {
        var start = node.expression.range[0];
        var end = node.arguments[0].range[1] + 2;
        const startLine = node.expression.loc.start.line;
        const endLine = node.expression.loc.end.line;
        const original = source.slice(start, end);
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, a, ID));
      }
    });
  }

  return mutations;
};

module.exports = AVROperator;