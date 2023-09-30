const Mutation = require('../../mutation')

function ILROperator() {
  this.ID = "ILR";
  this.name = "integer-literal-replacement";
}

ILROperator.prototype.getMutations = function (file, source, visit) {

  const ID = this.ID;
  const mutations = [];

  var prevRange;
  var ranges = []; //Visited node ranges

  visit({
    TupleExpression: (node) => {
      if (node.isArray) {
        if (node.components[0] && node.components[0].type == "NumberLiteral") {
          if (!ranges.includes(node.range)) {
            //Array range
            ranges.push(node.range);
            //Mutate the first component and exclude subsequent components
            mutateIntegerLiteral(node.components[0]);
            node.components.forEach(e => {
              //Component range
              ranges.push(e.range);
            });
          }
        }
      }
    }
  });

  //Visit number literals
  visit({
    NumberLiteral: (node) => {
      if (!ranges.includes(node.range)) {
        ranges.push(node.range);
        mutateIntegerLiteral(node);
      }
      prevRange = node.range;
    }
  });

  //Apply mutations
  function mutateIntegerLiteral(node) {
    let value = node.number.toString();
    //Check if it is hex
    if (!value.match(/^0x[0-9a-f]+$/i)) {
      if (node.number % 1 == 0) {
        var subdenomination = "";
        var start = node.range[0];
        var end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        var original = source.slice(start, end);

        if (node.subdenomination) {
          subdenomination = " " + node.subdenomination;
        }
        if (node.number.toString().includes('e') || node.number.toString().includes('E')) {
          //Scientific notation
          pushMutation(new Mutation(file, start, end, startLine, endLine, original, original + " + 1", ID));
          pushMutation(new Mutation(file, start, end, startLine, endLine, original, original + " - 1", ID));
        } else {
          if (node.number == 1) {
            var sliced = source.slice(node.range[0] - 1, node.range[0]);
            if (sliced === "-") {
              start = node.range[0] - 1;
              original = source.slice(start, end);
              pushMutation(new Mutation(file, start, end, startLine, endLine, original, "0" + subdenomination, ID));
              pushMutation(new Mutation(file, start, end, startLine, endLine, original, "-2" + subdenomination, ID));
            }
            else {
              pushMutation(new Mutation(file, start, end, startLine, endLine, original, "0" + subdenomination, ID));
              pushMutation(new Mutation(file, start, end, startLine, endLine, original, "2" + subdenomination, ID));
            }
          } else if (node.number == 0) {
            pushMutation(new Mutation(file, start, end, startLine, endLine, original, "1" + subdenomination, ID));
          } else {
            var num = Number(node.number);
            var inc;
            var dec;

            if (num < Number.MAX_SAFE_INTEGER) {
              inc = num + 1;
              dec = num - 1;
            }

            pushMutation(new Mutation(file, start, end, startLine, endLine, original, dec + subdenomination, ID));
            pushMutation(new Mutation(file, start, end, startLine, endLine, original, inc + subdenomination, ID));
          }
        }
      }
    }
  }

  /**
 * Add a mutation to the mutations list
 * @param {*} mutation the mutation object
 */
  function pushMutation(mutation) {
    if (!mutations.find(m => m.id === mutation.id)) {
      mutations.push(mutation);
    }
  }

  return mutations;
};


module.exports = ILROperator;
