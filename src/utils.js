// External modules
const appRoot = require('app-root-path');
const chalk = require('chalk')
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");

// SuMo configuration
const rootDir = appRoot.toString().replaceAll("\\", "/");
const libSumoDir = path.dirname(require.resolve('@morenabarboni/sumo'));
const sumoConfig = require(rootDir + "/sumo-config");

const staticConf = {
  sumoDir: rootDir + "/sumo",
  sumoInstallPath: rootDir + "/node_modules/@morenabarboni/sumo",
  baselineDir: rootDir + "/sumo/baseline",
  historyDir: rootDir + "/sumo/history",
  mutantsDir: rootDir + "/sumo/results/mutants",
  reportHtmlDir: libSumoDir + "/src/report-html",
  resultsDir: rootDir + "/sumo/results",
  mutationsJsonPath: rootDir + "/sumo/results/mutations.json",
  mutOpsConfigPath: libSumoDir + "/src/operators.config.json",
  sumoLogTxtPath: rootDir + "/sumo/results/sumo-log.txt",
  contractsGlob: '/**/*.sol',
  testsGlob: '/**/*.{js,sol,ts,py}',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testingFrameworkGlob: ['/truffle-config.js', '/hardhat.config.js', '/hardhat.config.ts', '/foundry.toml', '/brownie-config.yaml'],
}

/**
 * Prepares the directories used by SuMo.
 * It ensures the directories exists by creating them and any missing parent folders recursively. 
 * If the directories already exists, it does nothing 
 */
function setupSumoDirs() {
  const directories = [
    staticConf.sumoDir,
    staticConf.resultsDir,
    staticConf.mutantsDir
  ];

  for (const directory of directories) {
    fs.ensureDirSync(directory);
  }
}

/**
 * Replaces the current SuMo baseline with clean copies of the SUT sources and tests.
 *
 * @param {string} contractsDir - the SUT's contracts directory
 * @param {string} testDir - the SUT's test directory
 * @returns {void}
 */
function createBaseline(contractsDir, testDir) {
  fs.emptyDirSync(staticConf.baselineDir);
  
  fs.copySync(contractsDir, path.join(staticConf.baselineDir, "contracts"));
  fs.copySync(testDir, path.join(staticConf.baselineDir, "test"));
}

/**
 * Restores the SUT files
 */
function restore() {
  const contractsDir = getContractsDir();
  const testDir = getTestDir();

  if (fs.existsSync(staticConf.baselineDir)) {

    //Restore contracts
    glob(staticConf.baselineDir + '/contracts' + staticConf.contractsGlob, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        let relativeFilePath = file.split("sumo/baseline/contracts")[1];
        let fileDir = path.dirname(relativeFilePath);
        fs.mkdir(contractsDir + fileDir, { recursive: true }, function (err) {
          if (err) return cb(err);

          fs.copyFile(file, contractsDir + relativeFilePath, (err) => {
            if (err) throw err;
          });
        });
      }
    });

    //Restore tests
    glob(staticConf.baselineDir + '/test' + staticConf.testsGlob, (err, files) => {
      if (err) throw err;

      for (const file of files) {
        let relativeFilePath = file.split("sumo/baseline/test")[1];
        let fileDir = path.dirname(relativeFilePath);
        fs.mkdir(testDir + fileDir, { recursive: true }, function (err) {
          if (err) return cb(err);

          fs.copyFile(file, testDir + relativeFilePath, (err) => {
            if (err) throw err;
          });
        });
      }
    });

    console.log("Project restored.");
  } else {
    console.log("Project was not restored (No baseline available).");
  }
}

/**
 * Cleans the testing framework's build directory
 * @param {string} buildDirPath - the path to the build directory 
 */
function cleanBuildDir(buildDirPath) {
  if (fs.existsSync(buildDirPath)) {
    fs.emptyDirSync(buildDirPath);
    console.log("Build directory cleaned");
  }
}

/**
 * Cleans the SuMo results directory
 */
function cleanResultsDir() {
  if (fs.existsSync(staticConf.resultsDir)) {
    fs.emptyDirSync(staticConf.resultsDir);
    console.log("Results directory cleaned\n");
    setupSumoDirs();
  }
}

/**
 * Checks the package manager used by the System Under Test (SUT).
 * @returns {string} The detected package manager ('npm' or 'yarn').
 * @throws {Error} When a valid package manager cannot be detected.
 */
function getPackageManager() {
  let packageManager = null;

  for (const lockFile of staticConf.packageManagerGlob) {
    if (fs.existsSync(rootDir + lockFile)) {
      packageManager = lockFile.includes("yarn") ? "yarn" : "npm";
      break;
    }
  }
  if (packageManager === null) {
    throw new Error(`Error: Cannot detect used package manager (the project does not include a valid lock file).`);
  }
  return packageManager;
}

/**
 * Checks the testing framework used by the SUT. If a testing framework is specified in the sumo-config.js, only 
 * that framework will be used. If "auto" is specified, SuMo will looks for the test configuration files to determine
 * which frameworks should be used. In case multiple config files are present, both frameworks will be used.
 * @returns {string[]} An array containing the detected testing framework(s).
 * @throws {Error} When a valid testing framework cannot be detected.
 */
function getTestingFrameworks() {
  const sumoConfigTestingFramework = sumoConfig.testingFramework;
  const validTestingFrameworks = ['auto', 'truffle', 'hardhat', 'forge', 'brownie', 'custom'];

  if (!sumoConfigTestingFramework || sumoConfigTestingFramework === null || sumoConfigTestingFramework === undefined || sumoConfigTestingFramework === "") {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'testingFramework' field missing"))
  }

  let detectedFrameworks = [];

  //User-specified testing framework
  if (sumoConfigTestingFramework !== "auto") {
    if (validTestingFrameworks.includes(sumoConfigTestingFramework)) {
      detectedFrameworks.push(sumoConfigTestingFramework);
    } else {
      throw new Error(`Unsupported testing framework "${sumoConfigTestingFramework}".`);
    }
  }
  //Auto testing framework
  else {
    for (const testConfigFile of staticConf.testingFrameworkGlob) {
      if (fs.existsSync(rootDir + testConfigFile)) {
        if (testConfigFile.includes("truffle")) { detectedFrameworks.push("truffle"); }
        else if (testConfigFile.includes("hardhat")) { detectedFrameworks.push("hardhat"); }
        else if (testConfigFile.includes("foundry")) { detectedFrameworks.push("forge"); }
        else if (testConfigFile.includes("brownie")) { detectedFrameworks.push("brownie"); }
      }
    }
  }
  //Prioritize frameworks so that the same framework is always used for compilation.
  if (detectedFrameworks.length > 1) {
    detectedFrameworks.sort((a, b) => b.localeCompare(a));
  }
  if (detectedFrameworks.length === 0) {
    throw new Error(chalk.red(`Cannot automatically detect testing framework used in: ${rootDir}. You can either:\n- Add a valid test configuration file (e.g., foundry.toml) to your workspace and try again, or\n- Specify a valid testing framework in your sumo-config.js`));
  }
  return detectedFrameworks;
}

/**
 * Selects the test files that can be executed by a specific testing framework
 * based on their extension.  
 * @param {string} testingFramework The testing framework
 * @param {string[]} testFiles The list of test files
 * @returns {string[]} Test files executable by testingFramework
 * @throws {Error} If invalid input parameters are provided or an unsupported testing framework is specified
 */
function getTestsForFramework(testingFramework, testFiles) {
  if (!testingFramework || !testFiles) { throw new Error("Error: Invalid input parameters."); }

  let testFilesForFramework;

  switch (testingFramework) {
    case 'hardhat':
    case 'truffle':
      testFilesForFramework = testFiles.filter(file => file.endsWith('.js') || file.endsWith('.ts') || (file.endsWith('.sol') && !file.endsWith('.t.sol')));
      break;
    case 'brownie':
      testFilesForFramework = testFiles.filter(file => file.endsWith('.py') && (file.includes('test_') || file.includes('_test')));
      break;
    case 'forge':
      testFilesForFramework = testFiles.filter(file => file.endsWith('.t.sol'));
      break;
    default: throw new Error(`Error: Unsupported testing framework "${testingFramework}".`);
  }
  return testFilesForFramework;
}

/**
 * Get the SUT's contracts directory
 * @returns the path of the contracts directory
 */
function getContractsDir() {
  if (!sumoConfig.contractsDir) {
    throw new Error(
      chalk.red(
        "sumo-config.js is incomplete: 'contractsDir' field missing"
      )
    );
  }

  return findDir(sumoConfig.contractsDir, ["contracts", "src"], "contracts");
}

/**
 * Get the SUT's test directory
 * @returns the path of the test directory
 */
function getTestDir() {
  if (!sumoConfig.testDir) {
    throw new Error(
      chalk.red(
        "sumo-config.js is incomplete: 'testDir' field missing"
      )
    );
  }

  return findDir(sumoConfig.testDir, ["test", "tests"], "test");
}

/**
 * Gets the SUT's Solidity compilation artifact directory.
 *
 * If `buildDir` is explicitly defined in `sumo-config.js`, that directory is
 * used. Otherwise, SuMo checks the conventional artifact directories for the
 * selected testing framework.
 *
 * The returned directory must already exist. Users with non-standard project
 * layouts must specify `buildDir` in `sumo-config.js`.
 *
 * @param {string} testingFramework - The selected testing framework.
 * @returns {string} Absolute path to the artifact directory.
 * @throws {Error} If no valid artifact directory can be found.
 */
function getBuildDir(testingFramework) {
  const defaults = {
    hardhat: ["artifacts/contracts", "artifacts"],
    forge: ["out"],
    truffle: ["build/contracts"],
    brownie: ["build/contracts"]
  };

  if (sumoConfig.buildDir && sumoConfig.buildDir !== "auto") {
    return findDir(sumoConfig.buildDir, [], "build");
  }

  if (testingFramework === "custom") {
    throw new Error(
      chalk.red("Custom test scripts require buildDir in sumo-config.js.")
    );
  }

  if (!defaults[testingFramework]) {
    throw new Error(chalk.red(`Unsupported testing framework "${testingFramework}".`));
  }

  return findDir(null, defaults[testingFramework], "build");
}

/**
 * Get the list of of paths to test files/folders to be skipped from the sumo-config.js
 * @returns the array of paths to test files/folders to be skipped
 * @throws Error if the skipTests field is missing
 */
function getSkipTests() {
  if (sumoConfig.skipTests === null || sumoConfig.skipTests === undefined || !sumoConfig.skipTests) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'skipTests' field missing"));
  }
  return sumoConfig.skipTests;
}

/**
 * Get the list of paths to contract files/folders to be skipped from the sumo-config.js
 * @returns the array of paths to contract files/folders to be skipped
 * @throws Error if the skipContracts field is missing
 */
function getSkipContracts() {
  if (!sumoConfig.skipContracts || sumoConfig.skipContracts === null || sumoConfig.skipContracts === undefined) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'skipContracts' field missing"));
  }
  return sumoConfig.skipContracts;
}

/**
 * Get the minimalOperators option from the sumo-config.js
 * @returns the minimalOperators option from the sumo-config.js
 * @throws Error if the minimalOperators field is missing
 */
function getMinimalOperators() {
  if (sumoConfig.minimalOperators === null || sumoConfig.minimalOperators === undefined) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'minimalOperators' field missing"));
  }
  return sumoConfig.minimalOperators;
}

/**
 * Get the randomSampling option from the sumo-config.js
 * @returns the randomSampling option from the sumo-config.js
 * @throws Error if the randomSampling field is missing
 */
function getRandomSampling() {
  if (sumoConfig.randomSampling === null || sumoConfig.randomSampling === undefined) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'randomSampling' field missing"));
  }
  return sumoConfig.randomSampling;
}

/**
 * Get the randomMutants option from the sumo-config.js
 * @returns the randomMutants option from the sumo-config.js
 * @throws Error if the randomMutants field is missing
 */
function getRandomMutants() {
  if (sumoConfig.randomMutants === null || sumoConfig.randomMutants === undefined) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'randomMutants' field missing"));
  }
  return sumoConfig.randomMutants;
}


/**
 * Get the testing timeout in seconds from the sumo-config.js
 * @returns the testingTimeOutInSec
 * @throws Error if the testingTimeOutInSec field is missing
 */
function getTestingTimeout() {
  if (sumoConfig.testingTimeOutInSec === null || sumoConfig.testingTimeOutInSec === undefined
    || !sumoConfig.testingTimeOutInSec) {
    throw Error(chalk.red("Your sumo-config.js is incomplete: 'testingTimeOutInSec' field missing"));
  }
  return sumoConfig.testingTimeOutInSec;
}

/**
 * Get the TCE setting
 * @returns whether the TCE is enabled or not
 */
function getTCE() {
  return sumoConfig.tce ?? false;
}

/**
 * Gets the diff between two strings
 * @param {String} str1 the first string
 * @param {String} str2 the second string    
 * @returns the diff between str1 and str2.
 */
function getStringDiff(str1, str2) {
  // Split both strings into arrays of words
  const words1 = str1.trim().split(/\s+/);
  const words2 = str2.trim().split(/\s+/);

  // Initialize indexes to compare from start and end
  let start = 0;
  let end1 = words1.length - 1;
  let end2 = words2.length - 1;

  // Find the first index where words differ from the start
  while (start <= end1 && start <= end2 && words1[start] === words2[start]) {
    start++;
  }

  // Find the last index where words differ from the end
  while (end1 >= start && end2 >= start && words1[end1] === words2[end2]) {
    end1--;
    end2--;
  }

  // Collect the differing words from the first differing index to the last differing index
  const diffFromFirst = words1.slice(start, end1 + 1).join(' ');
  const diffFromSecond = words2.slice(start, end2 + 1).join(' ');

  // Determine which difference to return based on which one is not empty
  if (diffFromFirst.length > 0) {
    return diffFromFirst;
  } else {
    return diffFromSecond;
  }
}

/**
 * Returns the first existing directory from the configured path and defaults.
 *
 * @param {string|null|undefined} configuredDir - User-configured directory.
 * @param {string[]} defaults - Fallback directory paths.
 * @param {string} label - Directory name used in error messages.
 * @returns {string} Absolute path to the first existing directory.
 * @throws {Error} If no candidate directory exists.
 */
function findDir(configuredDir, defaults, label) {
  const candidates =
    configuredDir && configuredDir !== "auto"
      ? [configuredDir, ...defaults]
      : defaults;

  const found = candidates
    .map(dir => path.join(rootDir, dir.replace(/^[/\\]+/, "")))
    .find(dir => fs.existsSync(dir));

  if (!found) {
    throw new Error(
      chalk.red(
        `No valid ${label} directory found in ${rootDir}.\n` +
        `Checked: ${candidates.join(", ")}`
      )
    );
  }

  return found.replaceAll("\\", "/");
}

/**
 * Reads a JSON file synchronously and parses its content.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Object|null} The parsed JSON data, or null if an error occurs.
 */
function readJSONFile(filePath) {
  let jsonData;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    jsonData = JSON.parse(data);
  } catch (err) {
    console.error('Error reading or parsing the file:', err);
  }
  return jsonData;
}

/**
 * Deletes a JSON file synchronously.
 * @param {string} filePath - The path to the JSON file.
 */
function deleteJSONFile(filePath) {
  try {
    // Delete the file
    fs.unlinkSync(filePath);
    //console.log('File deleted successfully');
  } catch (err) {
    console.error('Error deleting the file:', err);
  }
}

module.exports = {
  staticConf: staticConf,
  cleanBuildDir: cleanBuildDir,
  cleanResultsDir: cleanResultsDir,
  createBaseline: createBaseline,
  deleteJSONFile: deleteJSONFile,
  getBuildDir: getBuildDir,
  getContractsDir: getContractsDir,
  getMinimalOperators: getMinimalOperators,
  getPackageManager: getPackageManager,
  getRandomMutants: getRandomMutants,
  getRandomSampling: getRandomSampling,
  getSkipContracts: getSkipContracts,
  getSkipTests: getSkipTests,
  getStringDiff: getStringDiff,
  getTCE: getTCE,
  getTestDir: getTestDir,
  getTestingFrameworks: getTestingFrameworks,
  getTestsForFramework: getTestsForFramework,
  getTestingTimeout: getTestingTimeout,
  readJSONFile: readJSONFile,
  restore: restore,
  setupSumoDirs: setupSumoDirs
};
