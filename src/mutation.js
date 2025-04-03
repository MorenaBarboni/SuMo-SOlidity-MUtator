// External modules
const chalk = require('chalk')
const jsdiff = require('diff')
const fs = require('fs')
const sha1 = require('sha1')
const path = require('path')
// Internal modules
const utils = require('./utils')
//SuMo static configuration
const { mutantsDir, baselineDir } = utils.staticConf;


/**
 * Represents a mutation applied to a Solidity smart contract.
 * Provides utilities to apply, revert, diff, and save mutants.
 */
class Mutation {

  /**
 * Creates an instance of a Mutation.
 * @param {string} file - Path to the original contract file.
 * @param {string} functionName - Name of the function containing the mutation.
 * @param {number} start - Start index (character) in the source code.
 * @param {number} end - End index (character) in the source code.
 * @param {number} startLine - Start line number of the mutation.
 * @param {number} endLine - End line number of the mutation.
 * @param {string} original - Original code being replaced.
 * @param {string} replace - Mutated code replacing the original.
 * @param {string} operator - ID of the mutation operator used.
 * @param {string|null} [status=null] - Result of mutation testing (e.g., killed, live).
 * @param {number|null} [testingTime=null] - Time taken to test this mutant in ms.
 * @param {string|null} [diff=null] - Diff summary for this mutation.
 * @param {string|null} [id=null] - Unique hash ID of the mutation.
 */
  constructor(file, functionName, start, end, startLine, endLine, original, replace, operator, status = null, testingTime = null, diff = null, id = null) {
    this.file = file
    this.functionName = functionName
    this.start = start
    this.end = end
    this.startLine = startLine
    this.endLine = endLine
    this.original = original
    this.replace = replace
    this.operator = operator
    this.status = status
    this.testingTime = testingTime
    this.id = this.hash()
    this.diff = this.diff()
  }

  /**
   * Applies the mutation to the original file on disk.
   * @returns {void}
   */
  apply() {
    const original = fs.readFileSync(this.file, 'utf8')
    const mutated = this.applyToString(original)

    fs.writeFileSync(this.file, mutated, 'utf8')
  }

  /**
  * Applies the mutation to a given string (in-memory).
  * @param {string} original - Original file content.
  * @returns {string} - Mutated version of the content.
  */
  applyToString(original) {
    return this.splice(original, this.start, this.end - this.start, this.replace)
  }


  /**
   * Gets the corresponding baseline path of the original contract.
   * @returns {string} - Path to the baseline file.
   */
  baseline() {
    const contractsDir = utils.getContractsDir()
    return baselineDir + "/contracts" + this.file.substr(contractsDir.length)
  }

  /**
   * Calculates the line number of the mutation in the baseline contract.
   * @returns {number} - Line number of the mutation.
   */
  getLine() {
    const source = fs.readFileSync(this.baseline(), 'utf8')
    const index = source.indexOf('\n', this.start)
    const lineNumber = source.substring(0, index).split('\n').length

    return lineNumber
  }

  /**
 * Generates a summary diff between the original and mutated contract.
 * Highlights modified sections and truncates long content for readability.
 * @returns {string} - Diff summary.
 */
  diff() {
    const original = fs.readFileSync(this.baseline(), 'utf8')
    const mutated = this.applyToString(original)

    // Generate line-by-line diff (using jsdiff)
    const diffParts = jsdiff.diffLines(original, mutated)
    const MAX_SUMMARY_LENGTH = 60 // threshold for summary length
    const mutatedLoc = this.endLine - (this.startLine - 1);
    const MIN_LINES_FOR_SUMMARY = 4 // threshold for number of lines before summarization

    // Identify the contiguous region with any changes.
    let firstChangeIndex = null, lastChangeIndex = null;
    for (let i = 0; i < diffParts.length; i++) {
      if (diffParts[i].added || diffParts[i].removed) {
        if (firstChangeIndex === null) {
          firstChangeIndex = i;
        }
        lastChangeIndex = i;
      }
    }

    // If no changes, return an empty summary.
    if (firstChangeIndex === null) {
      return ''
    }

    const impactedParts = diffParts.slice(firstChangeIndex, lastChangeIndex + 1)

    // Build arrays of lines for the original and mutated impacted regions.
    let originalLines = []
    let mutatedLines = []

    for (const part of impactedParts) {
      // Split into individual lines, filtering out any empty lines.
      const lines = part.value.split('\n').filter(line => line.trim() !== '')
      if (!part.added) {
        originalLines.push(...lines)
      }
      if (!part.removed) {
        mutatedLines.push(...lines)
      }
    }

    // Join arrays into full strings.
    const originalFull = originalLines.join(' ')
    const mutatedFull = mutatedLines.join(' ')

    // Helper function to abbreviate with focus on the mutant.
    // This function ensures that if the text is too long, a snippet around the focus text is returned.
    const abbreviateWithFocus = (fullText, focusText) => {
      const trimmed = fullText.trim()
      if (trimmed.length <= MAX_SUMMARY_LENGTH) return trimmed

      const focus = focusText ? focusText.trim() : ''
      const focusIndex = focus ? trimmed.indexOf(focus) : -1
      if (focusIndex !== -1) {
        const focusLength = focus.length
        let start = Math.max(0, focusIndex - Math.floor((MAX_SUMMARY_LENGTH - focusLength) / 2))
        let end = start + MAX_SUMMARY_LENGTH
        if (end > trimmed.length) {
          end = trimmed.length
          start = Math.max(0, end - MAX_SUMMARY_LENGTH)
        }
        let result = trimmed.slice(start, end)
        if (start > 0) result = '...' + result
        if (end < trimmed.length) result = result + '...'
        return result
      }
      const half = Math.floor(MAX_SUMMARY_LENGTH / 2)
      return trimmed.slice(0, half) + ' ... ' + trimmed.slice(-half)
    }

    // Determine if we need to abbreviate or show full text.
    const summarizedOriginal = (mutatedLoc < MIN_LINES_FOR_SUMMARY)
      ? originalFull
      : abbreviateWithFocus(originalFull, this.original)

    const summarizedMutated = (mutatedLoc < MIN_LINES_FOR_SUMMARY)
      ? mutatedFull
      : abbreviateWithFocus(mutatedFull, this.replace)

    const resultLines = [
      `---| ${summarizedOriginal}`,
      `+++| ${summarizedMutated}`
    ]

    return resultLines.join('\n') + '\n'
  }

  /**
   * Displays a colorized line-based diff using `chalk` and `jsdiff`.
   * Shows context around the mutated line.
   * @returns {string} - Terminal-friendly colored diff output.
   */
  diffColor() {
    const original = fs.readFileSync(this.baseline(), 'utf8')
    const mutated = this.applyToString(original)

    let diff = jsdiff.diffLines(original, mutated)
    const lineNumber = this.getLine()
    const context = 0

    diff = diff.filter(part => part.added || part.removed)
      .map(part => {
        const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
        const num = part.removed ? chalk.gray(lineNumber.toString().padStart(4) + ' | ') : chalk.gray('     | ')
        return num + chalk[color](part.value.replace(/\n$/, ''))
      })

    let lines = mutated.split('\n')
      .map((line, i) => chalk.gray((i + 1).toString().padStart(4) + ' | ' + line))

    lines.splice(lineNumber - 1, 1, diff[0], diff[1])

    lines = lines.slice(Math.max(0, lineNumber - context - 1), lineNumber + context + 1)

    return lines.join('\n') + '\n'
  }

  /**
  * Returns the file name of the mutated contract.
  * @returns {string} - File name of the contract.
  */
  fileName() {
    const lastIndex = this.file.lastIndexOf('/')
    let fileName = this.file.slice(lastIndex + 1)

    return fileName
  }

  /**
 * Generates a unique hash to identify this mutation.
 * @returns {string} - Unique mutation hash.
 */
  hash() {
    const input = [path.basename(this.file), this.start, this.end, this.original, this.replace, this.operator].join(':')
    return "m" + sha1(input).slice(0, 8)
  }

  /**
  * Restores the original contract content from the baseline.
  * @returns {void}
  */
  restore() {
    const baseline = this.baseline()

    console.log('Restoring ' + this.file)

    const original = fs.readFileSync(baseline, 'utf8')
    fs.writeFileSync(this.file, original, 'utf8')
  }

  /**
  * Saves the mutant to a separate file for inspection.
  * Then reverts the contract file to its original state.
  * @returns {void}
  */
  save() {
    const original = fs.readFileSync(this.file, "utf8")
    const mutated = this.applyToString(original)

    var contractName = path.basename(this.file)

    fs.writeFileSync(mutantsDir + "/" + contractName + "-" + this.hash() + ".sol", mutated, function (err) {
      if (err) return console.log(err)
    })

    fs.writeFileSync(this.file, original, "utf8")
  }

  /**
 * Replaces a portion of a string with new content.
 * @param {string} str - Original string.
 * @param {number} start - Start index of the section to replace.
 * @param {number} length - Number of characters to replace.
 * @param {string} replacement - Replacement string.
 * @returns {string} - Modified string.
 */
  splice(str, start, length, replacement) {
    return str.substring(0, start) + replacement + str.substring(start + length)
  }

  /**
   * Converts the mutation object to a JSON string.
   * @returns {string} - JSON representation of the mutation.
   */
  toJson() {
    var m = new Mutation(this.file, this.functionName, this.start, this.end, this.startLine, this.endLine, this.original, this.replace, this.operator, this.status, this.testingTime, this.id)
    return JSON.stringify(m, null, "\t")
  }
  /**
   * Creates a unified diff patch string between the baseline and mutated contract.
   * @returns {string} - Patch string in unified diff format.
   */
  patch() {
    const original = fs.readFileSync(this.baseline(), 'utf8')
    const mutated = this.applyToString(original)

    return jsdiff.createPatch(this.file, original, mutated)
  }
}

module.exports = Mutation