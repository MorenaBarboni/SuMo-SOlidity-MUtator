const chalk = require('chalk')
const fs = require('fs')
const appRoot = require('app-root-path');
const rootDir = appRoot;
const utils = require("../utils");
const mutOpsConfigPath = utils.config.mutOpsConfig
const mutOpsConfig = require(mutOpsConfigPath)
const config = require(rootDir + '/sumo-config')
const Reporter = require('../reporter')
const reporter = new Reporter()

//Init operator version
var AOROperator
var BOROperator
var EROperator
var FVROperator
var GVROperator
var MODOperator;
var MOIOperator;
var MOROperator;
var RVSOperator
var SFROperator
var VUROperator
var VVROperator

/**
 * Minimal rules
 */
if (config.minimal) {
  AOROperator = require('./minimal/assignment-replacement')
  BOROperator = require('./minimal/binary-replacement')
  EROperator = require('./minimal/enum-replacement')
  FVROperator = require('./minimal/function-visibility-replacement')
  GVROperator = require('./minimal/global-variable-replacement')
  MODOperator = require('./minimal/modifier-deletion')
  MOIOperator = require('./minimal/modifier-insertion')
  MOROperator = require('./minimal/modifier-replacement')
  RVSOperator = require('./minimal/return-values-swap')
  SFROperator = require('./minimal/safemath-function-replacement')
  VUROperator = require('./minimal/variable-unit-replacement')
  VVROperator = require('./minimal/variable-visibility-replacement')
} else {
  AOROperator = require('./standard/assignment-replacement')
  BOROperator = require('./standard/binary-replacement')
  EROperator = require('./standard/enum-replacement')
  FVROperator = require('./standard/function-visibility-replacement')
  GVROperator = require('./standard/global-variable-replacement')
  MODOperator = require('./standard/modifier-deletion')
  MOIOperator = require('./standard/modifier-insertion')
  MOROperator = require('./standard/modifier-replacement')
  RVSOperator = require('./standard/return-values-swap')
  SFROperator = require('./standard/safemath-function-replacement')
  VUROperator = require('./standard/variable-unit-replacement')
  VVROperator = require('./standard/variable-visibility-replacement')
}

const ACMOperator = require('./standard/argument-change-overloaded-call')
const AVROperator = require('./standard/address-value-replacement')
const BCRDOperator = require('./standard/break-continue-replacement')
const BLROperator = require('./standard/boolean-literal-replacement')
const CBDOperator = require('./standard/catch-block-deletion')
const CCDOperator = require('./standard/constructor-deletion')
const CSCOperator = require('./standard/conditional-statement-change')
const DLROperator = require('./standard/data-location-replacement')
const DODOperator = require('./standard/delete-operator-deletion')
const ECSOperator = require('./standard/explicit-conversion-smaller')
const EEDOperator = require('./standard/event-emission-deletion')
const EHCOperator = require('./standard/exception-handling-change')
const ETROperator = require('./standard/ether-transfer-function-replacement')
const ICMOperator = require('./standard/increments-mirror')
const ILROperator = require('./standard/integer-literal-replacement')
const LSCOperator = require('./standard/loop-statement-change')
const HLROperator = require('./standard/hex-literal-replacement')
const MCROperator = require('./standard/math-crypto-function-replacement')
const MOCOperator = require('./standard/modifier-order-change')
const OLFDOperator = require('./standard/overloaded-function-deletion')
const OMDOperator = require('./standard/overridden-modifier-deletion')
const ORFDOperator = require('./standard/overridden-function-deletion')
const PKDOperator = require('./standard/payable-deletion')
const RSDOperator = require('./standard/return-statement-deletion')
const SCECOperator = require('./standard/switch-call-expression-casting')
const SFDOperator = require('./standard/selfdestruct-deletion')
const SFIOperator = require('./standard/selfdestruct-insertion')
const SKDOperator = require('./standard/super-keyword-deletion')
const SKIOperator = require('./standard/super-keyword-insertion')
const SLROperator = require('./standard/string-literal-replacement')
const TOROperator = require('./standard/transaction-origin-replacement')
const UORDOperator = require('./standard/unary-replacement')

function MutationOperators(operators) {
  this.operators = operators
}

/**
 * Generates the mutations and saves them to report.
 * @param {*} file the path of the smart contract to be mutated
 * @param {*} source the content of the smart contract to be mutated
 * @param {*} visit the visitor
 * @param {*} overwrite  overwrite the generated mutation reports
 * @returns 
 */
MutationOperators.prototype.getMutations = function (file, source, visit, overwrite) {
  let mutations = []
  const fileString = "\n Mutants generated for file: " + file + ": \n";
  var mutantString = "";

  for (const operator of this.operators) {

    var enabled = Object.entries(mutOpsConfig)
      .find(pair => pair[0] === operator.ID && pair[1] === true);

    if (enabled) {
      var opMutations = operator.getMutations(file, source, visit);
      if (overwrite) {
        opMutations.forEach(m => {
          mutantString = mutantString + "- Mutant " + m.hash() + " was generated by " + operator.ID + " (" + operator.name + "). \n";
        });
      }
      mutations = mutations.concat(opMutations)
    }
  }
  if (overwrite && mutantString != "") {
    reporter.saveGeneratedMutants(fileString, mutantString);
  }
  return mutations
}

//Show information about enabled mutation operators
MutationOperators.prototype.getEnabledOperators = function () {
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
          printString = printString + "> " + chalk.bold.yellow(operator.ID) + " (" + operator.name + ") \n"
          break;
        }
      }
    }
  } else {
    printString = chalk.red("Warning: No mutation operators enabled.\n");
  }
  return printString
}


/**
 * Enables a mutation operator by ID
 * @param {*} ID the operator ID
 * @returns success status
 */
MutationOperators.prototype.enable = function (ID) {
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

//Enables all mutation operators
MutationOperators.prototype.enableAll = function () {
  Object.entries(mutOpsConfig).forEach(pair => {
    mutOpsConfig[pair[0]] = true;
  });
  fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
    if (err) return false;
  });
  return true
}

/**
 * Disables a mutation operator by ID
 * @param {*} ID the operator ID
 * @returns success status
 */
MutationOperators.prototype.disable = function (ID) {
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

//Disables all mutation operators
MutationOperators.prototype.disableAll = function () {
  Object.entries(mutOpsConfig).forEach(pair => {
    mutOpsConfig[pair[0]] = false;
  });
  fs.writeFileSync(mutOpsConfigPath, JSON.stringify(mutOpsConfig, null, 2), function writeJSON(err) {
    if (err) return false;
  });
  return true
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
  EHCOperator: EHCOperator,
  EROperator: EROperator,
  ETROperator: ETROperator,
  FVROperator: FVROperator,
  GVROperator: GVROperator,
  HLROperator: HLROperator,
  ICMOperator: ICMOperator,
  ILROperator: ILROperator,
  LSCOperator: LSCOperator,
  MCROperator: MCROperator,
  MOCOperator: MOCOperator,
  MODOperator: MODOperator,
  MOIOperator: MOIOperator,
  MOROperator: MOROperator,
  OLFDOperator: OLFDOperator,
  OMDOperator: OMDOperator,
  ORFDOperator: ORFDOperator,
  PKDOperator: PKDOperator,
  RSDOperator: RSDOperator,
  RVSOperator: RVSOperator,
  SCECOperator: SCECOperator,
  SFDOperator: SFDOperator,
  SFIOperator: SFIOperator,
  SFROperator: SFROperator,
  SKDOperator: SKDOperator,
  SKIOperator: SKIOperator,
  SLROperator: SLROperator,
  TOROperator: TOROperator,
  UORDOperator: UORDOperator,
  VUROperator: VUROperator,
  VVROperator: VVROperator,
  MutationOperators: MutationOperators,
}