const copy = require('recursive-copy')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const parser = require('@solidity-parser/parser')
const config = require('./config')
const mutationsConfig = require('./mutations.config')

const Reporter = require('./reporter')
const testingInterface = require("./testingInterface");
const mutationGenerator = require("./operators/mutationGenerator");
const utils = require("./utils");


const { mutantsDir } = require('./config')


const baselineDir = config.baselineDir
const projectDir = config.projectDir
const contractsDir = config.contractsDir
const contractsGlob = config.contractsGlob
const packageManagerGlob = config.packageManagerGlob;
var packageManager;
var runScript;
const aliveDir = config.aliveDir
const killedDir = config.killedDir
const ignoreList = mutationsConfig.ignore;

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
  if (contractsDir === '' || projectDir === '') {
    console.error('Project directory is missing.')
    process.exit(1)
  }

  //Checks the package manager used by the SUT
  let packageManagerFile;
  for (const lockFile of packageManagerGlob) {
    if (fs.existsSync(projectDir + lockFile)) {
      packageManagerFile = lockFile;
      if (lockFile.includes("yarn")) {
        packageManager = "yarn";
        runScript = "run";
      } else {
        packageManager = "npm";
        runScript = "run-script";
      }
      break;
    }
  }

  if (!packageManagerFile) {
    console.error("Target project does not contain a suitable lock file.");
    process.exit(1);
  }

  mkdirp(baselineDir, () =>
    copy(contractsDir, baselineDir, { dot: true }, callback)
  )
  mkdirp(aliveDir);
  mkdirp(killedDir);
  mkdirp(mutantsDir);  
}

/**
 * Shows a summary of the available mutants without starting the testing process.
 */
 function preflight() {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
      if (err) throw err;
      const mutations = generateAllMutations(files)
      reporter.preflightSummary(mutations)
    })
  );
}

/**
 * Shows a summary of the available mutants without starting the testing process and
 * saves the mutants to file.
 */
 function preflightAndSave() {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
      if (err) throw err;
      const mutations = generateAllMutations(files);
      for (const mutation of mutations) {
        mutation.save();
      }
      reporter.preflightSummary(mutations);
      console.log("Mutants saved to file");
    })
  );
}

/**
 * Generates  the mutations for each target contract
 *  @param files The smart contracts under test
 */
function generateAllMutations(files) {
  reporter.setupReport()
  let mutations = []
  var startTime = Date.now()
  for (const file of files) {
    if (!config.ignore.includes(file)) {
      const source = fs.readFileSync(file, 'utf8')
      const ast = parser.parse(source, { range: true })
      const visit = parser.visit.bind(parser, ast)
      mutations = mutations.concat(mutGen.getMutations(file, source, visit))
    }
  }
  var generationTime = (Date.now() - startTime) / 1000
  reporter.saveGenerationTime(mutations.length, generationTime)
  return mutations
}

function mutationsByHash(mutations) {
  return mutations.reduce((obj, mutation) => {
    obj[mutation.hash()] = mutation
    return obj
  }, {})
}

function diff(argv) {
  prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
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
 * Starts the mutation testing process
 */
function test() {

  prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      //Generate mutations
      const mutations = generateAllMutations(files)

      //Compile and test each mutant
      reporter.beginMutationTesting();
      var startTime = Date.now();

      for (const mutation of mutations) {

        if (!ignoreList.includes(mutation.hash())) {
          if (config.ganache) {
            ganacheChild = testingInterface.spawnGanache();
          }
          mutation.apply();
          const isCompiled = testingInterface.spawnCompile(packageManager, runScript);

          if (isCompiled) {
            reporter.beginTest(mutation)
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
          if (config.ganache) {
            testingInterface.killGanache();
            utils.cleanTmp();
          }
          reporter.mutantStatus(mutation);
          mutation.restore();
        }
        else {
          mutation.status = "equivalent";
          console.log("Mutant " + mutation.hash() + ' ... skipped.')
        }
      }
      var testTime = ((Date.now() - startTime) / 60000).toFixed(2);
      reporter.testSummary();
      reporter.printTestReport(testTime);
      reporter.saveOperatorsResults();
    })
  )
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

module.exports = {
  test: test, preflight, preflight, mutate: preflightAndSave, diff: diff, list: enabledOperators,
  enable: enableOperator, disable: disableOperator
}

