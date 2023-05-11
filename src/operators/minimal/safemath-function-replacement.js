const Mutation = require("../../mutation");

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
        const startLine = node.loc.start.line;
        const endLine = node.loc.end.line;
        const original = source.slice(start, end);

        var replacement;

        switch (node.memberName) {
          case 'add':
            replacement = original.replace('add', 'sub');
            break;
          case 'sub':
            replacement = original.replace('sub', 'add');
            break;
          case 'mul':
            replacement = original.replace('mul', 'div');
            break;
          case 'div':
            replacement = original.replace('div', 'mul');
            break;
          case 'mod':
            replacement = original.replace('mod', 'mul');
            break;
        }
        if (replacement) {
          mutations.push(new Mutation(file, start, end, startLine, endLine, original, replacement, this.ID));
        }
      }
    });
  }
  return mutations;
};

module.exports = SFROperator;
