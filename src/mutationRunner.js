const appRoot = require('app-root-path');
const chalk = require('chalk')
const fs = require('fs')
const fse = require('fs-extra');
const glob = require('glob')
const mutationGenerator = require("./operators/mutationGenerator");
const parser = require('@solidity-parser/parser')
var path = require('path');
const Reporter = require('./reporter')
const TceRunner = require('./tceRunner')
const testingInterface = require("./testingInterface");
const utils = require('./utils')

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
const mutGen = new mutationGenerator.MutationOperators([
  "ACM", "AOR", "AVR", "BCRD", "BLR", "BOR", "CBD", "CCD", "CSC", "DLR",
  "DOD", "ECS", "EED", "EHC", "ER", "ETR", "FVR", "GVR", "HLR", "ILR",
  "ICM", "LSC", "PKD", "MCR", "MOC", "MOD", "MOI", "MOR", "OLFD", "OMD",
  "ORFD", "RSD", "RVS", "SCEC", "SFI", "SFD", "SFR", "SKD", "SKI", "SLR",
  "TOR", "UORD", "VUR", "VVR"
].map(operator => new mutationGenerator[`${operator}Operator`]()));


/**
 * Setup operations
 * @param {*} callback 
 */
function setup(callback) {
  reporter.logSetup();

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
function lookup() {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);
        generateMutations(contractsUnderMutation, true)
      })
    })
  );
}

/**
 * Shows a summary of the available mutants without starting the testing process and
 * saves the generated .sol mutants to file.
 */
function mutate() {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);
        const mutations = generateMutations(contractsUnderMutation, true);
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
function generateMutations(files, overwrite) {
  let mutations = []
  const startTime = Date.now()
  const enabledOperators = mutGen.getEnabledOperators();

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { range: true, loc: true });
    const visit = parser.visit.bind(parser, ast);
    mutations.push(...mutGen.getMutations(file, source, visit, overwrite));
  }
  if (overwrite) {
    const generationTime = (Date.now() - startTime) / 1000;
    reporter.saveGeneratedMutantsCsv(mutations);
    reporter.saveGeneratedMutationsJson(mutations);
    reporter.logLookup(mutations, generationTime, enabledOperators);
  }

  return mutations;
}

/**
 * Entry point for pre-test
 */
function runPreTest() {
  setup(() =>
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
 * @param endHash hash of the last mutant to be tested 
 */
function test(startHash, endHash) {
  setup(() =>
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
        var mutations = generateMutations(contractsUnderMutation, true)
        if (startHash) {
          let startIndex = mutations.indexOf(mutations.find(m => m.id === startHash));
          if (startIndex === -1) {
            console.error(chalk.red("Error: The specified start hash does not corrispond to any generated mutant."));
            process.exit(1);
          }
          let endIndex = startIndex;
          if (endHash) {
            endIndex = mutations.indexOf(mutations.find(m => m.id === endHash));
            if (endIndex === -1) {
              console.error(chalk.red("Error: The specified end hash does not corrispond to any generated mutant."));
              process.exit(1);
            }
          }
          mutations = mutations.slice(startIndex, endIndex + 1);
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
 * The <b>runTest</b> function compiles and tests each mutant, assigning them a certain status
 * @param mutations An array of all mutants
 * @param file The name of the mutated contract
 * @param file The test files to be run
 **/
function runTest(mutations, file, testsToBeRun) {
  const mutantBytecodeMap = new Map();

  for (let i = 0; i < mutations.length; i++) {
    let mutation = mutations[i];
    if ((path.parse(mutation.file).name) === (path.parse(file).name)) {
      let startTestTime = Date.now();
      reporter.logMutationProgress(i + 1, mutations.length, mutation);
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

/**
 * Enable one or more mutation operators
 * @param {*} args a list of operators to be enabled. 
 * If the list is empty, all the mutation operators are enabled.
 */
function enableOperator(args) {
  if (args.length === 0) {
    const success = mutGen.enableAll();
    console.log(success ? "\nAll mutation operators enabled.\n" : "\nError.\n");
  } else {
    console.log();
    args.forEach(ID => {
      const success = mutGen.enable(ID);
      console.log(success ? chalk.bold.yellow(ID) + " enabled." : chalk.red("Error: " + ID + " does not exist."));
    });
    console.log();
  }
}

/**
 * Disable one or more mutation operators
 * @param {*} args a list of operators to be enabled. 
 * The list can include simple operator IDs, or cluster names (i.e., default or optimization).
 * If the list is empty, all the mutation operators are disabled.
 */
function disableOperator(args) {
  if (args.length === 0) {
    const success = mutGen.disableAll();
    console.log(success ? "\nAll mutation operators disabled.\n" : "\nError.\n");
  } else {
    console.log();
    args.forEach(ID => {
      const success = mutGen.disable(ID);
      console.log(success ? chalk.bold.yellow(ID) + " disabled." : chalk.red("Error: " + ID + " does not exist."));
    });
    console.log();
  }
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
  lookup: lookup,
  mutate: mutate,
  pretest: runPreTest,
  test: test,
  list: enabledOperators,
  enable: enableOperator,
  disable: disableOperator
}
