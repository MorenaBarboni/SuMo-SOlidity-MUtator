const copy = require('recursive-copy')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const parser = require('@solidity-parser/parser')
const operators = require('./operators')
const config = require('./config')
const mutationsConfig = require('./mutations.config')

const Reporter = require('./reporter')
const { spawnSync } = require('child_process');


const baselineDir = config.baselineDir
const projectDir = config.projectDir
const contractsDir = config.contractsDir
const contractsGlob = config.contractsGlob
const aliveDir = config.aliveDir
const killedDir = config.killedDir
const OS = config.OS
const packageManager = config.packageManager
const ignoreList = mutationsConfig.ignore;


//var testFiles = []

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
  if(contractsDir === '' || projectDir === ''){
    console.error('Project directory is missing.')
    process.exit(1)
  }
  mkdirp(baselineDir, () =>
    copy(contractsDir, baselineDir, { dot: true }, callback)
  )
  mkdirp(aliveDir);
  mkdirp(killedDir);
}

function generateAllMutations(files) {
  reporter.setupReport()
  let mutations = []
  var startTime = Date.now()
  for (const file of files) { 
    if(!config.ignore.includes(file)) {
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

function preflight() {
   prepare(() =>
    glob(contractsDir + contractsGlob, (err, files) => {
      const mutations = generateAllMutations(files)
      reporter.preflightSummary(mutations)
    })
  )
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

//Compiles each mutant
function compile(mutation, thisReporter){
 const reporter = thisReporter
 
    mutation.apply()
    reporter.beginCompile(mutation)    
     const result = compileMutants()
    if (result) {
      console.log("Mutant successfully compiled.")
    }  else {
      console.log("Mutant could not be compiled.")    
      reporter.mutantStillborn(mutation)
    }      
    return result
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

          var isCompiled = compile(mutation, reporter)
          if (isCompiled) {
            reporter.beginMutant(mutation)
            const result = runTests()
            if (result) {
              reporter.mutantSurvived(mutation)
              if (argv.failfast) process.exit(1)
            } else {
              reporter.mutantKilled(mutation)
            }
          }
          mutation.restore()
        }
        else{
          console.log("Mutant " +mutation.hash() + ' ... skipped.')
        }
      }
      var testTime = ((Date.now() - startTime) / 60000).toFixed(2)
      reporter.testSummary()
      reporter.printTestReport(testTime)
    })
  )
}

function runTests() {
  var status
  if(OS === 'Windows'){
    const child = spawnSync(packageManager+'.cmd', ["test"], {cwd: projectDir, timeout:300000});     
    status = child.status === 0;   

  }else if (OS === 'Linux'){
    const child = spawnSync(packageManager ["test"], {cwd: projectDir, timeout:300000});  
    status = child.status === 0;   

  }else{
    console.error('Project configuration is wrong or missing.')
    process.exit(1)
  }
  return status
}

//Compiles each mutant
function compileMutants() {
  var status
  if(OS === 'Windows'){
    const child = spawnSync(packageManager+'.cmd', ["compile"], {cwd: projectDir});     
    status = child.status === 0;   
  }else if (OS === 'Linux'){
    const child = spawnSync(packageManager ["compile"], {cwd: projectDir});  
    status = child.status === 0;   
  }else{
    console.error('Project configuration is wrong or missing.')
    process.exit(1)
  }  
  return status
}

//Checks which operators are currently enabled
function enabledOperators() {
  console.log(operator.getEnabledOperators());
}

//Enables a mutation operator
function enableOperator(ID) {
   //Enable all operators
  if(!ID){
    var success = operator.enableAll();
    if (success)
      console.log("All mutation operators enabled.");
    else
      console.log("Error");
  }else{
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
  if(!ID){
    var success = operator.disableAll();
    if (success)
      console.log("All mutation operators disabled.");
    else
      console.log("Error");
  }else{
  //Disable operator ID
    var success = operator.disable(ID);
    if (success)
      console.log(ID + " disabled.");
    else
      console.log(ID + " does not exist.");
  }
}

module.exports = {test: test, preflight, preflight, diff: diff, list:enabledOperators,
  enable:enableOperator, disable:disableOperator }

