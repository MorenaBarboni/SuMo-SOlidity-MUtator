const chalk = require('chalk')
const fs = require('fs')
const appRoot = require('app-root-path');
const rootDir = appRoot;
const utils = require("../utils");
const mutOpsConfigPath = utils.staticConf.mutOpsConfigPath
const mutOpsConfig = require(mutOpsConfigPath)
const config = require(rootDir + '/sumo-config')


//Init operator version
var ACMOperator, AVROperator, BOROperator, EROperator, FVROperator, GVROperator, HLROperator,
  ILROperator, LFROperator, MODOperator, MOIOperator, RVSOperator, UORDOperator, VVROperator;

/**
 * Minimal rules
 */
if (config.minimalOperators) {
  ACMOperator = require('./minimal/argument-change-overloaded-call')
  AVROperator = require('./minimal/address-value-replacement')
  BOROperator = require('./minimal/binary-replacement')
  EROperator = require('./minimal/enum-replacement')
  FVROperator = require('./minimal/function-visibility-replacement')
  GVROperator = require('./minimal/global-variable-replacement')
  HLROperator = require('./minimal/hex-literal-replacement')
  ILROperator = require('./minimal/integer-literal-replacement')
  LFROperator = require('./minimal/library-function-replacement')
  MODOperator = require('./minimal/modifier-deletion')
  MOIOperator = require('./minimal/modifier-insertion')
  RVSOperator = require('./minimal/return-values-swap')
  UORDOperator = require('./minimal/unary-replacement')
  VVROperator = require('./minimal/variable-visibility-replacement')
} else {
  ACMOperator = require('./standard/argument-change-overloaded-call')
  AVROperator = require('./standard/address-value-replacement')
  BOROperator = require('./standard/binary-replacement')
  EROperator = require('./standard/enum-replacement')
  FVROperator = require('./standard/function-visibility-replacement')
  GVROperator = require('./standard/global-variable-replacement')
  HLROperator = require('./standard/hex-literal-replacement')
  ILROperator = require('./standard/integer-literal-replacement')
  LFROperator = require('./standard/library-function-replacement')
  MODOperator = require('./standard/modifier-deletion')
  MOIOperator = require('./standard/modifier-insertion')
  RVSOperator = require('./standard/return-values-swap')
  UORDOperator = require('./standard/unary-replacement')
  VVROperator = require('./standard/variable-visibility-replacement')
}

const AOROperator = require('./standard/assignment-replacement')
const BCRDOperator = require('./standard/break-continue-replacement')
const BLROperator = require('./standard/boolean-literal-replacement')
const CBDOperator = require('./standard/catch-block-deletion')
const CCDOperator = require('./standard/constructor-deletion')
const CSCOperator = require('./standard/conditional-statement-change')
const DLROperator = require('./standard/data-location-replacement')
const DODOperator = require('./standard/delete-operator-deletion')
const ECSOperator = require('./standard/explicit-conversion-smaller')
const EEDOperator = require('./standard/event-emission-deletion')
const EHDOperator = require('./standard/exception-handling-deletion')
const ETROperator = require('./standard/ether-transfer-function-replacement')
const FCDOperator = require('./standard/function-call-deletion')
const LSCOperator = require('./standard/loop-statement-change')
const MCROperator = require('./standard/math-crypto-function-replacement')
const MKROperator = require('./standard/mapping-key-replacement')
const OLFDOperator = require('./standard/overloaded-function-deletion')
const OMDOperator = require('./standard/overridden-modifier-deletion')
const ORFDOperator = require('./standard/overridden-function-deletion')
const PKDOperator = require('./standard/payable-deletion')
const RSDOperator = require('./standard/return-statement-deletion')
const SCDOperator = require('./standard/selfdestruct-call-deletion')
const SKROperator = require('./standard/super-keyword-replacement')
const SLROperator = require('./standard/string-literal-replacement')
const TOROperator = require('./standard/transaction-origin-replacement')
const VUROperator = require('./standard/variable-unit-replacement')

/**
 * MutationGenerator manages and applies mutation operators to smart contracts,
 * generating mutants based on enabled mutation configurations.
 */
class MutationGenerator {

  /**
  * Constructs a MutationGenerator instance.
  * @param {Array<object>} operators - Array of mutation operator instances.
  */
  constructor(operators) {
    this.operators = operators;
  }
  /**
  * Applies enabled mutation operators to a smart contract.
  * @param {string} file - Path to the contract source file.
  * @param {string} source - Source code of the contract.
  * @param {Function} visit - Visitor function for traversing the AST.
  * @returns {Array<object>} - Array of generated mutation objects.
  */
  getMutations(file, source, visit) {
    let mutations = [];

    for (const operator of this.operators) {

      var enabled = Object.entries(mutOpsConfig)
        .find(pair => pair[0] === operator.ID && pair[1] === true);

      if (enabled) {
        var opMutations = operator.getMutations(file, source, visit);
        mutations = mutations.concat(opMutations);
      }
    }
    return mutations;
  }

  /**
   * Returns a formatted string listing all mutation operators,
   * including their IDs, names, and enabled/disabled status.
   *
   * @returns {string} Formatted output of all mutation operators.
   */
  logOperatorsStatus() {
    let printString = chalk.bold("\nMutation Operators:\n\n");

    // Find the longest operator label
    const maxLength = Math.max(
      ...this.operators.map(op => `${op.ID} (${op.name})`.length)
    );

    for (const operator of this.operators) {
      const enabled = mutOpsConfig[operator.ID] === true;

      const status = enabled
        ? chalk.green("[ENABLED]")
        : chalk.red("[DISABLED]");

      const label = `${operator.ID} (${operator.name})`;

      // Align all status labels to the same column
      const padding = " ".repeat(maxLength - label.length + 3);

      printString +=
        "> " +
        chalk.bold.yellow(operator.ID) +
        ` (${operator.name})` +
        padding +
        status + "\n";
    }

    return printString;
  }

  /**
 * Returns a list of IDs for all currently enabled mutation operators.
 * @returns {string[]} - IDs of enabled mutation operators.
 */
  getEnabledOperators() {
    return Object.entries(mutOpsConfig)
      .filter(([operatorId, isEnabled]) => isEnabled === true)
      .map(([operatorId]) => operatorId);
  }

  /**
    * Enables a specific mutation operator by its ID.
    * Updates the mutation operator config file accordingly.
    * @param {string} ID - Mutation operator ID to enable.
    * @returns {boolean} - True if enabled successfully, false if ID not found.
    */
  enable(ID) {
    var exists = Object.entries(mutOpsConfig)
      .find(pair => pair[0] === ID);

    if (exists) {
      mutOpsConfig[ID] = true;
      fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
      });
      return true;
    }
    return false;
  }
  /**
  * Enables all mutation operators listed in the configuration.
  * Updates the config file to reflect changes.
  * @returns {boolean} - True if successful, false otherwise.
  */
  enableAll() {
    Object.entries(mutOpsConfig).forEach(pair => {
      mutOpsConfig[pair[0]] = true;
    });
    fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
      if (err) return false;
    });
    return true;
  }
  /**
   * Disables a specific mutation operator by its ID.
   * Updates the mutation operator config file accordingly.
   * @param {string} ID - Mutation operator ID to disable.
   * @returns {boolean} - True if disabled successfully, false if ID not found.
   */
  disable(ID) {
    var exists = Object.entries(mutOpsConfig)
      .find(pair => pair[0] === ID);

    if (exists) {
      mutOpsConfig[ID] = false;
      fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
        if (err) return console.log(err);
      });
      return true;
    }
    return false;
  }
  /**
  * Disables all mutation operators listed in the configuration.
  * Updates the config file to reflect changes.
  * @returns {boolean} - True if successful, false otherwise.
  */
  disableAll() {
    Object.entries(mutOpsConfig).forEach(pair => {
      mutOpsConfig[pair[0]] = false;
    });
    fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
      if (err) return false;
    });
    return true;
  }
}
module.exports = {
  ACMOperator,
  AOROperator,
  AVROperator,
  BCRDOperator,
  BLROperator,
  BOROperator,
  CBDOperator,
  CCDOperator,
  CSCOperator,
  DLROperator,
  DODOperator,
  ECSOperator,
  EEDOperator,
  EHDOperator,
  EROperator,
  ETROperator,
  FCDOperator,
  FVROperator,
  GVROperator,
  HLROperator,
  ILROperator,
  LSCOperator,
  LFROperator,
  MCROperator,
  MKROperator,
  MODOperator,
  MOIOperator,
  OLFDOperator,
  OMDOperator,
  ORFDOperator,
  PKDOperator,
  RSDOperator,
  RVSOperator,
  SCDOperator,
  SKROperator,
  SLROperator,
  TOROperator,
  UORDOperator,
  VUROperator,
  VVROperator,
  MutationGenerator,
}