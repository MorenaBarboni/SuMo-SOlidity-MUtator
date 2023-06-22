const Mutation = require('../../mutation')

function GVROperator() {
  this.ID = "GVR";
  this.name = "global-variable-replacement";
}

GVROperator.prototype.getMutations = function (file, source, visit) {
  const ID = this.ID
  const mutations = []

  visit({
    MemberAccess: (node) => {
      var keywords = ['timestamp', 'number', 'gasLimit', 'difficulty', 'gasprice', 'value', 'blockhash', 'coinbase']
      if (keywords.includes(node.memberName)) {
        const start = node.range[0];
        const end = node.range[1] + 1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end)

        if (node.memberName === 'value') {
          if (node.expression.name === 'msg') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
          }
        } else if (node.expression.name === 'block') {
          if (node.memberName === 'difficulty') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
          } else if (node.memberName === 'number') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
          } else if (node.memberName === 'timestamp') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
          }
          else if (node.memberName === 'coinbase') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.origin', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.sender', ID))
          }
          else if (node.memberName === 'gaslimit') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
          }
        } else if (node.expression.name === 'tx' && node.memberName === 'gasprice') {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.timestamp', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
        }
      }
    },
  })

  visit({
    FunctionCall: (node) => {
      const start = node.range[0];
      const end = node.range[1] +1;
      const startLine = node.loc.start.line;
      const endLine = node.loc.end.line;
      const original = source.slice(start, end);
      if (node.expression.name) {
        if (node.expression.name === 'gasleft') {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.timestamp', ID))
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
        } else {
          if (node.expression.name === 'blockhash') {
            mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.sig', ID))
          }
        }
      }
    },
  })

  visit({
    Identifier: (node) => {
      //Alias for block.timestamp
      if (node.name === 'now') {
        const start = node.range[0];
        const end = node.range[1] +1;
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end);
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.difficulty', ID))
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.number', ID))
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'block.gaslimit', ID))
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'msg.value', ID))
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'tx.gasprice', ID))
        mutations.push(new Mutation(file, start, end, startLine, endLine, original, 'gasleft()', ID))
      }
    },
  })

  return mutations
}
module.exports = GVROperator
