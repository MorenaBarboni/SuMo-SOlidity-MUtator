const Mutation = require('../../mutation')

function SFROperator() { }

SFROperator.prototype.ID = 'SFR'
SFROperator.prototype.name = 'safemath-function-replacement'

SFROperator.prototype.getMutations = function (file, source, visit) {
  const mutations = []

  var isUsingSafeMath = false;

  visit({
    ImportDirective: (node) => {
      if (node.path.includes('SafeMath'))
        isUsingSafeMath = true;
    }
  });

  if (isUsingSafeMath) {
    visit({
      MemberAccess: (node) => {

        const start = node.range[0];
        const end = node.range[1];
        var text = source.slice(start, end + 1);

        var replacement;
        var replacement2; 
        var replacement3;
        var replacement4; 

        switch (node.memberName) {
          case 'add':
            replacement = text.replace('add', 'sub');
            replacement2 = text.replace('add', 'div');
            replacement3 = text.replace('add', 'mul');
            replacement4 = text.replace('add', 'mod');
            break;
          case 'sub':
            replacement = text.replace('sub', 'add');
            replacement2 = text.replace('sub', 'div');
            replacement3 = text.replace('sub', 'mul');
            replacement4 = text.replace('sub', 'mod');
            break;
          case 'mul':
            replacement = text.replace('mul', 'add');
            replacement2 = text.replace('mul', 'div');
            replacement3 = text.replace('mul', 'sub');
            replacement4 = text.replace('mul', 'mod');
            break;
          case 'div':
            replacement = text.replace('div', 'mul');
            replacement2 = text.replace('div', 'add');
            replacement3 = text.replace('div', 'sub');
            replacement4 = text.replace('div', 'mod');
            break;
          case 'mod':
            replacement = text.replace('mod', 'mul');
            replacement2 = text.replace('mod', 'add');
            replacement3 = text.replace('mod', 'sub');
            replacement4 = text.replace('mod', 'div');
            break;
        }
        if (replacement) {
          mutations.push(new Mutation(file, start, end + 1, replacement, this.ID))
        }
        if (replacement2) {
          mutations.push(new Mutation(file, start, end + 1, replacement2, this.ID))
        }
        if (replacement3) {
          mutations.push(new Mutation(file, start, end + 1, replacement3, this.ID))
        }
        if (replacement4) {
          mutations.push(new Mutation(file, start, end + 1, replacement4, this.ID))
        }
      }
    })
  }

  return mutations
}

module.exports = SFROperator
