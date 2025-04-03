// External modules
const appRoot = require('app-root-path');
const chalk = require('chalk')
const { spawnSync } = require("child_process");
// Internal modules
const utils = require('./utils')
const rootDir = utils.win32PathConverter(appRoot.toString());

/**
 * Spawns a new compile process through the interface provided by the connected testing framework 
 * If multiple testing frameworks are specified, the compilation is defaulted to the first one
 * @param {string[]} testingFrameworks - The list of testing frameworks used within the SUT
 * @returns {boolean} Indicates whether the compilation process succeeded (true) or failed (false)
 * @throws {Error} If an invalid testing framework is selected or if there's an issue during the compilation
 */
function spawnCompile(testingFrameworks) {

  if (!testingFrameworks || testingFrameworks.length === 0) {
    throw new Error("Error: Invalid input parameters for the compilation process.");
  }

  const packageManager = utils.getPackageManager();

  let compileChild;

  //npx or yarn (.cmd if win32)
  const packageRunner = (packageManager === "npm") ? "npx" : "yarn";
  const packageRunnerCmd = (process.platform === "win32") ? packageRunner + ".cmd" : packageRunner;

  //npm run-script or yarn run (.cmd if win32)
  const packageManagerCmd = (process.platform === "win32") ? packageManager + ".cmd" : packageManager;
  const runScriptCmd = (packageManager === "npm") ? "run-script" : "run";

  let compileCommand;

  switch (testingFrameworks[0]) {
    case "hardhat": compileCommand = packageRunnerCmd + " hardhat compile";
      break;
    case "brownie": compileCommand = "brownie compile";
      break;
    case "forge": compileCommand = "forge build";
      break;
    case "custom": compileCommand = packageManagerCmd + " " + runScriptCmd + " compile";
      break;
    default: throw new Error(`Error: Unsupported testing framework "${testingFrameworks[0]}".`);
  }

  //Spawn compile command
  console.log(chalk.dim(compileCommand));
  compileChild = spawnSync(compileCommand, { stdio: "inherit", shell: true, cwd: rootDir });

  return compileChild.status === 0;
}

/**
 * Spawns a new test process through the interface provided by the connected testing framework 
 * If multiple testing frameworks are specified, it builds a hybrid test script
 * @param {string[]} testingFrameworks The list of testing framework(s) used within the SUT
 * @param {string[]} testFiles The list of test files to be run
 * @param {number} [testingTimeOutInSec=500] The timeout duration for the testing process in seconds retrieved from the sumo-config
 * @returns {number} Status code indicating the result of the testing process
 * @throws {Error} If an invalid testing framework is selected or if there's an issue during the testing process
 */
function spawnTest(testingFrameworks, testFiles) {

  if (!testingFrameworks || testingFrameworks.length === 0) {
    throw new Error("Error: Invalid input parameters for the testing process.");
  }

  const packageManager = utils.getPackageManager();

  //npx or yarn (.cmd if win32)
  const packageRunner = (packageManager === "npm") ? "npx" : "yarn";
  const packageRunnerCmd = (process.platform === "win32") ? packageRunner + ".cmd" : packageRunner;

  //Build test script based on used testing frameworks
  let testScript = buildTestScript(testingFrameworks, testFiles);
  let testCommand;

  //Hybrid
  if (testingFrameworks.length > 1) {
    //Append npx/yarn if script starts with hardhat
    testCommand = (testScript.startsWith("hardhat")) ? `${packageRunnerCmd} ` + testScript : testScript;
  }
  //Hardhat-only
  else if (testingFrameworks[0] === "hardhat") {
    testCommand = `${packageRunnerCmd} ` + testScript;
  }
  //Forge-only, Brownie-only
  else if (testingFrameworks[0] === "forge" || testingFrameworks[0] === "brownie") {
    testCommand = testScript;
  }
  //Custom
  else if (testingFrameworks.length === 1 && testingFrameworks[0] === "custom") {
    const run = (packageManager === "npm") ? "run-script" : "run";
    const packageManagerCmd = (process.platform === "win32") ? packageManager + ".cmd" : packageManager;
    testCommand = `${packageManagerCmd} ` + run + " test";
  }
  else {
    throw new Error("Error: The selected testing framework is not valid.");
  }

  //Spawn test command
  console.log(chalk.dim(testCommand))
  const testChild = spawnSync(testCommand, { stdio: "inherit", shell: true, cwd: rootDir, timeout: utils.getTestingTimeout() * 1000 });
  let status;

  if (testChild.error && testChild.error.code === "ETIMEDOUT") {
    status = 999; //Custom status code for timedout process
  } else {
    status = testChild.status;
  }
  return status;
}

/**
 * Builds a test script based on the selected testingFramework(s). In case
 * of multiple frameworks, it concatenates multiple test scripts, and distributes
 * the test files to be executed according to their format.
 * @param {string[]} testingFrameworks The list of testing framework(s) used within the SUT
 * @param {string[]} testFiles The list of test files to be run
 * @returns {string} Test script to be executed
 * @throws {Error} If an invalid testing framework is selected or if there's an issue during script generation
 */
function buildTestScript(testingFrameworks, testFiles) {
  if (!testingFrameworks || testingFrameworks.length === 0) {
    throw new Error("Error: The selected testing framework(s) is not valid.");
  }

  let testScript = "";
  const isOnlyFramework = testingFrameworks.length === 1;
  const runAllTests = utils.getSkipTests().length === 0;

  testingFrameworks.forEach(framework => {
    let testsForFramework = isOnlyFramework ? testFiles : utils.getTestsForFramework(framework, testFiles);
    let concatCommand = testScript.length > 0;
    let testCommand = "";

    switch (framework) {
      case 'brownie':
        if (runAllTests) { testCommand = "brownie test --exitfirst"; }
        else { testCommand = testsForFramework.length > 0 ? `brownie test ${testsForFramework.join(' ')} --exitfirst` : ''; }
        break;
      case 'hardhat':
        if (runAllTests) { testCommand = "hardhat test --bail"; }
        else { testCommand = testsForFramework.length > 0 ? `hardhat test --bail ${testsForFramework.join(' ')}` : ''; }
        break;
      case 'forge':
        if (runAllTests) { testCommand = "forge t --fail-fast" }
        else { testCommand = testsForFramework.length > 0 ? `forge t --fail-fast --match-path {${testsForFramework.map(tf => tf.split(rootDir + '/')[1]).join()}}` : ''; }
        break;
      case 'custom':
        break;
      default: throw new Error(`Error: Unsupported testing framework "${framework}".`);
    }

    //Concat commands if needed (for hybrid test suites)
    if (concatCommand && testCommand !== "") {
      testScript += " && " + testCommand
    }
    else if (!concatCommand && testCommand !== "") {
      testScript += testCommand
    }
  });

  return testScript;
}

module.exports = {
  spawnCompile: spawnCompile,
  spawnTest: spawnTest
};