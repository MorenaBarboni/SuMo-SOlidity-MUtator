const Mutation = require("../mutation");

function GVROperator() {
}

GVROperator.prototype.ID = "GVR";
GVROperator.prototype.name = "global-variable-replacement";

GVROperator.prototype.getMutations = function(file, source, visit) {

  const ID = this.ID;
  const mutations = [];

  visit({
    MemberAccess: (node) => {
      var keywords = ["timestamp", "number", "gasLimit", "difficulty", "gasprice", "value", "blockhash", "coinbase"];
      if (keywords.includes(node.memberName)) {
        const start = node.range[0];
        const end = node.range[1];
        const startLine = node.loc.start.line;
        const endLine = node.loc.start.line;   

        if (node.memberName === "value") {
          if (node.expression.name === "msg") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "tx.gasprice", ID));
          }
        } else if (node.expression.name === "block") {
          if (node.memberName === "difficulty") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.number", ID));
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.timestamp", ID));
          } else if (node.memberName === "number") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.difficulty", ID));
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.timestamp", ID));
          } else if (node.memberName === "timestamp") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.difficulty", ID));
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.number", ID));
          } else if (node.memberName === "coinbase") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "tx.origin", ID));
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "msg.sender", ID));
          } else if (node.memberName === "gaslimit") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "tx.gasprice", ID));
            mutations.push(new Mutation(file, start, end + 1,startLine, endLine,  "gasleft()", ID));
          }
        } else if (node.expression.name === "tx" && node.memberName === "gasprice") {
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "gasleft()", ID));
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.gaslimit", ID));
        }
      }
    }
  });

  visit({
    FunctionCall: (node) => {
      const start = node.range[0];
      const end = node.range[1];
      const startLine = node.loc.start.line;
      const endLine = node.loc.start.line;   
      if (node.expression.name) {
        if (node.expression.name === "gasleft") {
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "tx.gasprice", ID));
          mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "block.gaslimit", ID));
        } else {
          if (node.expression.name === "blockhash") {
            mutations.push(new Mutation(file, start, end + 1, startLine, endLine, "msg.sig", ID));
          }
        }
      }
    }
  });

  visit({
    Identifier: (node) => {
      //Alias for block.timestamp
      if (node.name === "now") {
        const start = node.range[0];
        const end = node.range[1];
        mutations.push(new Mutation(file, start, end + 1, "block.difficulty", ID));
        mutations.push(new Mutation(file, start, end + 1, "block.number", ID));
      }
    }
  });

  return mutations;
};
module.exports = GVROperator;
