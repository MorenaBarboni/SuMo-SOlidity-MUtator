const chalk = require('chalk')
const fs = require('fs')
const config = require('./config')
const aliveDir = config.aliveDir
const killedDir = config.killedDir

function Reporter() {
  this.survived = []
  this.killed = []
  this.stillborn = []
}

Reporter.prototype._formatMutant = function(mutant) {
  return chalk.green(mutant.hash())
}

Reporter.prototype.beginMutant = function(mutant) {
  const hash = mutant.hash()

  console.log('Applying mutation ' + hash + ' to ' + mutant.file)
  process.stdout.write(mutant.diff())
  console.log('Running tests for mutation ' + hash)
}

Reporter.prototype.beginCompile = function(mutant) {
  const hash = mutant.hash()
  console.log('\nCompiling mutation ' + hash + ' of ' + mutant.file)
}

Reporter.prototype.mutantSurvived = function(mutant) {
  this.survived.push(mutant)
  console.log('Mutant ' + this._formatMutant(mutant) + ' survived testing.')
  fs.writeFileSync(aliveDir+"/mutant-" +mutant.hash()+".sol", mutant.printMutation(), function (err) {
    if (err) return console.log(err);
  });
}

Reporter.prototype.mutantKilled = function(mutant) {
  this.killed.push(mutant)
  console.log(
    'Mutant ' + this._formatMutant(mutant) + ' was killed by tests.'
  )
  fs.writeFileSync(killedDir+"/mutant-" +mutant.hash()+".sol", mutant.printMutation(), function (err) {
    if (err) return console.log(err);
  });
}

Reporter.prototype.mutantStillborn = function(mutant) {
  this.stillborn.push(mutant)  
}

//Prints preflight summary to console 
Reporter.prototype.preflightSummary = function(mutations) {
  console.log('----------------------')
  console.log(' '+mutations.length + ' mutation(s) found. ')
  console.log('----------------------')

  for (const mutation of mutations) {
    console.log(mutation.file + ':' + mutation.hash() + ':')
    process.stdout.write(mutation.diff())
  }
}

//Prints test summary to console 
Reporter.prototype.testSummary = function() {
  console.log('\n--- Summary ---')
  console.log(
    this.survived.length +
      ' mutants survived testing.\n ' +
      this.killed.length +
      ' mutants killed.\n' +
      this.stillborn.length +
      ' mutants stillborn.'
  )
  if(this.survived.length > 0){
    console.log(
      'Alive: ' + this.survived.map(m => this._formatMutant(m)).join(', ')
    )
  }
}

//Setup test report
Reporter.prototype.setupReport = function(mutationsLength, generationTime) { 
  fs.writeFileSync(".sumo/report.txt", "################################################ REPORT ################################################\n\n------------------------------------------- GENERATED MUTANTS ------------------------------------------ \n", function (err) {
    if (err) return console.log(err);
  }) 
}

//Save generated mutations to report
Reporter.prototype.saveGeneratedMutants = function(fileString, mutantString) {
  
  fs.appendFileSync(".sumo/report.txt", fileString + mutantString, {'flags': 'a'}, function (err) {
    if (err) return console.log(err);
  })  
}

//Save mutants generation time to report
Reporter.prototype.saveGenerationTime = function(mutationsLength, generationTime) { 
  fs.appendFileSync(".sumo/report.txt", "\n"+ mutationsLength + " mutant(s) found in " +generationTime+ " seconds. \n", function (err) {
    if (err) return console.log(err);
  }) 
}

//Save test results to report
Reporter.prototype.printTestReport = function(time) {
  const validMutants = this.survived.length + this.killed.length;
  const stillbornMutants = this.stillborn.length;
  const totalMutants = validMutants + stillbornMutants
  const mutationScore = ((this.killed.length / validMutants)*100).toFixed(2);
  var printString = '\n ---------------------- TEST REPORT --------------------- \n\n  '
   +totalMutants + ' mutant(s) tested in '  + time +' minutes.'  
   +'\n\n - Total mutants: '  + totalMutants  
   + '\n\n - Valid mutants: '+  validMutants 
   +'\n\n - Stillborn mutants:'  + stillbornMutants;

   if(this.stillborn.length > 0)
   printString = printString + '\n --- Stillborn: ' +  JSON.stringify(this.stillborn.map(m => m.hash()).join(', '));

   printString = printString + '\n\n - Live mutants: ' + this.survived.length;

  if(this.survived.length > 0)
    printString = printString + '\n --- Live: ' + JSON.stringify(this.survived.map(m => m.hash()).join(', '));

  printString = printString + '\n\n - Killed mutants: ' + this.killed.length;

  if(this.killed.length > 0)
     printString = printString + '\n --- Killed: ' +  JSON.stringify(this.killed.map(m => m.hash()).join(', '));

  printString = printString + '\n\n Mutation Score = ' +mutationScore
     
  fs.appendFileSync(".sumo/report.txt", printString,  {'flags': 'a'}, function (err) {
    if (err) return console.log(err);
  })  
}


module.exports = Reporter
