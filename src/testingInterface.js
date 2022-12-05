const { spawnSync, spawn } = require("child_process");
const config = require("./config");
const targetDir = config.projectDir;
const testingTimeOutInSec = config.testingTimeOutInSec
const utils = require("./utils");

const runScript = {
  npm: "run-script",
  yarn: "run"
}

/**
* Spawns a new compile process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT
*/
function spawnCompile(packageManager) {
  var compileChild;
  const testingFramework = config.testingFramework;
  const run = runScript[packageManager];

  //CUSTOM
  if (testingFramework === "custom") {
    if (process.platform === "win32") {
      compileChild = spawnSync(packageManager + ".cmd", [run, "compile"], { stdio: "inherit", cwd: targetDir });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      compileChild = spawnSync(packageManager, [run, "compile"], { stdio: "inherit", cwd: targetDir });
    }
  }
  //TRUFFLE/HARDHAT
  else {
    if (process.platform === "win32") {
      compileChild = spawnSync(testingFramework + ".cmd", ["compile"], { stdio: "inherit", cwd: targetDir });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      compileChild = spawnSync(testingFramework, ["compile"], { stdio: "inherit", cwd: targetDir });
    }
  }
  return compileChild.status === 0;
}

/**
* Spawns a new test process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT
*/
function spawnTest(packageManager, testFiles) {

  var testChild;
  const testingFramework = config.testingFramework;
  const run = runScript[packageManager];

  //CUSTOM
  if (config.testingFramework === "custom") {
    if (process.platform === "win32") {
      testChild = spawnSync(packageManager + ".cmd", [run, "test", ...testFiles], { stdio: "inherit", cwd: targetDir, timeout: 300000 });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      testChild = spawnSync(packageManager, [run, "test", ...testFiles], { stdio: "inherit", cwd: targetDir, timeout: 300000 });
    }
  }
  //TRUFFLE/HARDHAT
  else {
    if (process.platform === "win32") {
      testChild = spawnSync(testingFramework + ".cmd", ["test", "-b", ...testFiles], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      testChild = spawnSync(testingFramework, ["test", "-b", ...testFiles], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
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
 * Spawns a new Ganache instance
 */
function spawnNetwork() {
  if (config.network === "ganache") {
    var child;
    if (process.platform === "win32") {
      child = spawn("ganache-cli.cmd", { stdio: "inherit", cwd: targetDir, detached: true });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      child = spawn("ganache-cli", { stdio: "inherit", cwd: targetDir, detached: true });
    }
    child.unref;
    const waitForGanache = () => {
      if (!isRunning(child)) {
        console.log("Waiting for Ganache ...");
        setTimeout(() => {
          waitForGanache();
        }, 250);
      } else {
        resolve();
      }
    };
    return child;
  }
}

/**
 * Kills a spawned Ganache instance
 */
function killNetwork(ganacheChild) {
  if (config.network === "ganache") {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", ganacheChild.pid, "/f", "/t"]);
    } else if (process.platform === "linux") {
      ganacheChild.kill("SIGHUP");
    } else if (process.platform === "darwin") {
      ganacheChild.kill("SIGHUP");
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