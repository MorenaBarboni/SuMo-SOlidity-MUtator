const Mutation = require('../../mutation')

function GVROperator() { }

GVROperator.prototype.ID = 'GVR'
GVROperator.prototype.name = 'global-variable-replacement'

GVROperator.prototype.getMutations = function (file, source, visit) {
  const ID = this.ID
  const mutations = []

  visit({
    MemberAccess: (node) => {
      var keywords = ['timestamp', 'number', 'gasLimit', 'difficulty', 'gasprice', 'value', 'blockhash', 'coinbase']
      if (keywords.includes(node.memberName)) {
        const start = node.range[0]
        const end = node.range[1]

        if (node.memberName === 'value') {
          if (node.expression.name === 'msg') {
            mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
          }
        } else if (node.expression.name === 'block') {
          if (node.memberName === 'difficulty') {
            mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
          } else if (node.memberName === 'number') {
            mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
          } else if (node.memberName === 'timestamp') {
            mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
            mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
          }
          else if (node.memberName === 'coinbase') {
            mutations.push(new Mutation(file, start, end + 1, 'tx.origin', ID))
            mutations.push(new Mutation(file, start, end + 1, 'msg.sender', ID))
          }
          else if (node.memberName === 'gaslimit') {
            mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
            mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
            mutations.push(new Mutation(file, start, end + 1, 'block.timestamp', ID))
            mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
          }
        } else if (node.expression.name === 'tx' && node.memberName === 'gasprice') {
          mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.timestamp', ID))
          mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
        }
      }
    },
  })

  visit({
    FunctionCall: (node) => {
      const start = node.range[0]
      const end = node.range[1]
      if (node.expression.name) {
        if (node.expression.name === 'gasleft') {
          mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
          mutations.push(new Mutation(file, start, end + 1, 'block.timestamp', ID))
          mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
        } else {
          if (node.expression.name === 'blockhash') {
            mutations.push(new Mutation(file, start, end + 1, 'msg.sig', ID))
          }
        }
      }
    },
  })

  visit({
    Identifier: (node) => {
      //Alias for block.timestamp
      if (node.name === 'now') {
        const start = node.range[0]
        const end = node.range[1]
        mutations.push(new Mutation(file, start, end + 1, 'block.difficulty', ID))
        mutations.push(new Mutation(file, start, end + 1, 'block.number', ID))
        mutations.push(new Mutation(file, start, end + 1, 'block.gaslimit', ID))
        mutations.push(new Mutation(file, start, end + 1, 'msg.value', ID))
        mutations.push(new Mutation(file, start, end + 1, 'tx.gasprice', ID))
        mutations.push(new Mutation(file, start, end + 1, 'gasleft()', ID))
      }
    },
  })

  return mutations
}
module.exports = GVROperator
