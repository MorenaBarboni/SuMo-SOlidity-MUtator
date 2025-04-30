// External modules
const chalk = require('chalk');
const fs = require('fs');
const fse = require('fs-extra');
const glob = require('glob');
const parser = require('@solidity-parser/parser');

// Internal modules
const mutationGenerator = require("./operators/mutationGenerator");
const Reporter = require('./reporter');
const reporter = new Reporter()
const utils = require('./utils');
const pruner = require('./pruner')
const testingInterface = require("./testingInterface");
const htmlReporter = require("./htmlReport")

//SuMo static configuration
const { sumoDir, baselineDir, mutantsDir, contractsGlob, testsGlob } = utils.staticConf;
var testingFrameworks = [];
var contractsDir, testDir, buildDir;

/**
 * Creates a MutationGenerator instance with an array of mutation operators.
 * @type {MutationGenerator}
 */
const mutGen = new mutationGenerator.MutationGenerator([
  "ACM", "AOR", "AVR", "BCRD", "BOR", "BLR", "CBD", "CCD", "CSC", "DLR",
  "DOD", "EED", "ECS", "EHD", "ER", "ETR", "FCD", "FVR", "GVR", "HLR", "ILR", "LSC",
  "MCR", "MOI", "MOD", "OLFD", "OMD", "ORFD", "PKD", "RSD", "RVS", "SCD",
  "SKR", "SLR", "TOR", "UORD", "VUR", "VVR"
].map(operator => new mutationGenerator[`${operator}Operator`]()));


/**
 * Performs initial setup steps required for mutation testing.
 * Creates necessary directories, reads user configuration, and copies original contracts/tests to a baseline directory.
 * @param {Function} callback - A function to execute after setup is complete.
 * @returns {void}
 */
function setup(callback) {
  reporter.logSetupCheck();

  //Setup sumo dir
  if (!fs.existsSync(sumoDir)) { fs.mkdirSync(sumoDir); }
  utils.setupResultsDir();

  //Get configurable directories and testing frameworks
  //If multiple testing frameworks, only the first one is used for compilation
  testingFrameworks = utils.getTestingFrameworks();
  contractsDir = utils.getContractsDir();
  testDir = utils.getTestDir();
  buildDir = utils.getBuildDir(testingFrameworks[0]);
  utils.getPackageManager()

  reporter.logAndSaveSetup(contractsDir, testDir, buildDir, testingFrameworks);

  //Restore baseline
  if (fs.existsSync(baselineDir)) { fse.emptyDirSync(baselineDir); }
  fse.copySync(testDir, baselineDir + "/test", { overwrite: true });
  fse.copySync(contractsDir, baselineDir + "/contracts", { overwrite: true });

  callback();
}

/**
 * Lists available mutants for the selected contracts without saving them or running tests.
 * @throws {Error} If contract or test files cannot be retrieved.
 * @returns {void}
 */
function lookup() {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun, testingFrameworks);
        generateMutations(contractsUnderMutation, testsToBeRun, false);
      })
    })
  );
}

/**
 * Generates and saves mutants for selected contracts without running tests.
 * @throws {Error} If contract or test files cannot be retrieved.
 * @returns {void}
 */
function mutate() {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun, testingFrameworks);
        const mutations = generateMutations(contractsUnderMutation, testsToBeRun, false);
        for (const mutation of mutations) {
          mutation.save();
        }
        console.log("Mutants saved to " + mutantsDir);
      })
    })
  );
}

/**
 * Generates mutants for given contracts using enabled mutation operators.
 * Optionally prunes mutants and saves mutation reports.
 * 
 * @param {Array<string>} contractsUnderMutation - Paths to smart contracts to mutate.
 * @param {Array<string>} testsToBeRun - List of test file paths to consider.
 * @param {boolean} testingStarted - Whether mutation testing has already started (affects pruning/reporting).
 * @returns {Array<object>} Array of generated mutant objects.
 */
function generateMutations(contractsUnderMutation, overwriteReports, testingStarted) {
  const enabledOperators = mutGen.getEnabledOperators();
  reporter.logLookup(enabledOperators);

  let mutations = []
  let generationTime;
  const startTime = Date.now()

  for (const file of contractsUnderMutation) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { range: true, loc: true });
    const visit = parser.visit.bind(parser, ast);
    mutations.push(...mutGen.getMutations(file, source, visit));
    generationTime = (Date.now() - startTime) / 1000;
  }

  //Prune mutations if a reduction strategy is enabled
  if (utils.getRandomSampling() || utils.getPruneUncovered()) {
    let prunedMutations = pruner.pruneMutations(mutations);
    mutations = testingStarted ? prunedMutations : mutations;
  }
  if (overwriteReports) {
    reporter.logLookupSummary(mutations, generationTime);
    reporter.saveMutantGenerationReports(mutations);
    htmlReporter.generateReport();
  }
  return mutations;
}

/**
 * Runs the original unmodified test suite to ensure it passes.
 * Serves as a sanity check before mutation testing.
 * 
 * @throws {Error} If tests or contracts fail to compile or pass.
 * @returns {void}
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
 * Runs the pre-test phase with selected contracts and test files.
 * @param {string[]} contractsUnderMutation - Array of contract file paths to be mutated.
 * @param {string[]} testsToBeRun - Array of test file paths to be run.
 * @throws {Error} If tests or contracts fail to compile or pass.
 * @returns {void}
 */
function preTest(contractsUnderMutation, testsToBeRun) {

  reporter.logPretest();

  utils.cleanBuildDir(buildDir);
  utils.cleanResultsDir(); //Remove old results directory

  reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun, testingFrameworks);

  if (contractsUnderMutation.length === 0) {
    console.log(chalk.red("Error: No contracts to be mutated")); process.exit(1);
  }
  if (testsToBeRun.length === 0) {
    console.log(chalk.red("Error: No tests to be evaluated")); process.exit(1);
  }

  const isCompiled = testingInterface.spawnCompile(testingFrameworks);

  if (isCompiled) {
    const status = testingInterface.spawnTest(testingFrameworks, testsToBeRun);
    if (status === 0) {
      console.log(chalk.green("\nPre-test OK.\n"));
    } else {
      throw new Error(chalk.red("\nError: Pre-test failed - original tests should pass."));
    }
  } else {
    throw new Error(chalk.red("\nError: Pre-test failed - original contracts should compile."));
  }
}

/**
 * Main mutation testing command.
 * Runs the original tests, generates mutations, applies them one-by-one, and tracks mutant survival.
 * 
 * @param {string} [startHash] - Optional hash ID of the first mutant to test.
 * @param {string} [endHash] - Optional hash ID of the last mutant to test.
 * @throws {Error} If hash is invalid or compilation/testing fails.
 * @returns {void}
 */
function test(startHash, endHash) {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(testDir + testsGlob, (err, tests) => {
        if (err) throw err;

        //Select contracts to mutate and test files to evaluate
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);

        //Run the pre-test and compile the original contracts
        preTest(contractsUnderMutation, testsToBeRun);

        //Generate mutations
        var mutations = generateMutations(contractsUnderMutation, testsToBeRun, true)
        if (startHash) {
          let startIndex = mutations.indexOf(mutations.find(m => m.id === startHash));
          if (startIndex === -1) {
            throw new Error(chalk.red("Error: The specified start hash does not corrispond to any generated mutant."));
          }
          let endIndex = startIndex;
          if (endHash) {
            endIndex = mutations.indexOf(mutations.find(m => m.id === endHash));
            if (endIndex === -1) {
              throw new Error(chalk.red("Error: The specified end hash does not corrispond to any generated mutant."));
            }
          }
          mutations = mutations.slice(startIndex, endIndex + 1);
        }
        //Compile and test each mutant
        reporter.logStartMutationTesting();
        var startTime = Date.now();

        runTest(mutations, testsToBeRun);

        // testing time in seconds
        const testTime = ((Date.now() - startTime) / 1000);
        reporter.logTestSummary(testTime);
      })
    })
  )
}

/**
 * Applies and tests each mutant.
 * Sets mutant status based on compilation and test results (killed, live, timedout, stillborn).
 * 
 * @param {Object[]} mutations - Array of mutant objects to apply and test.
 * @param {string[]} testsToBeRun - Array of test file paths.
 * @returns {void}
 */
function runTest(mutations, testsToBeRun) {

  for (let i = 0; i < mutations.length; i++) {

    let mutation = mutations[i];  //Mutant Under Test

    const startTestTime = Date.now();
    reporter.logMutationProgress(i + 1, mutations.length, mutation);

    if (!pruner.isMutantCovered(mutation)) {
      mutation.status = "live(uncovered)";
    }
    else {
      mutation.apply();
      reporter.logCompile(mutation);
      const isCompiled = testingInterface.spawnCompile(testingFrameworks);

      if (isCompiled) {
        reporter.logTest(mutation);
        const testingResult = testingInterface.spawnTest(testingFrameworks, testsToBeRun);
        switch (testingResult) {
          case 0: mutation.status = "live"; break;
          case 999: mutation.status = "timedout"; break;
          default: mutation.status = "killed";
        }
      }
      else {
        mutation.status = "stillborn";
      }
      mutation.restore();
    }

    mutation.testingTime = ((Date.now() - startTestTime));
    reporter.updateMutantStatus(mutation);
  }
}

/**
 * Filters out contracts excluded by the user in the config and returns the rest.
 * 
 * @param {Array<string>} files - Array of all smart contract file paths.
 * @returns {Array<string>} Contracts eligible for mutation.
 */
function contractSelection(files) {
  const skipContracts = utils.getSkipContracts();
  var contractUnderMutation = [];

  for (const file of files) {
    let skipContract = false;
    for (const relCPath of skipContracts) {
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
 * Filters out test files not compatible with selected frameworks or skipped in config.
 * 
 * @param {Array<string>} files - Array of all test file paths.
 * @returns {Array<string>} Test files to be executed.
 */
function testSelection(files) {
  const skipTests = utils.getSkipTests();
  let testsToBeRun = [];

  for (const file of files) {
    let skipTest = false;
    for (const relTPath of skipTests) {
      let absolTPath = utils.getTestDir() + "/" + relTPath;
      if (file.startsWith(absolTPath) && relTPath !== "" && !testingFrameworks.includes("custom")) {
        skipTest = true;
        break;
      }
    }
    if (!testingFrameworks.includes("custom")) {
      const isForgeTest = file.endsWith(".t.sol");
      const isBrownieTest = file.endsWith(".py") && (file.includes('test_') || file.includes('_test'));
      const isHardhatTest = file.endsWith(".ts") || file.endsWith(".js") || (file.endsWith(".sol") && !file.endsWith(".t.sol"));

      //Skip forge tests if not required
      if (!testingFrameworks.includes("forge") && isForgeTest) { skipTest = true; }
      //Skip brownie tests if not required
      if (!testingFrameworks.includes("brownie") && isBrownieTest) { skipTest = true; }
      //Skip hardhat tests if not required
      if (!testingFrameworks.includes("hardhat") && isHardhatTest) { skipTest = true; }
    }
    if (!skipTest) {
      testsToBeRun.push(file)
    }
  }
  return testsToBeRun;
}

/**
 * Enables one or more mutation operators by ID.
 * If no IDs are provided, enables all available operators.
 * 
 * @param {Array<string>} args - Operator IDs to enable.
 * @returns {void}
 */
function enableOperator(args) {
  if (args.length === 0) {
    const success = mutGen.enableAll();
    console.log(success ? "\nAll mutation operators enabled.\n" : "\nError.\n");
  }
  else {
    console.log();
    args.forEach(ID => {
      const success = mutGen.enable(ID);
      console.log(success ? chalk.bold.yellow(ID) + " enabled." : chalk.red("Error: " + ID + " does not exist."));
    });
    console.log();
  }
}

/**
 * Disables one or more mutation operators by ID or cluster name.
 * If no IDs are provided, disables all operators.
 * 
 * @param {Array<string>} args - Operator IDs or group names to disable.
 * @returns {void}
 */
function disableOperator(args) {
  if (args.length === 0) {
    const success = mutGen.disableAll();
    console.log(success ? "\nAll mutation operators disabled.\n" : "\nError.\n");
  }
  else {
    console.log();
    args.forEach(ID => {
      const success = mutGen.disable(ID);
      console.log(success ? chalk.bold.yellow(ID) + " disabled." : chalk.red("Error: " + ID + " does not exist."));
    });
    console.log();
  }
}

/**
 * Logs the currently enabled mutation operators to the console.
 * @returns {void}
 */
function enabledOperators() {
  console.log(mutGen.getEnabledOperators());
}

/**
 * Displays a colorized diff between the original contract and a specified mutant.
 * 
 * @param {Object} argv - CLI arguments object.
 * @param {string} argv.hash - Hash of the mutant to compare.
 * @throws {Error} If the hash does not match any known mutant.
 * @returns {void}
 */
function diff(argv) {
  setup(() =>
    glob(contractsDir + contractsGlob, (err, contracts) => {
      if (err) {
        console.log(err);
        process.exit(0);
      }
      const mutations = generateMutations(contracts, null, false)
      const index = mutationsByHash(mutations)
      if (!index[argv.hash]) {
        console.error(chalk.red('\nError: Mutation ' + argv.hash + ' not found.'))
        process.exit(1)
      }
      console.log(index[argv.hash].diffColor())
    })
  )
}

/**
 * Creates a hash-indexed lookup object for a list of mutants.
 * 
 * @param {Array<object>} mutations - Array of mutant objects.
 * @returns {Object} Mutant hash map: { [hash]: mutationObject }
 */
function mutationsByHash(mutations) {
  return mutations.reduce((obj, mutation) => {
    obj[mutation.hash()] = mutation
    return obj
  }, {})
}

module.exports = {
  lookup: lookup,
  mutate: mutate,
  pretest: runPreTest,
  test: test,
  diff: diff,
  list: enabledOperators,
  enable: enableOperator,
  disable: disableOperator
}
