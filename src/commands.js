const copy = require('recursive-copy')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const parser = require('@solidity-parser/parser')
const operators = require('./operators')
const config = require('./config')
const mutationsConfig = require('./mutations.config')

const Reporter = require('./reporter')
const testingInterface = require("./testingInterface");
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

const operator = new operators.CompositeOperator([
  new operators.ACMOperator(),
  new operators.AOROperator(),
  new operators.AVROperator(),
  new operators.BCRDOperator(),
  new operators.BLROperator(),
  new operators.BOROperator(),
  new operators.CBDOperator(),
  new operators.CCDOperator(),
  new operators.CSCOperator(),
  new operators.DLROperator(),
  new operators.DODOperator(),
  new operators.ECSOperator(),
  new operators.EEDOperator(),
  new operators.EHCOperator(),
  new operators.EROperator(),
  new operators.ETROperator(),
  new operators.FVROperator(),
  new operators.GVROperator(),
  new operators.HLROperator(),
  new operators.ILROperator(),
  new operators.ICMOperator(),
  new operators.LSCOperator(),
  new operators.PKDOperator(),
  new operators.MCROperator(),
  new operators.MOCOperator(),
  new operators.MODOperator(),
  new operators.MOIOperator(),
  new operators.MOROperator(),
  new operators.OLFDOperator(),
  new operators.OMDOperator(),
  new operators.ORFDOperator(),
  new operators.RSDOperator(),
  new operators.RVSOperator(),
  new operators.SCECOperator(),
  new operators.SFIOperator(),
  new operators.SFDOperator(),
  new operators.SFROperator(),
  new operators.SKDOperator(),
  new operators.SKIOperator(),
  new operators.SLROperator(),
  new operators.TOROperator(),
  new operators.UORDOperator(),
  new operators.VUROperator(),
  new operators.VVROperator()
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

function generateAllMutations(files) {
  reporter.setupReport()
  let mutations = []
  var startTime = Date.now()
  for (const file of files) {
    if (!config.ignore.includes(file)) {
      const source = fs.readFileSync(file, 'utf8')
      const ast = parser.parse(source, { range: true })
      const visit = parser.visit.bind(parser, ast)
      mutations = mutations.concat(operator.getMutations(file, source, visit))
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

function test(argv) {

  prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      //Generate mutations
      const mutations = generateAllMutations(files)

      //Compile and test each mutant
      var startTime = Date.now()
      for (const mutation of mutations) {

        if (!ignoreList.includes(mutation.hash())) {
          if (config.ganache) {
            ganacheChild = testingInterface.spawnGanache();
          }
          mutation.apply();
          const isCompiled = testingInterface.spawnCompile(packageManager, runScript);

          if (isCompiled) {
            reporter.beginMutant(mutation)
            const result = testingInterface.spawnTest(packageManager, runScript)
            if (result === 0) {
              reporter.mutantSurvived(mutation)
              if (argv.failfast) process.exit(1)
            } else {
              reporter.mutantKilled(mutation)
            }
          }
          if (config.ganache) {
            testingInterface.killGanache();
            utils.cleanTmp();
          }
          mutation.restore()
        }
        else {
          console.log("Mutant " + mutation.hash() + ' ... skipped.')
        }
      }
      var testTime = ((Date.now() - startTime) / 60000).toFixed(2)
      reporter.testSummary()
      reporter.printTestReport(testTime)
    })
  )
}


//Checks which operators are currently enabled
function enabledOperators() {
  console.log(operator.getEnabledOperators());
}

//Enables a mutation operator
function enableOperator(ID) {
  //Enable all operators
  if (!ID) {
    var success = operator.enableAll();
    if (success)
      console.log("All mutation operators enabled.");
    else
      console.log("Error");
  } else {
    //Enable operator ID
    var success = operator.enable(ID);
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
    var success = operator.disableAll();
    if (success)
      console.log("All mutation operators disabled.");
    else
      console.log("Error");
  } else {
    //Disable operator ID
    var success = operator.disable(ID);
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

