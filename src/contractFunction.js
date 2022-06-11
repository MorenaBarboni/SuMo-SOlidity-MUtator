
function contractFunction(file, name, start, end) {
    this.file = file
    this.name = name
    this.start = start
    this.end = end
  }
  
  contractFunction.prototype.containsMutation = function (mutation) {
    
  }
  
  
  module.exports = contractFunction
  