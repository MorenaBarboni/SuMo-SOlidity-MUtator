const Mutation = require("../mutation");

function TOROperator() {
}

TOROperator.prototype.ID = "TOR";
TOROperator.prototype.name = "transaction-origin-replacement";

TOROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];

  visit({
    MemberAccess: (node) => {
      const start = node.range[0];
      const end = node.range[1] +1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;  
      if ((node.memberName == "origin")) {
        mutations.push(new Mutation(file, start, end, startLine, endLine, "msg.sender", this.ID));
      } else if (node.memberName == "sender") {
        mutations.push(new Mutation(file, start, end, startLine, endLine, "tx.origin", this.ID));
      }
    }
  });

  return mutations;
};
module.exports = TOROperator;
