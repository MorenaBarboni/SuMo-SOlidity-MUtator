const appRoot = require('app-root-path');
const { spawnSync, spawn } = require("child_process");
const utils = require("./utils");
const rootDir = appRoot.toString().replaceAll("\\", "/");
const sumoConfig = require(rootDir + "/sumo-config");

const testingTimeOutInSec = sumoConfig.testingTimeOutInSec

/**
* Spawns a new compile process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT (npm or yarn)
*/
function spawnCompile(packageManager) {
  var compileChild;
  const testingFramework = sumoConfig.testingFramework;
  const execute = (packageManager === "npm") ? "npx" : "yarn";
  const executeCmd = (process.platform === "win32") ? execute + ".cmd" : execute;

  //Truffle
  if (testingFramework === "truffle") {
    compileChild = spawnSync(executeCmd, ["truffle", "compile"], { stdio: "inherit", cwd: rootDir });
  }
  //Hardhat
  else if (testingFramework === "hardhat") {
    compileChild = spawnSync(executeCmd, ["hardhat", "compile"], { stdio: "inherit", cwd: rootDir });
  }
  //Forge
  else if (testingFramework === "forge") {
    compileChild = spawnSync(testingFramework, ["build"], { stdio: "inherit", cwd: rootDir });
  }
  //Custom
  else if (testingFramework === "custom") {
    const run = (packageManager === "npm") ? "run-script" : "run";
    const packageManagerCmd = (process.platform === "win32") ? packageManager + ".cmd" : packageManager;
    compileChild = spawnSync(packageManagerCmd, [run, "compile"], { stdio: "inherit", cwd: rootDir });
  } else {
    console.error("> Error: The selected testing framework is not valid.")
  }
  return compileChild.status === 0;
}

/**
* Spawns a new test process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT (npm or yarn)
*/
function spawnTest(packageManager, testFiles) {

  var testChild;
  const testingFramework = sumoConfig.testingFramework;
  const execute = (packageManager === "npm") ? "npx" : "yarn";
  const executeCmd = (process.platform === "win32") ? execute + ".cmd" : execute;

  //Truffle
  if (sumoConfig.testingFramework === "truffle") {
    if (sumoConfig.skipTests.length === 0) {
      testChild = spawnSync(executeCmd, ["truffle", "test", "-b"], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    } else {
      testChild = spawnSync(executeCmd, ["truffle", "test", "-b", ...testFiles], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    }
  }
  //Hardhat
  else if (sumoConfig.testingFramework === "hardhat") {
    if (sumoConfig.skipTests.length === 0) {
      testChild = spawnSync(executeCmd, ["hardhat", "test", "--bail"], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    } else {
      testChild = spawnSync(executeCmd, ["hardhat", "test", "--bail", ...testFiles], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    }
  }
  //Forge
  else if (testingFramework === "forge") {
    if (sumoConfig.skipTests.length === 0) {
      testChild = spawnSync("forge", ['t'], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    } else {
      let relativeTestfiles = []
      for (let i = 0; i < testFiles.length; i++) {
        const tf = testFiles[i].split(rootDir + '/')[1];
        relativeTestfiles.push(tf);
      }
      let arguments = "{" + relativeTestfiles.join() + '}';
      testChild = spawnSync("forge", ['t', '--match-path', arguments], { stdio: "inherit", cwd: rootDir, timeout: testingTimeOutInSec * 1000 });
    }
  }
  //Custom
  if (sumoConfig.testingFramework === "custom") {
    const run = (packageManager === "npm") ? "run-script" : "run";
    const packageManagerCmd = (process.platform === "win32") ? packageManager + ".cmd" : packageManager;
    if (sumoConfig.skipTests.length === 0) {
      testChild = spawnSync(packageManagerCmd, [run, "test"], { stdio: "inherit", cwd: rootDir, timeout: (testingTimeOutInSec * 1000) });
    } else {
      testChild = spawnSync(packageManagerCmd, [run, "test", ...testFiles], { stdio: "inherit", cwd: rootDir, timeout: (testingTimeOutInSec * 1000) });
    }
  }
  let status;
  if (testChild.error && testChild.error.code === "ETIMEDOUT") {
    status = 999;
  } else {
    status = testChild.status;
  }
  return status;
}

/**
 * Spawns a new blockchain node instance
 * @param packageManager The package manager used within the SUT (npm or yarn) 
 */
function spawnNetwork(packageManager) {
  var child;
  const execute = (packageManager === "npm") ? "npx" : "yarn";
  const executeCmd = (process.platform === "win32") ? execute + ".cmd" : execute;

  if (sumoConfig.network === "ganache") {
    child = spawn(executeCmd, ["ganache-cli"], { stdio: "inherit", cwd: rootDir});
    child.unref();
    const waitForNode = () => {
      if (!isRunning(child)) {
        console.log("Waiting for blockchain node ...");
        setTimeout(() => {
          waitForNode();
        }, 250);
      } else {
        resolve();
      }
    };
  }
  return child;
}

/**
 * Kills a spawned blockchain node instance
 */
function killNetwork(nodeChild) {
  if (sumoConfig.network === "ganache") {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", nodeChild.pid, "/f", "/t"]);
    }
    else if (process.platform === "linux" || process.platform === "darwin") {
      spawn("fuser", ["-k", "8545/tcp"]);
    } 
    else {
      nodeChild.kill("SIGHUP");
    } 
    utils.cleanTmp();
  }
}

module.exports = {
  spawnCompile: spawnCompile,
  spawnTest: spawnTest,
  spawnNetwork: spawnNetwork,
  killNetwork: killNetwork
};