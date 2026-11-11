// External modules
const chalk = require('chalk');
const fs = require('fs');
const glob = require('glob');
const parser = require('@solidity-parser/parser');
const { performance } = require("node:perf_hooks");

// Internal SuMo modules
const mutationGenerator = require("./operators/mutationGenerator");
const pruner = require('./pruner');
const Reporter = require('./reporting/reporter');
const htmlReporter = require("./reporting/htmlReport");
const reporter = new Reporter();
const testingInterface = require("./testingInterface");
const TCE = require("./tce");
const utils = require('./utils');

//SuMo static configuration
const { mutantsDir, contractsGlob, testsGlob } = utils.staticConf;
const randomSamplingEnabled = utils.getRandomSampling();
var tce;

/**
 * Creates a MutationGenerator instance with an array of mutation operators.
 * @type {MutationGenerator}
 */
const mutGen = new mutationGenerator.MutationGenerator([
  "ACM", "AOR", "AVR", "BCRD", "BOR", "BLR", "CBD", "CCD", "CSC", "DLR",
  "DOD", "EED", "ECS", "EHD", "ER", "ETR", "FCD", "FVR", "GVR", "HLR", "ILR", "LSC",
  "LFR", "MCR", "MKR", "MOI", "MOD", "OLFD", "OMD", "ORFD", "PKD", "RSD", "RVS", "SCD",
  "SKR", "SLR", "TOR", "UORD", "VUR", "VVR"
].map(operator => new mutationGenerator[`${operator}Operator`]()));



/* ============================================================
 * MUTATION TESTING CONTEXT AND WORKSPACE
 * ============================================================
*/

/**
 * Prepares the mutation testing context and workspace.
 * It ensures that all SuMo directories exist and it refreshes the baseline
 * without deleting existing mutation testing results
 *
 * @returns {{
 *   testingFrameworks: string[],
 *   contractsDir: string,
 *   testDir: string,
 *   buildDir: string,
 *   packageManager: string
 * }} The resolved command environment.
 */
function setup() {
  reporter.logSetupCheck();
  reporter.resetMutationResults();

  utils.setupSumoDirs();

  const testingFrameworks = utils.getTestingFrameworks();
  const contractsDir = utils.getContractsDir();
  const testDir = utils.getTestDir();
  const buildDir = utils.getBuildDir(testingFrameworks[0]);
  const packageManager = utils.getPackageManager();

  utils.createBaseline(contractsDir, testDir);
  tce = new TCE(buildDir);

  const context = { testingFrameworks, contractsDir, testDir, buildDir, packageManager };

  reporter.logAndSaveSetup(contractsDir, testDir, buildDir, testingFrameworks, packageManager);

  return context;
}

/* ============================================================
 * MUTANT GENERATION
 * ============================================================
*/

/**
 * Generates and reports mutations without writing mutated source files.
 * Cleans existing SuMo results directory.
 *
 * @returns {void}
 */
function lookup() {
  utils.cleanResultsDir();
  const context = setup();

  withSelectedFiles(context, (contracts, tests) => {
    reporter.logSelectedFiles(contracts, tests, context.testingFrameworks);

    const { mutations } = generateMutations(contracts);
    htmlReporter.generateReport();
  });
}

/**
 * Generates and reports mutations, then writes each mutated source to disk.
 * Cleans existing SuMo results directory.
 * 
 * @returns {void}
 */
function mutate() {
  utils.cleanResultsDir();
  const context = setup();

  withSelectedFiles(context, (contracts, tests) => {
    reporter.logSelectedFiles(contracts, tests, context.testingFrameworks);

    const { mutations } = generateMutations(contracts);
    mutations.forEach(mutation => mutation.save());

    console.log("Mutants saved to " + mutantsDir);
    htmlReporter.generateReport();
  });
}

/**
 * Generates mutations for the selected contracts, applies configured pruning,
 * and persists the generation reports.
 *
 * @param {string[]} contracts - Contract files selected for mutation.
 * @returns {{mutations: Object[], mutantGenerationTime: number}}
 *   Final mutations and generation duration in milliseconds.
 */
function generateMutations(contracts) {
  reporter.logLookup(mutGen.logOperatorsStatus());

  const { result: generatedMutations, duration } = measureExecutionTime(() =>
    contracts.flatMap(file => {
      const source = fs.readFileSync(file, "utf8");
      const ast = parser.parse(source, { range: true, loc: true });
      const visit = parser.visit.bind(parser, ast);

      return mutGen.getMutations(file, source, visit);
    })
  );

  const mutations = randomSamplingEnabled
    ? pruner.pruneMutations(generatedMutations)
    : generatedMutations;

  reporter.logLookupSummary(mutations, duration);
  reporter.saveMutantGenerationReports(mutations);

  return { mutations, mutantGenerationTime: duration };
}

/* ============================================================
 * PRETEST
 * ============================================================
*/

/**
 * Executes the standalone pre-test command against the unmodified project.
 *
 * @throws {Error} If compilation fails or the original test suite does not pass.
 * @returns {void}
 */
function runPreTest() {
  const context = setup();

  withSelectedFiles(context, (contracts, tests) => {
    preTest(contracts, tests, context.testingFrameworks);
  });
}

/**
 * Validates the unmodified project by compiling it and running the selected tests.
 * When TCE is enabled, the successful compilation becomes its comparison baseline.
 *
 * @param {string[]} contracts - Selected contract files
 * @param {string[]} tests - Selected test files
 * @param {string[]} testingFrameworks - Detected testing framework(s).
 * 
 * @throws {Error} If compilation fails or the original tests do not pass
 * @returns {void}
 */
function preTest(contracts, tests, testingFrameworks) {

  reporter.logPretest();

  if (contracts.length === 0) {
    console.log(chalk.red("Error: No contracts to be mutated")); process.exit(1);
  }
  if (tests.length === 0) {
    console.log(chalk.red("Error: No tests to be evaluated")); process.exit(1);
  }

  const isCompiled = testingInterface.spawnCompile(testingFrameworks);

  if (isCompiled) {
    // The pre-test compilation is the canonical original-program baseline
    if (utils.getTCE()) {
      tce.captureBaseline();
    }
    const status = testingInterface.spawnTest(testingFrameworks, tests);
    if (status === 0) {
      console.log(chalk.green("\nPre-test OK.\n"));
    } else {
      throw new Error(chalk.red("\nError: Pre-test failed - original tests should pass."));
    }
  } else {
    throw new Error(chalk.red("\nError: Pre-test failed - original contracts should compile."));
  }
}


/* ============================================================
 * MUTATION TESTING
 * ============================================================
*/

/**
 * Runs the complete mutation-testing workflow: pre-test, mutant generation, and mutant execution.
 *
 * @param {string} [startHash] - ID of the first mutant to test.
 * @param {string} [endHash] - ID of the last mutant to test, inclusive.
 * @returns {void}
 */
function test(startHash, endHash) {
  utils.cleanResultsDir();
  const context = setup();

  withSelectedFiles(context, (contracts, tests) => {

    // Generate the mutations
    const { mutations: generatedMutations, mutantGenerationTime } = generateMutations(contracts);
    htmlReporter.generateReport();

    // Run the original test suite before mutation testing
    const { duration: pretestTime } = measureExecutionTime(() => {
      preTest(contracts, tests, context.testingFrameworks);
    });

    // Restrict mutation testing to the requested range.
    const mutations = selectMutationRange(generatedMutations, startHash, endHash);

    reporter.logStartMutationTesting();
    const { duration: mutationTestingTime } = measureExecutionTime(() => {
      runTest(mutations, tests, context.testingFrameworks);
    });

    reporter.logTestSummary(pretestTime, mutantGenerationTime, mutationTestingTime);
    reporter.saveResultsHistory();
  })
}

/**
 * Applies each mutant in sequence, records compilation and test timings, assigns
 * its final status, updates reports, and restores the original source.
 *
 * @param {Object[]} mutations - Mutations to execute
 * @param {string[]} tests - Tests to run against each mutant
 * @param {string[]} testingFrameworks - Detected testing framework(s) * 
 * 
 * @returns {void}
 */
function runTest(mutations, tests, testingFrameworks) {
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];

    reporter.logMutationProgress(i + 1, mutations.length, mutation);
    mutation.apply();

    //Compile the mutant
    reporter.logCompile(mutation);

    const { result: isCompiled, duration: compilationTime } = measureExecutionTime(() =>
      testingInterface.spawnCompile(testingFrameworks));
    mutation.compilationTime = compilationTime;

    if (isCompiled) {

      // Run TCE on the mutant.
      if (utils.getTCE()) {
        const tceBytecodeKind = mutation.functionName === "constructor" ? "creation" : "runtime";

        if (tce.hasBaseline(tceBytecodeKind)) {
          const tceResult = tce.compareWithBaseline(tceBytecodeKind);
          if (tceResult.equivalent) {
            mutation.status = "equivalent";
            mutation.totalTime = mutation.compilationTime;
            reporter.updateMutantStatus(mutation);
            mutation.restore();
            continue;
          }
        }
      }

      // Test the mutant
      reporter.logTest(mutation);
      const { result: testingResult, duration: testingTime } = measureExecutionTime(() =>
        testingInterface.spawnTest(testingFrameworks, tests));
      mutation.testingTime = testingTime;
      mutation.totalTime = mutation.compilationTime + mutation.testingTime;

      switch (testingResult) {
        case 0: mutation.status = "live"; break;
        case 999: mutation.status = "timedout"; break;
        default: mutation.status = "killed";
      }
      reporter.updateMutantStatus(mutation);
      mutation.restore();
    }
    else {
      mutation.status = "uncompilable";
      mutation.totalTime = mutation.compilationTime;
      reporter.updateMutantStatus(mutation);
      mutation.restore();
    }
  }
}

/**
 * Selects an inclusive mutant range. With only a start ID, selection continues
 * through the final mutant.
 *
 * @param {Object[]} mutations - Ordered mutations to filter.
 * @param {string} [startHash] - First mutant ID to include.
 * @param {string} [endHash] - Last mutant ID to include.
 * @returns {Object[]} Selected mutations in their original order.
 * @throws {Error} If either ID is unknown or the range is reversed.
 */
function selectMutationRange(mutations, startHash, endHash) {
  if (!startHash) {
    return mutations;
  }

  const startIndex = mutations.findIndex(mutation => mutation.id === startHash);
  if (startIndex === -1) {
    throw new Error(chalk.red("Error: The specified start hash does not correspond to any generated mutant."));
  }

  let endIndex = mutations.length - 1;
  if (endHash) {
    endIndex = mutations.findIndex(mutation => mutation.id === endHash);
    if (endIndex === -1) {
      throw new Error(chalk.red("Error: The specified end hash does not correspond to any generated mutant."));
    }
    if (endIndex < startIndex) {
      throw new Error(chalk.red("Error: The specified end hash occurs before the start hash."));
    }
  }

  return mutations.slice(startIndex, endIndex + 1);
}

/* ============================================================
 * CONTRACT AND TEST SELECTION
 * ============================================================
*/

/**
 * Resolves and selects the configured contract and test files.
 * @param {Object} context - The mutation testing context (includes contractsDir, testDir, and testingFrameworks )
 * @param {(contracts: string[], tests: string[]) => void} callback -  Workflow that consumes the selected files.
 * @returns {void}
 */
function withSelectedFiles({ contractsDir, testDir, testingFrameworks }, callback) {

  glob(contractsDir + contractsGlob, (contractsError, contracts) => {
    if (contractsError) {
      throw contractsError;
    }

    glob(testDir + testsGlob, (testsError, tests) => {
      if (testsError) {
        throw testsError;
      }

      callback(contractSelection(contracts), testSelection(tests, testingFrameworks));
    });
  });
}

/**
 * Removes contracts excluded by the configured skip list.
 *
 * @param {string[]} files - Discovered contract files.
 * @returns {string[]} Contracts eligible for mutation.
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
 * Removes skipped tests and files incompatible with the active test frameworks.
 *
 * @param {string[]} files - Discovered test files.
 * @returns {string[]} Tests eligible for execution.
 */
function testSelection(files, testingFrameworks) {
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

/* ============================================================
 * MUTATION OPERATORS
 * ============================================================
*/

/**
 * Enables the requested mutation operators, or all operators when none are given.
 *
 * @param {string[]} args - Operator IDs to enable.
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
 * Disables the requested operators or operator groups, or all when none are given.
 *
 * @param {string[]} args - Operator IDs or group names to disable.
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
 * Prints the list of all mutation operators together with their
 * status (i.e., enabled or disabled).
 *
 * @returns {void}
 */
function logOperators() {
  console.log(mutGen.logOperatorsStatus());
}


/**********************************************************
 * TIMING HELPERS
 **********************************************************/

/**
 * Executes a synchronous function and measures its duration.
 *
 * @template T
 * @param {() => T} operation - Operation to execute.
 * @returns {{ result: T, duration: number }} - The operation result and elapsed time in milliseconds.
 */
function measureExecutionTime(operation) {
  const startTime = performance.now();
  const result = operation();
  const duration = Math.round(performance.now() - startTime);

  return { result, duration };
}

module.exports = {
  lookup: lookup,
  mutate: mutate,
  pretest: runPreTest,
  test: test,
  list: logOperators,
  enable: enableOperator,
  disable: disableOperator
}
