const Mutation = require("../mutation");

function ETROperator() {
}

ETROperator.prototype.ID = "ETR";
ETROperator.prototype.name = "ether-transfer-function-replacement";

ETROperator.prototype.getMutations = function(file, source, visit) {
  const mutations = [];
  const functions = ["transfer", "send", "call", "delegatecall", "staticcall"];

  visit({
    FunctionCall: (node) => {

      if ((node.expression.type == "MemberAccess" || (node.expression.expression && node.expression.expression.type == "MemberAccess"))) {
        if (functions.includes(node.expression.memberName) || functions.includes(node.expression.expression.memberName)) {

          var replacement;
          var replacement2;

          //Call methods with gas or value - ex: call{value:...,gas:...}("")
          if (node.expression.expression && functions.includes(node.expression.expression.memberName)) {

            const start = node.range[0];
            const end = node.range[1];

            const addressStart = node.expression.expression.expression.range[0];
            const addressEnd = node.expression.expression.expression.range[1];
            const address = source.slice(addressStart, addressEnd + 1);
            const callArguments = source.slice(node.arguments[0].range[0], node.arguments[0].range[1] + 1);

            //Exclude old call() syntax
            if (node.expression.arguments) {
              const valueArguments = source.slice(node.expression.arguments.range[0], node.expression.arguments.range[1] + 1);
              if (node.expression.expression.memberName === "call") {

                const nameValueList = node.expression.arguments.names;
                var gas;
                gasIndex = nameValueList.indexOf("gas");
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

                mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
                mutations.push(new Mutation(file, start, end + 1, replacement2, this.ID));


              } else if (node.expression.expression.memberName === "delegatecall") {

                mutations.push(new Mutation(file, start, end + 1, address + ".call" + "{" + valueArguments + "}" + "(" + callArguments + ")", this.ID));
                mutations.push(new Mutation(file, start, end + 1, address + ".staticcall" + "{" + valueArguments + "}" + "(" + callArguments + ")", this.ID));

              } else if (node.expression.expression.memberName === "staticcall") {
                mutations.push(new Mutation(file, start, end + 1, address + ".call" + "{" + valueArguments + "}" + "(" + callArguments + ")", this.ID));
                mutations.push(new Mutation(file, start, end + 1, address + ".delegatecall" + "{" + valueArguments + "}" + "(" + callArguments + ")", this.ID));
              }
            }
          }
          //Send, transfer, and call methods with no Ether value or Gas value supplied - ex: call("")
          else {

            var start = node.expression.range[0];
            var end = node.expression.range[1];
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
              mutations.push(new Mutation(file, start, end + 1, address + ".delegatecall", this.ID));
              mutations.push(new Mutation(file, start, end + 1, address + ".staticcall", this.ID));
            }
            //delegatecall
            else if (node.expression.memberName == "delegatecall") {
              mutations.push(new Mutation(file, start, end + 1, address + ".call", this.ID));
              mutations.push(new Mutation(file, start, end + 1, address + ".staticcall", this.ID));
            }
            //staticcall
            else if (node.expression.memberName == "staticcall") {
              mutations.push(new Mutation(file, start, end + 1, address + ".call", this.ID));
              mutations.push(new Mutation(file, start, end + 1, address + ".delegatecall", this.ID));
            }
            //send
            else if (node.expression.memberName == "send") {

              mutations.push(new Mutation(file, start, end + 1, address + ".transfer", this.ID));

              start = node.range[0];
              end = node.range[1];
              replacement = address + ".call{value: " + arg;
              if (subdenomination)
                replacement = replacement + " " + subdenomination + "}(\"\")";
              else
                replacement = replacement + "}(\"\")";
              mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));

            }  //transfer
            else if (node.expression.memberName == "transfer") {

              mutations.push(new Mutation(file, start, end + 1, address + ".send", this.ID));
              start = node.range[0];
              end = node.range[1];
              replacement = address + ".call{value: " + arg;
              if (subdenomination)
                replacement = replacement + " " + subdenomination + "}(\"\")";
              else
                replacement = replacement + "}(\"\")";
              mutations.push(new Mutation(file, start, end + 1, replacement, this.ID));
            }

          }

        }
      }
    }
  });
  return mutations;
};

module.exports = ETROperator;
