const Mutation = require('../mutation')

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

        switch (node.memberName) {
          case 'add':
            replacement = text.replace('add', 'sub');
            break;
          case 'sub':
            replacement = text.replace('sub', 'add');
            break;
          case 'mul':
            replacement2 = text.replace('mul', 'div');
            break;
          case 'div':
            replacement = text.replace('div', 'mul');
            break;
          case 'mod':
            replacement = text.replace('mod', 'mul');
            break;
        }
        if (replacement) {
          mutations.push(new Mutation(file, start, end + 1, replacement, this.ID))
        }       
      }
    })
  }

  return mutations
}

module.exports = SFROperator
