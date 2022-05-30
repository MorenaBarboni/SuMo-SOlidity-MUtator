const { spawnSync, spawn } = require("child_process");
const config = require("./config");
const targetDir = config.projectDir;
const testingTimeOutInSec = config.testingTimeOutInSec
const utils = require("./utils");


/**
* Spawns a new compile process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT
* @param runScript the run script command of the packageManager
*/
function spawnCompile(packageManager, runScript) {
  var compileChild;

  //Run a custom compile script
  if (config.customTestScript) {

    if (process.platform === "win32") {
      compileChild = spawnSync(packageManager + ".cmd", [runScript, "compile"], {
        stdio: "inherit",
        cwd: targetDir
      });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      compileChild = spawnSync(packageManager, [runScript, "compile"], { stdio: "inherit", cwd: targetDir });
    }
  }
  //Spawn a default truffle compile command
  else {
    if (process.platform === "win32") {
      compileChild = spawnSync("truffle.cmd", ["compile"], { stdio: "inherit", cwd: targetDir });
    } else if (process.platform === "linux" || process.platform === "darwin") {
      compileChild = spawnSync("truffle", ["compile"], { stdio: "inherit", cwd: targetDir });
    }
  }
  return compileChild.status === 0;
}

/**
* Spawns a new test process through the interface provided by the connected testing framework 
* @param packageManager The package manager used within the SUT
* @param runScript the run script command of the packageManager
*/
function spawnTest(packageManager, runScript) {

  var testChild;

  //Run a custom test script
  if (config.customTestScript) {
    if (process.platform === "win32") {
      testChild = spawnSync(packageManager + ".cmd", [runScript, "test"], {
        stdio: "inherit",
        cwd: targetDir,
        timeout: 300000
      });

    } else if (process.platform === "linux" || process.platform === "darwin") {
      testChild = spawnSync(packageManager, [runScript, "test"], {
        stdio: "inherit",
        cwd: targetDir,
        timeout: 300000
      });
    }
  }
  //Spawn a default truffle test command
  else {
    if(config.bail){
      if (process.platform === "win32") {
        testChild = spawnSync("truffle.cmd", ["test", "-b"], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
      } else if (process.platform === "linux" || process.platform === "darwin") {
        testChild = spawnSync("truffle", ["test", "-b"], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
      }
    }else{
      if (process.platform === "win32") {
        testChild = spawnSync("truffle.cmd", ["test"], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
      } else if (process.platform === "linux" || process.platform === "darwin") {
        testChild = spawnSync("truffle", ["test"], { stdio: "inherit", cwd: targetDir, timeout: (testingTimeOutInSec * 1000) });
      }
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
function spawnGanache() {
  var child;
  if (config.ganache) {
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
  }
  return child;
}

/**
 * Kills a spawned Ganache instance
 */
function killGanache(ganacheChild) {
  if (config.ganache) {
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
  spawnGanache: spawnGanache,
  killGanache: killGanache
};
