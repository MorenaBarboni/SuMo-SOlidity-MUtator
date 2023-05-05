const appRoot = require('app-root-path');
const chalk = require('chalk')
const fs = require('fs')
const fse = require('fs-extra');
const glob = require('glob')
const parser = require('@solidity-parser/parser')
var path = require('path');
const Reporter = require('./reporter')
const TceRunner = require('./tceRunner')
const utils = require('./utils')
const testingInterface = require("./testingInterface");
const mutationGenerator = require("./operators/mutationGenerator");

//SuMo configuration
const rootDir = appRoot.toString().replaceAll("\\", "/");
const sumoConfig = require(rootDir + '/sumo-config')
const sumoDir = utils.config.sumoDir;
const baselineDir = utils.config.baselineDir;
const mutantsDir = utils.config.mutantsDir;
const contractsGlob = utils.config.contractsGlob;
const testsGlob = utils.config.testsGlob;
var packageManager;
var contractsDir;
var testDir;
var buildDir;

const reporter = new Reporter()
const tceRunner = new TceRunner()

const mutGen = new mutationGenerator.CompositeOperator([
  new mutationGenerator.ACMOperator(),
  new mutationGenerator.AOROperator(),
  new mutationGenerator.AVROperator(),
  new mutationGenerator.BCRDOperator(),
  new mutationGenerator.BLROperator(),
  new mutationGenerator.BOROperator(),
  new mutationGenerator.CBDOperator(),
  new mutationGenerator.CCDOperator(),
  new mutationGenerator.CSCOperator(),
  new mutationGenerator.DLROperator(),
  new mutationGenerator.DODOperator(),
  new mutationGenerator.ECSOperator(),
  new mutationGenerator.EEDOperator(),
  new mutationGenerator.EHCOperator(),
  new mutationGenerator.EROperator(),
  new mutationGenerator.ETROperator(),
  new mutationGenerator.FVROperator(),
  new mutationGenerator.GVROperator(),
  new mutationGenerator.HLROperator(),
  new mutationGenerator.ILROperator(),
  new mutationGenerator.ICMOperator(),
  new mutationGenerator.LSCOperator(),
  new mutationGenerator.PKDOperator(),
  new mutationGenerator.MCROperator(),
  new mutationGenerator.MOCOperator(),
  new mutationGenerator.MODOperator(),
  new mutationGenerator.MOIOperator(),
  new mutationGenerator.MOROperator(),
  new mutationGenerator.OLFDOperator(),
  new mutationGenerator.OMDOperator(),
  new mutationGenerator.ORFDOperator(),
  new mutationGenerator.RSDOperator(),
  new mutationGenerator.RVSOperator(),
  new mutationGenerator.SCECOperator(),
  new mutationGenerator.SFIOperator(),
  new mutationGenerator.SFDOperator(),
  new mutationGenerator.SFROperator(),
  new mutationGenerator.SKDOperator(),
  new mutationGenerator.SKIOperator(),
  new mutationGenerator.SLROperator(),
  new mutationGenerator.TOROperator(),
  new mutationGenerator.UORDOperator(),
  new mutationGenerator.VUROperator(),
  new mutationGenerator.VVROperator()
])

function prepare(callback) {
  reporter.logPrepareCheck();

  if (sumoConfig.testingFramework !== "truffle" && sumoConfig.testingFramework !== "hardhat"
    && sumoConfig.testingFramework !== "forge" && sumoConfig.testingFramework !== "brownie" && sumoConfig.testingFramework !== "custom") {
    console.error(chalk.red("Error: The specified testing framework is not valid. \n The available options are:\n - brownie \n - hardhat \n - forge \n - truffle \n - custom"));
    process.exit(1);
  }

  //Setup .sumo dir
  if (!fs.existsSync(sumoDir)) {
    fs.mkdirSync(sumoDir);
  }
  utils.setupResultsDir();

  //Get configurable directories from the sumo-config file
  contractsDir = utils.getContractsDir();
  testDir = utils.getTestDir();
  buildDir = utils.getBuildDir();
  reporter.logAndSaveConfigDirs(contractsDir, testDir, buildDir);

  //Check the package manager used by the SUT
  packageManager = utils.getPackageManager()

  if (fs.existsSync(baselineDir)) {
    fse.emptyDirSync(baselineDir);
  }

  fse.copySync(testDir, baselineDir + "/test", { overwrite: true });
  fse.copySync(contractsDir, baselineDir + "/contracts", { overwrite: true });
  callback();
}

/**
 * Shows a summary of the available mutants without starting the testing process.
 */
function preflight() {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);
        generateAllMutations(contractsUnderMutation, true)
      })
    })
  );
}

/**
 * Shows a summary of the available mutants without starting the testing process and
 * saves the generated .sol mutants to file.
 */
function mutate() {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);
        const mutations = generateAllMutations(contractsUnderMutation, true);
        for (const mutation of mutations) {
          mutation.save();
        }
        console.log("Mutants saved to " + mutantsDir);
      })
    })
  );
}

/**
 * Generates  the mutations for each target contract
 *  @param files The smart contracts to be mutated
 *  @param overwrite Overwrite the generated mutation reports
 */
function generateAllMutations(files, overwrite) {
  let mutations = []
  var startTime = Date.now()
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const ast = parser.parse(source, { range: true, loc: true })
    const visit = parser.visit.bind(parser, ast)
    mutations = mutations.concat(mutGen.getMutations(file, source, visit, overwrite))
  }
  if (overwrite) {
    var generationTime = (Date.now() - startTime) / 1000
    reporter.saveGeneratedMutantsCsv(mutations);
    reporter.logPreflightSummary(mutations, generationTime, mutGen.getEnabledOperators())
  }
  return mutations
}

/**
 * Entry point for pre-test
 */
function runPreTest() {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        //Select contracts to mutate and test files to evaluate
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        preTest(contractsUnderMutation, testsToBeRun)
      })
    })
  );
}

/**
 * Runs the original test suite to ensure that all tests pass.
 */
function preTest(contractsUnderMutation, testsToBeRun) {

  reporter.logPretest();

  utils.cleanBuildDir(); //Remove old compiled artifacts
  utils.cleanResultsDir(); //Remove old results directory

  reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);

  if (contractsUnderMutation.length === 0) {
    console.error(chalk.red("Error: No contracts to be mutated"))
    process.exit(1)
  }
  if (testsToBeRun.length === 0) {
    console.error(chalk.red("Error: No tests to be evaluated"))
    process.exit(1)
  }

  reporter.setupResultsCsv();

  let nodeChild = testingInterface.spawnNetwork(packageManager);
  const isCompiled = testingInterface.spawnCompile(packageManager);

  if (isCompiled) {
    const status = testingInterface.spawnTest(packageManager, testsToBeRun);
    if (status === 0) {
      console.log(chalk.green("\nPre-test OK.\n"));
    } else {
      testingInterface.killNetwork(nodeChild);
      console.error(chalk.red("\nError: Pre-test failed - original tests should pass."));
      process.exit(1);
    }
  } else {
    testingInterface.killNetwork(nodeChild);
    console.error(chalk.red("\nError: Pre-test failed - original contracts should compile."));
    process.exit(1);
  }
  testingInterface.killNetwork(nodeChild);
}

/**
 * Starts the mutation testing process
 * @param startHash hash of the first mutant to be tested
 * @param endHash hash of the last mutant to be tested * 
 */
function test(startHash, endHash) {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) {
          console.error(err)
          process.exit(1)
        }

        //Select contracts to mutate and test files to evaluate
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);

        //Run the pre-test and compile the original contracts
        preTest(contractsUnderMutation, testsToBeRun);

        if (sumoConfig.tce) {
          tceRunner.saveOriginalBytecode(contractsUnderMutation, buildDir);
        }

        //Generate mutations
        var mutations = generateAllMutations(contractsUnderMutation, true)
        if (startHash !== "first") {
          let startIndex = mutations.indexOf(mutations.find(m => m.id === startHash));
          if (startIndex != -1) {
            mutations = mutations.slice(startIndex, mutations.length - 1);
          } else {
            console.error(chalk.red("Error: The specified start hash does not corrispond to any generated mutant."));
            process.exit(1);
          }
        }
        if (endHash !== "last") {
          let endIndex = mutations.indexOf(mutations.find(m => m.id === endHash));
          if (endIndex != -1) {
            mutations = mutations.slice(0, endIndex + 1);
          } else {
            console.error(chalk.red("Error: The specified end hash does not corrispond to any generated mutant."));
            process.exit(1);
          }
        }

        //Compile and test each mutant
        reporter.logStartMutationTesting();
        var startTime = Date.now();

        for (const contractUnderMutation of contractsUnderMutation) {
          runTest(mutations, contractUnderMutation, testsToBeRun);
        }
        var testTime = ((Date.now() - startTime) / 60000).toFixed(2);
        reporter.logAndSaveTestSummary(testTime);
        reporter.saveOperatorsResults();
      })
    })
  )
}

/**
 * The <b>runTest</b> function compile and test each mutant, assigning them a certain status
 * @param mutations An array of all mutants
 * @param file The name of the mutated contract
 */
function runTest(mutations, file, testsToBeRun) {
  const mutantBytecodeMap = new Map();

  for (var mutation of mutations) {
    if ((path.parse(mutation.file).name) === (path.parse(file).name)) {
      let startTestTime = Date.now();
      let nodeChild = testingInterface.spawnNetwork(packageManager);
      mutation.apply();
      reporter.logCompile(mutation);
      const isCompiled = testingInterface.spawnCompile(packageManager);

      if (isCompiled) {
        if (sumoConfig.tce) {
          mutation = tceRunner.runTce(mutation, mutantBytecodeMap, reporter, buildDir);
        }
        if (mutation.status !== "redundant" && mutation.status !== "equivalent") {
          reporter.logTest(mutation);
          const result = testingInterface.spawnTest(packageManager, testsToBeRun)
          if (result === 0) {
            mutation.status = "live";
          } else if (result === 999) {
            mutation.status = "timedout";
          } else {
            mutation.status = "killed";
          }
        }
      } else {
        mutation.status = "stillborn";
      }
      mutation.testingTime = ((Date.now() - startTestTime));
      reporter.saveResultsCsv(mutation);
      reporter.mutantStatus(mutation);
      mutation.restore();
      testingInterface.killNetwork(nodeChild);
    }
  }
  mutantBytecodeMap.clear();
}


//Checks which operators are currently enabled
function enabledOperators() {
  console.log(mutGen.getEnabledOperators());
}

//Enables a mutation operator
function enableOperator(ID) {
  //Enable all operators
  if (!ID) {
    var success = mutGen.enableAll();
    if (success)
      console.log("\nAll mutation operators enabled.\n");
    else
      console.error(chalk.red("\nError.\n"));
  } else {
    //Enable operator ID
    var success = mutGen.enable(ID);
    if (success)
      console.log("\n" + chalk.bold.yellow(ID) + " enabled.\n");
    else
      console.error(chalk.red("\nError: " + ID + " does not exist.\n"));
  }
}

//Disables a mutation operator 
function disableOperator(ID) {
  //Disable all operators
  if (!ID) {
    var success = mutGen.disableAll();
    if (success)
      console.log("\nAll mutation operators disabled.\n");
    else
      console.error(chalk.red("\nError.\n"));
  } else {
    //Disable operator ID
    var success = mutGen.disable(ID);
    if (success)
      console.log("\n" + chalk.bold.yellow(ID) + " disabled.\n");
    else
      console.error(chalk.red("\nError: " + ID + " does not exist.\n"));
  }
}

function mutationsByHash(mutations) {
  return mutations.reduce((obj, mutation) => {
    obj[mutation.hash()] = mutation
    return obj
  }, {})
}

/**
 * Prints the diff between a mutant and the original contract
 * @param {*} argv the hash of the mutant
 */
function diff(argv) {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) {
        console.log(err);
        process.exit(0);
      }
      const mutations = generateAllMutations(contracts, false)
      const index = mutationsByHash(mutations)
      if (!index[argv.hash]) {
        console.error(chalk.red('\nError: Mutation ' + argv.hash + ' not found.'))
        process.exit(1)
      }
      console.log(index[argv.hash].diff())
    })
  )
}

/**
 * Selects the contracts to mutate
 * @param files array of paths of all Smart Contracts * 
 */
function contractSelection(files) {
  var contractUnderMutation = [];

  for (const file of files) {
    let skipContract = false;
    for (const relCPath of sumoConfig.skipContracts) {
      let absolCPath = utils.getContractsDir() + "/" + relCPath;
      if (file.startsWith(absolCPath) && relCPath !== "") {
        skipContract = true;
        break;
      }
    }
    if (!skipContract) {
      contractUnderMutation.push(file)
    }
  }
  return contractUnderMutation;
}

/**
 * Selects the test files to be evaluated
 * @param files all test files
 * @returns a list of tests to be run
 */
function testSelection(files) {
  let testsToBeRun = [];

  for (const file of files) {
    let skipTest = false;
    for (const relTPath of sumoConfig.skipTests) {
      let absolTPath = utils.getTestDir() + "/" + relTPath;
      if (file.startsWith(absolTPath) && relTPath !== "" && sumoConfig.testingFramework !== "custom") {
        skipTest = true;
        break;
      }
    }
    if (sumoConfig.testingFramework === "forge" && !file.endsWith(".t.sol")) {
      skipTest = true;
    }
    if (!skipTest) {
      testsToBeRun.push(file)
    }
  }
  return testsToBeRun;
}

module.exports = {
  preflight, preflight,
  mutate: mutate,
  pretest: runPreTest,
  test: test,
  diff: diff,
  list: enabledOperators,
  enable: enableOperator,
  disable: disableOperator
}
