const chalk = require('chalk')
const jsdiff = require('diff')
const fs = require('fs')
const sha1 = require('sha1')
const path = require('path')
const utils = require('./utils')
const mutantsDir = utils.config.mutantsDir;
const baselineDir = utils.config.baselineDir;


function Mutation(file, start, end, startLine, endLine, original, replace, operator, status = null, testingTime = null, id = null) {
  this.file = file;
  this.start = start;
  this.end = end;
  this.startLine = startLine;
  this.endLine = endLine;
  this.original = original;
  this.replace = replace;
  this.operator = operator;
  this.status = status;
  this.testingTime = testingTime;
  this.id = this.hash();
}

/**
 * Stringifies a mutation
 * @returns the stringified json mutation
 */
Mutation.prototype.toJson = function () {
  var m = new Mutation(this.file, this.start, this.end, this.startLine, this.endLine, this.original, this.replace, this.operator, this.status, this.testingTime, this.id);
  return JSON.stringify(m, null, "\t");
}

/**
 * Compute the mutation hash
 *  @returns the mutant hash
 */
Mutation.prototype.hash = function () {
  const input = [path.basename(this.file), this.start, this.end, this.replace].join(':')
  return "m" + sha1(input).slice(0, 8)
}

/**
 * Saves a mutant to .sol file (apply and restore)
 */
Mutation.prototype.save = function () {
  const original = fs.readFileSync(this.file, "utf8");
  const mutated = this.applyToString(original);

  var contractName = path.basename(this.file);

  fs.writeFileSync(mutantsDir + "/" + contractName + "-" + this.hash() + ".sol", mutated, function (err) {
    if (err) return console.log(err);
  });

  fs.writeFileSync(this.file, original, "utf8");
};

/**
 * Show colored mutation diff
 * @returns colored diff
 */
Mutation.prototype.diff = function () {
  const original = fs.readFileSync(this.baseline(), 'utf8');
  const mutated = this.applyToString(original);

  let diff = jsdiff.diffLines(original, mutated);
  const lineNumber = this.getLine();
  const context = 2;

  diff = diff.filter(part => part.added || part.removed)
    .map(part => {
      const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
      const num = part.removed ? chalk.gray(lineNumber.toString().padStart(4) + ' | ') : chalk.gray('     | ');
      return num + chalk[color](part.value.replace(/\n$/, ''));
    });

  let lines = mutated.split('\n')
    .map((line, i) => chalk.gray((i + 1).toString().padStart(4) + ' | ' + line));

  lines.splice(lineNumber - 1, 1, diff[0], diff[1]);

  lines = lines.slice(Math.max(0, lineNumber - context - 1), lineNumber + context + 1);

  return lines.join('\n') + '\n';
};

/**
* Restore a contract from its mutation
* @dev Original credit to Federico Bond under MIT license (https://github.com/federicobond/eth-mutants/blob/master/src/mutation.js)
*/
Mutation.prototype.restore = function () {
  const baseline = this.baseline()

  console.log('Restoring ' + this.file)

  const original = fs.readFileSync(baseline, 'utf8')
  fs.writeFileSync(this.file, original, 'utf8')
}

/**
 * Get the mutation line number
 * @returns the line number
 */
Mutation.prototype.getLine = function () {
  const source = fs.readFileSync(this.baseline(), 'utf8');
  const index = source.indexOf('\n', this.start);
  const lineNumber = source.substring(0, index).split('\n').length;

  return lineNumber;
};

Mutation.prototype.baseline = function () {
  const contractsDir = utils.getContractsDir();
  return baselineDir + "/contracts" + this.file.substr(contractsDir.length);
}

/**
 * Gets the mutation file name
 * @returns the name of the mutated contract
 */
Mutation.prototype.fileName = function () {

  const lastIndex = this.file.lastIndexOf('/');
  let fileName = this.file.slice(lastIndex + 1);

  return fileName;
}

/**
* Apply replacement to original
* @param original original string to be mutated
* @returns the applied mutation
* @dev Original credit to Federico Bond under MIT license (https://github.com/federicobond/eth-mutants/blob/master/src/mutation.js)
*/
Mutation.prototype.applyToString = function (original) {
  return splice(original, this.start, this.end - this.start, this.replace)
}

/**
* Splice
* @dev Original credit to Federico Bond under MIT license (https://github.com/federicobond/eth-mutants/blob/master/src/mutation.js)
*/
function splice(str, start, length, replacement) {
  return str.substring(0, start) + replacement + str.substring(start + length)
}

/**
* Apply a mutation to its contract file
* @dev Original credit to Federico Bond under MIT license (https://github.com/federicobond/eth-mutants/blob/master/src/mutation.js)
*/
Mutation.prototype.apply = function () {
  const original = fs.readFileSync(this.file, 'utf8')
  const mutated = this.applyToString(original)

  fs.writeFileSync(this.file, mutated, 'utf8')
}

module.exports = Mutation
