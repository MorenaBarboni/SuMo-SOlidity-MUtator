const copy = require('recursive-copy')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const parser = require('@solidity-parser/parser')
const config = require('./config')
const chalk = require('chalk')
const path = require("path");
const { parse } = require("path");
const rimraf = require('rimraf')

const Reporter = require('./reporter')
const TceRunner = require('./tceRunner')
const testingInterface = require("./testingInterface");
const mutationGenerator = require("./operators/mutationGenerator");
const utils = require('./utils')

//SuMo configuration
const sumoDir = config.sumoDir;
const resultsDir = config.resultsDir
const baselineDir = config.baselineDir;
const projectDir = config.projectDir;
const contractsDir = config.contractsDir;
const testDir = config.testDir;
const buildDir = config.buildDir;
const equivalentDir = resultsDir + '/equivalent';
const liveDir = resultsDir + '/live';
const mutantsDir = resultsDir + '/mutants';
const redundantDir = resultsDir + '/redundant';
const stillbornDir = resultsDir + '/stillborn';
const timedoutDir = resultsDir + '/timedout';
const killedDir = resultsDir + '/killed';
const contractsGlob = config.contractsGlob;
const testsGlob = config.testsGlob;

var packageManager;

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
  if (sumoDir === "" || resultsDir === "" || baselineDir === "" ||
    projectDir === "" || contractsDir === "" || (config.tce && buildDir === '')) {
    console.error("SuMo configuration is incomplete or missing.");
    process.exit(1);
  }

  if (config.testingFramework !== "truffle" && config.testingFramework !== "hardhat" && config.testingFramework !== "custom") {
    console.error("The specified testing framework is not valid. \n The available options are:\n - truffle \n - hardhat \n - custom");
    process.exit(1);
  }

  if (config.network !== "ganache" && config.network !== "none") {
    console.error("The specified network is not valid. \n The available options are:\n - ganache \n - none");
    process.exit(1);
  }



  //Checks the package manager used by the SUT
  packageManager = utils.getPackageManager()

  if (fs.existsSync(baselineDir)) {
    rimraf(baselineDir, function () {
      //console.log("Baseline deleted");
      mkdirp(baselineDir, () =>
        copy(testDir, baselineDir + '/test', { dot: true },
          copy(contractsDir, baselineDir + '/contracts', { dot: true }, callback)))
    })
  } else {
    mkdirp(baselineDir, () =>
      copy(testDir, baselineDir + '/test', { dot: true },
        copy(contractsDir, baselineDir + '/contracts', { dot: true }, callback)))
  }

  mkdirp(mutantsDir);
  mkdirp(liveDir);
  mkdirp(killedDir);
  mkdirp(timedoutDir);
  mkdirp(stillbornDir);
  if (config.tce) {
    mkdirp(redundantDir);
    mkdirp(equivalentDir);
  }

}

/**
 * Shows a summary of the available mutants without starting the testing process.
 */
function preflight() {
  prepare(() =>
    glob(config.contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, tests) => {
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
    glob(config.contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, tests) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);
        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);
        reporter.logSelectedFiles(contractsUnderMutation);
        const mutations = generateAllMutations(contractsUnderMutation, true);
        for (const mutation of mutations) {
          mutation.save();
        }
        console.log("- Mutants saved to .sumo/results/mutants");
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
 * Runs the original test suite to ensure that all tests pass.
 */
function preTest(contractsUnderMutation, testsToBeRun) {

  reporter.logPretest();

  if (contractsUnderMutation.length == 0) {
    console.log(chalk.red("- No contracts to be mutated"))
    process.exit(1)
  }

  //run pretest on all test files regardless of regression
  if (testsToBeRun.length == 0) {
    console.log(chalk.red("- No tests to be evaluated"))
    process.exit(1)
  }

  utils.cleanBuildDir(); //Remove old compiled artifacts
  reporter.setupResultsCsv();

  let ganacheChild = testingInterface.spawnNetwork();
  const isCompiled = testingInterface.spawnCompile(packageManager);

  if (isCompiled) {
    const status = testingInterface.spawnTest(packageManager, testsToBeRun);
    if (status === 0) {
      console.log("Pre-test OK.");
    } else {
      testingInterface.killNetwork(ganacheChild);
      console.error(chalk.red("Error: Original tests should pass."));
      process.exit(1);
    }
  } else {
    testingInterface.killNetwork(ganacheChild);
    console.error(chalk.red("Error: Original contracts should compile."));
    process.exit(1);
  }
  testingInterface.killNetwork(ganacheChild);
}


/**
 * Starts the mutation testing process
 */
function test() {

  prepare(() =>
    glob(config.contractsDir + contractsGlob, (err, contracts) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, tests) => {
        if (err) {
          console.error(err)
          process.exit(1)
        }

        //Select contracts to mutate and test files to evaluate
        let contractsUnderMutation = contractSelection(contracts);
        let testsToBeRun = testSelection(tests);

        reporter.logSelectedFiles(contractsUnderMutation, testsToBeRun);

        //Run the pre-test and compile the original contracts
        preTest(contractsUnderMutation, testsToBeRun);

        if (config.tce) {
          //save the bytecode of the original contracts
          tceRunner.saveOriginalBytecode(contractsUnderMutation);
        }

        //Generate mutations
        const mutations = generateAllMutations(contractsUnderMutation, true)

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
    if ((parse(mutation.file).name) === (parse(file).name)) {
      let ganacheChild = testingInterface.spawnNetwork();
      mutation.apply();
      reporter.logCompile(mutation);
      const isCompiled = testingInterface.spawnCompile(packageManager);

      if (isCompiled) {
        if (config.tce) {
          mutation = tceRunner.runTce(mutation, mutantBytecodeMap, reporter);
        }
        if (mutation.status !== "redundant" && mutation.status !== "equivalent") {
          reporter.logTest(mutation);
          let startTestTime = Date.now();
          const result = testingInterface.spawnTest(packageManager, testsToBeRun)
          mutation.testingTime = Date.now() - startTestTime;
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
      if (mutation.status !== "redundant") {
        reporter.saveResultsCsv(mutation, null);
      }
      reporter.mutantStatus(mutation);
      mutation.restore();
      testingInterface.killNetwork(ganacheChild);
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
      console.log("> All mutation operators enabled.");
    else
      console.log("Error");
  } else {
    //Enable operator ID
    var success = mutGen.enable(ID);
    if (success)
      console.log("> " + chalk.bold.yellow(ID) + " enabled.");
    else
      console.log("> " + ID + " does not exist.");
  }
}

//Disables a mutation operator 
function disableOperator(ID) {
  //Disable all operators
  if (!ID) {
    var success = mutGen.disableAll();
    if (success)
      console.log("> All mutation operators disabled.");
    else
      console.log("Error");
  } else {
    //Disable operator ID
    var success = mutGen.disable(ID);
    if (success)
      console.log("> " + chalk.bold.yellow(ID) + " disabled.");
    else
      console.log("> " + ID + " does not exist.");
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
    glob(config.contractsDir + contractsGlob, (err, contracts) => {
      if (err) {
        console.log(err);
        process.exit(0);
      }
      const mutations = generateAllMutations(contracts, false)
      const index = mutationsByHash(mutations)
      if (!index[argv.hash]) {
        console.error('Mutation ' + argv.hash + ' not found.')
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
    for (const path of config.skipContracts) {
      if (file.startsWith(path) && path !== "") {
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
    for (const path of config.skipTests) {
      if (file.startsWith(path) && path !== "") {
        skipTest = true;
        break;
      }
    }
    if (!skipTest) {
      testsToBeRun.push(file)
    }
  }
  return testsToBeRun;
}

module.exports = {
  test: test, preflight, preflight, mutate: mutate, diff: diff, list: enabledOperators,
  enable: enableOperator, disable: disableOperator
}

