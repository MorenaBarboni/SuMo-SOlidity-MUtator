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
var runScript;
var compiledArtifacts = [];
var originalBytecodeMap = new Map();

const reporter = new Reporter()

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

  //Checks the package manager used by the SUT
  let pmConfig = utils.getPackageManager()
  packageManager = pmConfig.packageManager;
  runScript = pmConfig.runScript;

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
    glob(config.contractsDir + contractsGlob, (err, contracFiles) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, testFiles) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(contracFiles);
        let testsToBeRun = testSelection(testFiles);
        reporter.printFilesUnderTest(contractsUnderMutation, testsToBeRun);
        const mutations = generateAllMutations(contractsUnderMutation)
        reporter.preflightSummary(mutations)
      })
    })
  );
}

/**
 * Shows a summary of the available mutants without starting the testing process and
 * saves the mutants to file.
 */
function preflightAndSave() {
  prepare(() =>
    glob(config.contractsDir + contractsGlob, (err, files) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, testFiles) => {
        if (err) throw err;
        let contractsUnderMutation = contractSelection(files);
        let testsToBeRun = testSelection(testFiles);
        reporter.printFilesUnderTest(contractsUnderMutation, testsToBeRun);
        reporter.printFilesUnderTest(contractsUnderMutation);
        const mutations = generateAllMutations(files);
        for (const mutation of mutations) {
          mutation.save();
        }
        reporter.preflightSummary(mutations);
        console.log("Mutants saved to file");
      })
    })
  );
}

/**
 * Generates  the mutations for each target contract
 *  @param files The smart contracts under test
 */
function generateAllMutations(files) {
  reporter.setupReport();

  let mutations = []
  var startTime = Date.now()
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const ast = parser.parse(source, { range: true, loc: true })
    const visit = parser.visit.bind(parser, ast)
    mutations = mutations.concat(mutGen.getMutations(file, source, visit))
  }
  var generationTime = (Date.now() - startTime) / 1000
  reporter.saveGenerationTime(mutations.length, generationTime)
  for (const m of mutations) {
    reporter.extractCoverageInfo(m);

  }
  return mutations
}

/**
 * Runs the original test suite to ensure that all tests pass.
 */
function preTest() {
  reporter.beginPretest();
  reporter.setupLog();

  utils.cleanBuildDir(); //Remove old compiled artifacts

  let ganacheChild = testingInterface.spawnGanache();
  const isCompiled = testingInterface.spawnCompile(packageManager, runScript);

  if (isCompiled) {
    const status = testingInterface.spawnTest(packageManager, runScript);
    if (status === 0) {
      console.log("Pre-test OK.");
    } else {
      testingInterface.killGanache(ganacheChild);
      console.error(chalk.red("Error: Original tests should pass."));
      process.exit(1);
    }
  } else {
    testingInterface.killGanache(ganacheChild);
    console.error(chalk.red("Error: Original contracts should compile."));
    process.exit(1);
  }
  testingInterface.killGanache(ganacheChild);
}


/**
 * Starts the mutation testing process
 */
function test() {

  prepare(() =>
    glob(config.contractsDir + contractsGlob, (err, files) => {
      if (err) throw err;
      glob(config.testDir + testsGlob, (err, testFiles) => {
        if (err) {
          console.error(err)
          process.exit(1)
        }

        if (!files.length) {
          console.error("Contract directory is empty")
          process.exit()
        }

        //Run the pre-test and compile the original contracts
        preTest();

        if (config.tce) {
          //save the bytecode of the original contracts
          exploreDirectories(config.buildDir)
          compiledArtifacts.map(artifact => {
            for (const file of files) {
              if (parse(artifact).name === parse(file).name) {
                originalBytecodeMap.set(parse(file).name, saveBytecodeSync(artifact))
              }
            }
          })
        }

        let contractsUnderMutation = contractSelection(files);
        let testsToBeRun = testSelection(testFiles);
        unlinkTests(testFiles, testsToBeRun);
        reporter.printFilesUnderTest(contractsUnderMutation, testsToBeRun);

        //Generate mutations
        const mutations = generateAllMutations(contractsUnderMutation)

        //Compile and test each mutant
        reporter.beginMutationTesting();
        var startTime = Date.now();

        for (const file of files) {
          console.log("Testing mutants of " + file)
          runTest(mutations, file);
        }
        var testTime = ((Date.now() - startTime) / 60000).toFixed(2);
        utils.restoreTestDir();
        reporter.testSummary();
        reporter.printTestReport(testTime);
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
function runTest(mutations, file) {
  const mutantBytecodeMap = new Map();

  for (const mutation of mutations) {
    if ((parse(mutation.file).name) === (parse(file).name)) {
      let ganacheChild = testingInterface.spawnGanache();
      mutation.apply();
      reporter.beginCompile(mutation);
      const isCompiled = testingInterface.spawnCompile(packageManager, runScript);

      if (isCompiled) {
        if (config.tce) {
          tce(mutation, mutantBytecodeMap, originalBytecodeMap);
        }
        if (mutation.status !== "redundant" && mutation.status !== "equivalent") {
          reporter.beginTest(mutation);
          let startTestTime = Date.now();
          const result = testingInterface.spawnTest(packageManager, runScript)
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
      if (mutation.status !== "redunant") {
        reporter.writeLog(mutation, null);
      }
      reporter.mutantStatus(mutation);
      mutation.restore();
      testingInterface.killGanache(ganacheChild);
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
      console.log("All mutation operators enabled.");
    else
      console.log("Error");
  } else {
    //Enable operator ID
    var success = mutGen.enable(ID);
    if (success)
      console.log(ID + " enabled.");
    else
      console.log(ID + " does not exist.");
  }
}

//Disables a mutation operator 
function disableOperator(ID) {
  //Disable all operators
  if (!ID) {
    var success = mutGen.disableAll();
    if (success)
      console.log("All mutation operators disabled.");
    else
      console.log("Error");
  } else {
    //Disable operator ID
    var success = mutGen.disable(ID);
    if (success)
      console.log(ID + " disabled.");
    else
      console.log(ID + " does not exist.");
  }
}

function mutationsByHash(mutations) {
  return mutations.reduce((obj, mutation) => {
    obj[mutation.hash()] = mutation
    return obj
  }, {})
}

function diff(argv) {
  prepare(() =>
    glob(config.contractsDir + contractsGlob, (err, files) => {
      const mutations = generateAllMutations(files)
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
 * The <b>tce()</b> function provides to compare bytecode of the all contracts used up to that point, and it can set status of the mutated contract
 * in two different cases. "equivalent" status is assigned to the mutated contract that has the same bytecode of the non-mutated contract. "redundant"
 * status is assigned to the mutated contract that has the same bytecode of another mutated contract already tested.
 * @param mutation The mutated contract
 * @param map The map of the already tested mutated contract
 * @param originalBytecodeMap The map that contains the original contract bytecode
 */
function tce(mutation, map, originalBytecodeMap) {
  console.log();
  console.log(chalk.yellow('Running the TCE'));
  var file = mutation.file;
  let fileName = parse(file).name;

  compiledArtifacts = [];

  exploreDirectories(config.buildDir)
  compiledArtifacts.map(artifact => {
    if (parse(artifact).name === parse(mutation.file).name) {
      mutation.bytecode = saveBytecodeSync(artifact);
    }
  })

  //console.log("original")
  //console.log( originalBytecodeMap.get(fileName))

  //console.log("mutant")
  //console.log( mutation.bytecode)

  if (originalBytecodeMap.get(fileName) === mutation.bytecode) {
    mutation.status = "equivalent";
  } else if (map.size !== 0) {
    for (const key of map.keys()) {
      if (map.get(key) === mutation.bytecode) {
        mutation.status = "redundant";
        reporter.writeLog(mutation, key);
        break;
      }
    }
    if (mutation.status !== "redundant") {
      map.set(mutation.hash(), mutation.bytecode);
    }

  } else {
    map.set(mutation.hash(), mutation.bytecode);
  }
}


function exploreDirectories(Directory) {
  fs.readdirSync(Directory).forEach(File => {
    const Absolute = path.join(Directory, File);
    if (fs.statSync(Absolute).isDirectory())
      return exploreDirectories(Absolute);
    else
      return compiledArtifacts.push(Absolute);
  });
}

/**
 *The <b>saveBytecodeSync</b> function return the original bytecode of a certain contract
 * @param file The name of the original contract
 * @returns {*} The bytecode
 */
function saveBytecodeSync(file) {
  var mutantBytecode;
  try {
    const data = fs.readFileSync(file, "utf-8");
    var json = JSON.parse(data);
    mutantBytecode = json.bytecode;
    return mutantBytecode;
  } catch (err) {
    console.log(chalk.red('Artifact not found!!'));
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

/**
 * Unliks tests that must not be run
 * @param allTestFiles all test files
 * @param testFilesToBeRun tests to be kept
 * 
 */
function unlinkTests(allTestFiles, testFilesToBeRun) {
  for (const test of allTestFiles) {
    console.log(testFilesToBeRun)
    if (!testFilesToBeRun.includes(test)) {
      fs.unlinkSync(test);
    }
  }
}


module.exports = {
  test: test, preflight, preflight, mutate: preflightAndSave, diff: diff, list: enabledOperators,
  enable: enableOperator, disable: disableOperator
}

