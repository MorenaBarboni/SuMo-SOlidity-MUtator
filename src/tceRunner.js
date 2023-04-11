const fs = require("fs");
const path = require("path");
const { parse } = require("path");
const chalk = require('chalk')

function TceRunner() {
  this.currentBytecode = [];
  this.originalBytecode = new Map();
}

/**
 * The <b>saveOriginalBytecode()</b> function stores bytecode of the original smart contracts in the originalBytecode Map.
 * The key is the name of the smart contract, the value is the contract bytecode.
 * @param contractsUnderMutation the smart contracts under mutation
 * @param buildDir the directory containing the bytecode
 */
TceRunner.prototype.saveOriginalBytecode = function (contractsUnderMutation, buildDir) {
  //save the bytecode of the original contracts
  this.exploreDirectories(buildDir)
  this.currentBytecode.map(artifact => {
    for (const contract of contractsUnderMutation) {
      if (parse(artifact).name === parse(contract).name) {
        this.originalBytecode.set(parse(contract).name, saveBytecodeSync(artifact))
      }
    }
  })
};


/**
 * The <b>tce()</b> function compares the bytecode of the smart contracts, and it can set status of the relative mutants.
 * A mutant that has the same bytecode of its original contract is marked as "equivalent". 
 * A mutant that has the same bytecode of a previously tested mutant is marked as "redundant".
 * @param mutation The mutant object
 * @param map The byecode map of the mutant
 * @param reporter A reporter instance for logging information
 * @param buildDir the directory containing the bytecode
 * @returns the mutant with a potentially updated status and an associated bytecode
 */
TceRunner.prototype.runTce = function (mutation, map, reporter, buildDir) {
  console.log();
  console.log(chalk.yellow('Running the TCE'));

  var file = mutation.file;
  let fileName = parse(file).name;

  this.currentBytecode = [];

  this.exploreDirectories(buildDir)
  this.currentBytecode.map(artifact => {
    if (parse(artifact).name === parse(mutation.file).name) {
      mutation.bytecode = saveBytecodeSync(artifact);
    }
  })

  if (this.originalBytecode.get(fileName) === mutation.bytecode && mutation.bytecode !== null) {
    mutation.status = "equivalent";
  } else if (map.size !== 0) {
    for (const key of map.keys()) {
      if (map.get(key) === mutation.bytecode && mutation.bytecode !== null) {
        mutation.status = "redundant";
        //reporter.saveResultsCsv(mutation, key);
        break;
      }
    }
    if (mutation.status !== "redundant") {
      map.set(mutation.hash(), mutation.bytecode);
    }

  } else {
    map.set(mutation.hash(), mutation.bytecode);
  }

  return mutation;
}

/**
 * The <b>exploreDirectories()</b> function retrieves the bytecode of each contract in the buildDir and stores it in the currentBytecode array.
 */
TceRunner.prototype.exploreDirectories = function (Directory) {
  fs.readdirSync(Directory).forEach(File => {
    const Absolute = path.join(Directory, File);
    if (fs.statSync(Absolute).isDirectory())
      return this.exploreDirectories(Absolute);
    else {
      return this.currentBytecode.push(Absolute);
    }
  });
}

/**
 *It returns the bytecode of a smart contract
 * @param file The name of the original contract
 * @returns {*} The bytecode
 */
function saveBytecodeSync(file) {
  var mutantBytecode;
  try {
    const data = fs.readFileSync(file, "utf-8");
    var json = JSON.parse(data);
    if (json.bytecode && json.bytecode.object) {
      mutantBytecode = json.bytecode.object;
    } else if (json.bytecode) {
      mutantBytecode = json.bytecode;
    } else {
      mutantBytecode = null;
      console.log(chalk.red('Warning: Bytecode not found - TCE skipped.'));
    }
    return mutantBytecode;
  } catch (err) {
    console.log(chalk.red("Error: Compiled artifact not found."));
  }
}

module.exports = TceRunner