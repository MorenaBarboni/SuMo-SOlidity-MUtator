const contractFunction = require('../contractFunction')

function contractFunctionVisitor() {}

contractFunctionVisitor.prototype.getFunctions = function(file, source, visit) {
  const functions = []

  visit({
    FunctionDefinition: (node) => {
     cf = new contractFunction(file, node.name, node.range[0], node.range[1]);
     functions.push(cf);
  }
  })
  return functions
}


module.exports = contractFunctionVisitor
