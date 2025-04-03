const contextChecker = require("../contextChecker");
const Mutation = require('../../mutation')

class ETROperator {
  constructor() {
    this.ID = "ETR";
    this.name = "ether-transfer-function-replacement";
  }

  getMutations(file, source, visit) {
    const mutations = [];
    const functions = ["transfer", "transferFrom", "send", "call"];

    visit({
      FunctionCall: (node) => {

        if ((node.expression.type == "MemberAccess" || (node.expression.expression && node.expression.expression.type == "MemberAccess"))) {
          if (functions.includes(node.expression.memberName) || functions.includes(node.expression.expression.memberName)) {

            //Call methods with gas or value - ex: call{value:...,gas:...}("")
            if (node.expression.expression && functions.includes(node.expression.expression.memberName)) {

              var replacement, replacement2;
              const start = node.range[0];
              const end = node.range[1] + 1;
              const startLine = node.loc.start.line;
              const endLine = node.loc.end.line;
              const original = source.slice(start, end);
              const functionName = contextChecker.getFunctionName(visit, startLine, endLine);
              
              const addressStart = node.expression.expression.expression.range[0];
              const addressEnd = node.expression.expression.expression.range[1];
              const address = source.slice(addressStart, addressEnd + 1);
              const callArguments = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);

              //Exclude old call() syntax
              if (node.expression.arguments) {
                const valueArguments = source.slice(node.expression.arguments.range[0], node.expression.arguments.range[1] + 1);
                if (node.expression.expression.memberName === "call") {

                  const nameValueList = node.expression.arguments.names;
                  let gas;
                  let gasIndex = nameValueList.indexOf("gas");
                  if (gasIndex != -1) { //If the call has a gas argument
                    gas = node.expression.arguments.arguments[gasIndex].number;
                  }

                  replacement = address + ".delegatecall";
                  replacement2 = address + ".staticcall";
                  if (gas) {
                    replacement = replacement + "{gas:" + gas + "}";
                    replacement2 = replacement2 + "{gas:" + gas + "}";
                  }
                  replacement = replacement + "(" + callArguments + ")";
                  replacement2 = replacement2 + "(" + callArguments + ")";

                  pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                  pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));


                } else if (node.expression.expression.memberName === "delegatecall") {

                  replacement = address + ".call" + "{" + valueArguments + "}" + "(" + callArguments + ")";
                  replacement2 = address + ".staticcall" + "{" + valueArguments + "}" + "(" + callArguments + ")";

                  pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                  pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));

                } else if (node.expression.expression.memberName === "staticcall") {

                  replacement = address + ".call" + "{" + valueArguments + "}" + "(" + callArguments + ")";
                  replacement2 = address + ".delegatecall" + "{" + valueArguments + "}" + "(" + callArguments + ")";

                  pushMutation(new Mutation(file, functionName, start, startLine, endLine, original, end, replacement, this.ID));
                  pushMutation(new Mutation(file, functionName, start, startLine, endLine, original, end, replacement2, this.ID));
                }
              }
            }
            //Send, transfer, and call methods with no Ether value or Gas value supplied - ex: call("")
            else {

              var start = node.expression.range[0];
              var end = node.expression.range[1] + 1;
              var startLine = node.expression.loc.start.line;
              var endLine = node.expression.loc.end.line;
              let original = source.slice(start, end);
              let replacement, replacement2;
              var functionName = contextChecker.getFunctionName(visit, startLine, endLine);

              const addressStart = node.expression.expression.range[0];
              const addressEnd = node.expression.expression.range[1];
              const address = source.slice(addressStart, addressEnd + 1);

              var arg;
              if (node.arguments[0]) {
                if (node.arguments[0].type === "NumberLiteral") {
                  arg = node.arguments[0].number;
                } else if (node.arguments[0].type === "Identifier") {
                  arg = node.arguments[0].name;
                } else if (node.arguments[0].type === "MemberAccess" || node.arguments[0].type === "FunctionCall") {
                  var argStart = node.arguments[0].range[0];
                  var argEnd = node.arguments[0].range[1];
                  arg = source.slice(argStart, argEnd + 1);
                }
              }

              const subdenomination = node.arguments[0].subdenomination;

              //call
              if (node.expression.memberName == "call") {

                replacement = address + ".delegatecall";
                replacement2 = address + ".staticcall";

                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
              }
              //delegatecall
              else if (node.expression.memberName == "delegatecall") {

                replacement = address + ".call";
                replacement2 = address + ".staticcall";

                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
              }
              //staticcall
              else if (node.expression.memberName == "staticcall") {

                replacement = address + ".call";
                replacement2 = address + ".delegatecall";

                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
              }
              //send
              else if (node.expression.memberName == "send") {

                replacement = address + ".transfer";
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));

                start = node.range[0];
                end = node.range[1] + 1;

                startLine = node.loc.start.line;
                endLine = node.loc.end.line;

                functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                replacement2 = address + ".call{value: " + arg;
                if (subdenomination)
                  replacement2 = replacement2 + " " + subdenomination + "}(\"\")";
                else
                  replacement2 = replacement2 + "}(\"\")";

                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));

              }  
              //transfer
              else if (node.expression.memberName == "transfer") {

                replacement = address + ".send";
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement, this.ID));

                start = node.range[0];
                end = node.range[1] + 1;
                startLine = node.loc.start.line;
                endLine = node.loc.end.line;
                functionName = contextChecker.getFunctionName(visit, startLine, endLine);

                replacement2 = address + ".call{value: " + arg;
                if (subdenomination)
                  replacement2 = replacement2 + " " + subdenomination + "}(\"\")";
                else
                  replacement2 = replacement2 + "}(\"\")";
                pushMutation(new Mutation(file, functionName, start, end, startLine, endLine, original, replacement2, this.ID));
              }
            }
          }
        }
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

module.exports = ETROperator
