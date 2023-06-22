const Mutation = require('../../mutation')

function SFROperator() {
  this.ID = "SFR";
  this.name = "safemath-function-replacement";
}

SFROperator.prototype.getMutations = function (file, source, visit) {
  const mutations = [];
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
        const end = node.range[1] + 1;
        const lineStart = node.loc.start.line;
        const lineEnd = node.loc.end.line;
        const original = source.slice(start, end);

        var replacement, replacement2, replacement3, replacement4;

        switch (node.memberName) {
          case 'add':
            replacement = original.replace('add', 'sub');
            replacement2 = original.replace('add', 'div');
            replacement3 = original.replace('add', 'mul');
            replacement4 = original.replace('add', 'mod');

            break;
          case 'sub':
            replacement = original.replace('sub', 'add');
            replacement2 = original.replace('sub', 'div');
            replacement3 = original.replace('sub', 'mul');
            replacement4 = original.replace('sub', 'mod');
            break;
          case 'mul':
            replacement = original.replace('mul', 'add');
            replacement2 = original.replace('mul', 'div');
            replacement3 = original.replace('mul', 'sub');
            replacement4 = original.replace('mul', 'mod');
            break;
          case 'div':
            replacement = original.replace('div', 'mul');
            replacement2 = original.replace('div', 'add');
            replacement3 = original.replace('div', 'sub');
            replacement4 = original.replace('div', 'mod');
            break;
          case 'mod':
            replacement = original.replace('mod', 'mul');
            replacement2 = original.replace('mod', 'add');
            replacement3 = original.replace('mod', 'sub');
            replacement4 = original.replace('mod', 'div');
            break;
        }
        if (replacement) {
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement, this.ID))
        }
        if (replacement2) {
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement2, this.ID))
        }
        if (replacement3) {
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement3, this.ID))
        }
        if (replacement4) {
          mutations.push(new Mutation(file, start, end, lineStart, lineEnd, original, replacement4, this.ID))
        }
      }
    })

  }

  return mutations
}

module.exports = SFROperator
