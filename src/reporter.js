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

Reporter.prototype.summary = function() {
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


/*Appends stillborn mutants information to report */
Reporter.prototype.printStillbornReport = function() {
  var printString;
  var stillbornNumber = this.stillborn.length;
  if(stillbornNumber == 0){
    printString = '\n --------- STILLBORN MUTANTS --------- \n\n No stillborn mutants generated.\n'
  }else{
    printString = '\n --------- STILLBORN MUTANTS --------- \n\n '
    +stillbornNumber+' stillborn mutants generated.\n'+
     ' --- Stillborn: ' + JSON.stringify(this.stillborn.map(m => m.hash()).join(', ')) +'\n';
  }
  fs.appendFileSync(".sumo/report.txt", printString,  {'flags': 'a'}, function (err) {
    if (err) return console.log(err);
  })
}

/*Writes test report to file */
Reporter.prototype.printTestReport = function() {
  const totalMutants = this.survived.length + this.killed.length;
  const mutationScore = ((this.killed.length / totalMutants)*100).toFixed(2);
  var printString = '\n --------- TEST REPORT --------- \n\n - Valid mutants: ' + totalMutants+ '\n - Alive mutants: '+
  this.survived.length;

  if(this.survived.length > 0)
    printString = printString + '\n --- Alive: ' + JSON.stringify(this.survived.map(m => m.hash()).join(', '));

  printString = printString + '\n - Killed mutants: ' + this.killed.length;

  if(this.killed.length > 0)
     printString = printString + '\n --- Killed: ' +  JSON.stringify(this.killed.map(m => m.hash()).join(', '));

  printString = printString + '\n\n Mutation Score = ' +mutationScore
     
  fs.appendFileSync(".sumo/report.txt", printString,  {'flags': 'a'}, function (err) {
    if (err) return console.log(err);
  })  
}

module.exports = Reporter
