const chalk = require('chalk')
const fs = require('fs')
const appRoot = require('app-root-path');
const rootDir = appRoot;
const utils = require("../utils");
const mutOpsConfigPath = utils.staticConf.mutOpsConfigPath
const mutOpsConfig = require(mutOpsConfigPath)
const config = require(rootDir + '/sumo-config')


//Init operator version
var AVROperator, BOROperator, EROperator, FVROperator, GVROperator, HLROperator, ILROperator,
  MCROperator, MODOperator, MOIOperator, RVSOperator, UORDOperator, VVROperator;

/**
 * Minimal rules
 */
if (config.minimalOperators) {
  AVROperator = require('./minimal/address-value-replacement')
  BOROperator = require('./minimal/binary-replacement')
  EROperator = require('./minimal/enum-replacement')
  FVROperator = require('./minimal/function-visibility-replacement')
  GVROperator = require('./minimal/global-variable-replacement')
  HLROperator = require('./minimal/hex-literal-replacement')
  ILROperator = require('./minimal/integer-literal-replacement')
  MCROperator = require('./minimal/math-crypto-function-replacement')
  MODOperator = require('./minimal/modifier-deletion')
  MOIOperator = require('./minimal/modifier-insertion')
  RVSOperator = require('./minimal/return-values-swap')
  UORDOperator = require('./minimal/unary-replacement')
  VVROperator = require('./minimal/variable-visibility-replacement')
} else {
  AVROperator = require('./standard/address-value-replacement')
  BOROperator = require('./standard/binary-replacement')
  EROperator = require('./standard/enum-replacement')
  FVROperator = require('./standard/function-visibility-replacement')
  GVROperator = require('./standard/global-variable-replacement')
  HLROperator = require('./standard/hex-literal-replacement')
  ILROperator = require('./standard/integer-literal-replacement')
  MCROperator = require('./standard/math-crypto-function-replacement')
  MODOperator = require('./standard/modifier-deletion')
  MOIOperator = require('./standard/modifier-insertion')
  RVSOperator = require('./standard/return-values-swap')
  UORDOperator = require('./standard/unary-replacement')
  VVROperator = require('./standard/variable-visibility-replacement')
}

const ACMOperator = require('./standard/argument-change-overloaded-call')
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
   * Returns a formatted string listing all currently enabled mutation operators.
   * Includes their IDs and readable names.
   * @returns {string} - Formatted output of enabled mutation operators.
   */
  getEnabledOperators() {
    var printString;
    var enabled = Object.entries(mutOpsConfig)
      .filter(pair => pair[1] === true);

    if (enabled.length > 0) {
      //Print enabled operators info
      printString = chalk.bold("\nEnabled Mutation Operators:\n\n");

      for (const entry of enabled) {
        for (let i = 0; i < this.operators.length; i++) {
          const operator = this.operators[i];
          if (operator.ID === entry[0]) {
            printString = printString + "> " + chalk.bold.yellow(operator.ID) + " (" + operator.name + ") \n";
            break;
          }
        }
      }
    } else {
      printString = chalk.red("Warning: No mutation operators enabled.\n");
    }
    return printString;
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
  ACMOperator: ACMOperator,
  AOROperator: AOROperator,
  AVROperator: AVROperator,
  BCRDOperator: BCRDOperator,
  BLROperator: BLROperator,
  BOROperator: BOROperator,
  CBDOperator: CBDOperator,
  CCDOperator: CCDOperator,
  CSCOperator: CSCOperator,
  DLROperator: DLROperator,
  DODOperator: DODOperator,
  ECSOperator: ECSOperator,
  EEDOperator: EEDOperator,
  EHDOperator: EHDOperator,
  EROperator: EROperator,
  ETROperator: ETROperator,
  FCDOperator: FCDOperator,
  FVROperator: FVROperator,
  GVROperator: GVROperator,
  HLROperator: HLROperator,
  ILROperator: ILROperator,
  LSCOperator: LSCOperator,
  MCROperator: MCROperator,
  MODOperator: MODOperator,
  MOIOperator: MOIOperator,
  OLFDOperator: OLFDOperator,
  OMDOperator: OMDOperator,
  ORFDOperator: ORFDOperator,
  PKDOperator: PKDOperator,
  RSDOperator: RSDOperator,
  RVSOperator: RVSOperator,
  SCDOperator: SCDOperator,
  SKROperator: SKROperator,
  SLROperator: SLROperator,
  TOROperator: TOROperator,
  UORDOperator: UORDOperator,
  VUROperator: VUROperator,
  VVROperator: VVROperator,
  MutationGenerator: MutationGenerator,
}