const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation')

class EROperator {
  constructor() {
    this.ID = "ER";
    this.name = "enum-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];

    visit({
      EnumDefinition: (node) => {

        const thisEnum = node;

        //Enum Replacement - Member
        visit({
          MemberAccess: (node) => {

            if (node.expression.name === thisEnum.name) {
              const start = node.range[0];
              const end = node.range[1] + 1;
              const startLine = node.loc.start.line;
              const endLine = node.loc.end.line;
              const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
              const original = source.slice(start, end);

              //Replace a member with a single existing member
              for (let i = 0; i < thisEnum.members.length; i++) {
                if (thisEnum.members[i].name !== node.memberName) {
                  var replacement = original.replace(node.memberName, thisEnum.members[i].name);
                  pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                  break;
                }
              }
            }
          }
        });
      }
    });

    /**
     * Push a mutation to the generated mutations list
     * @param {Object} mutation the mutation
    */
    function pushMutation(mutation) {
      if (!mutations.find(m => m.id === mutation.id)) {
        mutations.push(mutation);
      }
    }

    return mutations;
  }
}

module.exports = EROperator
