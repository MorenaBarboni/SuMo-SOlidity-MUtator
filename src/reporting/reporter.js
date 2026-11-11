// External modules
const appRoot = require('app-root-path');
const chalk = require('chalk')
const fs = require('fs')
const fse = require('fs-extra');
const path = require("path");
const moment = require('moment');
const rootDir = appRoot.toString().replaceAll("\\", "/");

// Internal modules
const utils = require('../utils');
//Sumo static conf
const { sumoDir, historyDir, baselineDir, resultsDir, sumoLogTxtPath, mutationsJsonPath, mutOpsConfigPath } = utils.staticConf;
const mutOpsConfig = require(mutOpsConfigPath)


class Reporter {
  constructor() {
    this.operators = Object.entries(mutOpsConfig);
    this.resetMutationResults();
  }

  /**
   * Clears mutation-testing result buckets before starting a new command.
   */
  resetMutationResults() {
    this.survived = [];
    this.killed = [];
    this.uncompilable = [];
    this.timedout = [];
    this.equivalent = [];
  }

  /**********************************************************
   * LOGGING MUTATION TESTING PROCESS INFO
   **********************************************************/

  chalkMutant(mutant) {
    return chalk.rgb(186, 85, 211)(mutant.id);
  }
  logPretest() {
    console.log(chalk.yellow.bold("Running pre-test 🔎\n"));
  }
  logSetupCheck() {
    console.log(chalk.yellow.bold("\nChecking project configuration\n"));
  }
  logStartMutationTesting() {
    console.log(chalk.yellow.bold("Starting Mutation Testing 👾"));
  }
  logCompile(mutant) {
    console.log(chalk.yellow("Applying mutation ") + this.chalkMutant(mutant) + " to " + mutant.fileName());
    process.stdout.write(mutant.diffColor());
    console.log("\n" + chalk.yellow("Compiling mutation ") + this.chalkMutant(mutant) + " of " + mutant.fileName());
  }
  logMutationProgress(mutations_index, mutations_length, mutant) {
    console.log("\n" + chalk.bgYellow("> Mutation " + chalk.bold(mutations_index) + " of " + chalk.bold(mutations_length) + " - [" + chalk.bold(mutant.id) + " of " + chalk.bold(mutant.fileName()) + "]"));
  }
  logTest(mutant) {
    console.log("\n" + (chalk.yellow("Running tests ") + "for mutant " + this.chalkMutant(mutant)));
  }
  /**
   * Logs the setup details and saves the project configuration to sumo-log.txt.
   * @param {string} contractsDir - The contracts directory
   * @param {string} testDir - The tests directory
   * @param {string} buildDir - The build directory
   * @param {Array<string>} testingFramework - The testing framework(s) used
   * @param {string} packageManager - The package manager detected
   * 
   */
  logAndSaveSetup(contractsDir, testDir, buildDir, testingFramework, packageManager) {
    const frameworkNames = testingFramework.join(", ");

    console.log("Testing framework(s): " + frameworkNames);
    console.log("Contracts directory: " + contractsDir);
    console.log("Test directory: " + testDir);
    console.log("Build directory (" + testingFramework[0] + "): " + buildDir);
    console.log("Package manager: " + packageManager + "\n");


    const report = [
      this.formatSection("Project Configuration"),
      "",
      this.formatField("Testing framework(s)", frameworkNames),
      this.formatField("Contracts directory", contractsDir),
      this.formatField("Test directory", testDir),
      this.formatField(`Build directory (${testingFramework[0]})`, buildDir),
      this.formatField("Package manager", packageManager),
      "",
    ].join("\n");

    fs.appendFileSync(sumoLogTxtPath, report);
  }
  /**
   * Prints the files under test and saves them to sumo-log.txt.
   * @param {string[]} contracts the list of contracts to be mutated
   * @param {string[]} tests the list of tests to be run
   * @param {string[]} testingFrameworks - The list of testing frameworks used within the SUT
   */
  logSelectedFiles(contracts, tests, testingFrameworks) {
    console.log(chalk.yellow.bold("Selecting Contract and Test Files\n"));

    console.log(`Contracts to be mutated (${contracts.length}):`);
    contracts.length === 0
      ? console.log("  " + chalk.red("None"))
      : contracts.forEach(file => console.log("  " + path.join(path.parse(file).dir, chalk.bold(path.basename(file)))));

    console.log(`\nTests to be run (${tests.length}):`);
    tests.length === 0
      ? console.log("  " + chalk.red("None"))
      : tests.forEach(file => console.log("  " + path.join(path.parse(file).dir, chalk.bold(path.basename(file)))));
    console.log();

    const report = [
      "",
      this.formatSection("Selected Files"),
      "",
      `Contracts to be mutated (${contracts.length})`,
      ...this.formatList(contracts),
      "",
      `Tests to be run (${tests.length})`,
      ...this.formatList(tests),
      "",
    ].join("\n");

    fs.appendFileSync(sumoLogTxtPath, report);

    if (testingFrameworks.includes("custom") && utils.getSkipTests().length > 0) {
      console.log(chalk.yellow("WARNING: You are using a CUSTOM testing framework - SKIPTESTS will be ignored."));
      console.log(chalk.yellow("\n         To skip some tests you can either:"));
      console.log(chalk.yellow("         - specify the test files to be run in your \"test\" script;\n         - remove the test files to be skipped from the test folder.\n\n"));
    }
  }
  /**
   * Prints the mutant generation message.
   * @param {string} operators the enabled operators
   */
  logLookup(operators) {
    console.log(chalk.yellow.bold("Generating Mutations") + " 🧬");
    console.log(operators);
  }
  /**
   * Prints the lookup command summary.
   * @returns {Array<object>} - The array of generated mutations.
   * @param {number} mutantGenerationTime - the mutant generation time
   */
  logLookupSummary(mutations, mutantGenerationTime) {
    const duration = this.formatDuration(mutantGenerationTime);
    const summary = `${mutations.length} mutation(s) generated in ${duration}`;

    fs.appendFileSync(
      sumoLogTxtPath,
      [
        "",
        this.formatSection("Mutant Generation"),
        "",
        this.formatField("Generated mutants", mutations.length),
        this.formatField("Generation time", duration),
        "",
      ].join("\n")
    );

    console.log(summary + "\n");
  }
  /**
   * Logs the final mutation-testing summary to console and to sumo-log.txt.
   *
   * @param {number} pretestTime - Pre-test execution time in milliseconds.
   * @param {number} mutantGenerationTime - Total mutant generation time in milliseconds.
   * @param {number} mutationTestingTime - Mutation-testing time in milliseconds.
   * @returns {void}
   */
  logTestSummary(pretestTime, mutantGenerationTime, mutationTestingTime) {

    const totalTime = pretestTime + mutantGenerationTime + mutationTestingTime;
    const totalTimeString = this.formatDuration(totalTime);
    const pretestTimeString = this.formatDuration(pretestTime);
    const mutantGenerationTimeString = this.formatDuration(mutantGenerationTime);
    const mutationTestingTimeString = this.formatDuration(mutationTestingTime);

    const killedMutants = this.killed.length;
    const liveMutants = this.survived.length;
    const equivalentMutants = this.equivalent.length;
    const uncompilableMutants = this.uncompilable.length;
    const timedoutMutants = this.timedout.length;

    const testedMutants = liveMutants + killedMutants;
    const totalMutants = testedMutants + equivalentMutants + uncompilableMutants + timedoutMutants;
    const mutationScore = testedMutants > 0 ? ((killedMutants / testedMutants) * 100).toFixed(2) : null;

    const statusSections = [
      ["Live", this.survived],
      ["Killed", this.killed],
      ["Uncompilable", this.uncompilable],
      ["Timed out", this.timedout],
      ["Equivalent", this.equivalent],
    ];

    console.log("\n" + chalk.yellow.bold(`Mutation Testing completed in ${totalTimeString} 👋`));
    console.log([
      `SuMo generated ${totalMutants} mutants:`,
      ...statusSections.map(([label, mutants]) => `- ${mutants.length} ${label.toLowerCase()}`),
      "",
    ].join("\n"));

    let scoreColor = chalk.bold.red;
    if (mutationScore >= 80) {
      scoreColor = chalk.bold.green;
    } else if (mutationScore >= 60) {
      scoreColor = chalk.bold.yellow;
    }
    const scoreText = mutationScore === null ? "-" : `${mutationScore} %`;
    console.log(chalk.bold("Mutation Score") + ": " + scoreColor(scoreText));

    const reportLines = [
      "",
      this.formatSection("Mutation Testing Summary"),
      "",
      this.formatField("Generated mutants", totalMutants),
      this.formatField("Tested mutants", testedMutants),
      this.formatField("Mutation score", mutationScore === null ? "-" : `${mutationScore}%`),
      "",
      "Mutant status",
      "-".repeat(72),
    ];

    for (const [label, mutants] of statusSections) {
      reportLines.push(this.formatField(label, mutants.length));
      if (mutants.length > 0) {
        reportLines.push(...this.formatList(mutants.map(mutant => mutant.id)));
      }
    }

    reportLines.push(
      "",
      "Execution time",
      "-".repeat(72),
      this.formatField("Pre-test", pretestTimeString),
      this.formatField("Mutant generation", mutantGenerationTimeString),
      this.formatField("Mutation testing", mutationTestingTimeString),
      this.formatField("Total", totalTimeString),
      ""
    );

    fs.appendFileSync(
      sumoLogTxtPath,
      reportLines.join("\n"),
      { flags: "a" }
    );
  }

  /**********************************************************
  * MUTANT STATUS UPDATE
  **********************************************************/

  /**
   * Sets the status of a mutant and saves the mutation to the mutations.json file
   * @param {Object} mutant the mutant under test
   */
  updateMutantStatus(mutant) {

    switch (mutant.status) {
      case "killed":
        this.killed.push(mutant);
        console.log("\n💀 Mutant " + this.chalkMutant(mutant) + " was killed by the tests.");
        break;
      case "live":
        this.survived.push(mutant);
        console.log("\n🐛 Mutant " + this.chalkMutant(mutant) + " survived testing");
        break;
      case "uncompilable":
        this.uncompilable.push(mutant);
        console.log("\n❌ Mutant " + this.chalkMutant(mutant) + " is uncompilable");
        break;
      case "timedout":
        this.timedout.push(mutant);
        console.log("\n🕒 Mutant " + this.chalkMutant(mutant) + " has timed out");
        break;
      case "equivalent":
        this.equivalent.push(mutant);
        console.log("\n⏩ Mutant " + this.chalkMutant(mutant) + " is trivially equivalent");
    }

    this.updateMutationsJson(mutant);
  }

  /**********************************************************
  * GENERATING MUTATION TESTING REPORTS
  **********************************************************/

  /**
   * Saves various reports from the mutant generation process
   * (sumo-log.txt, mutations.json)
   * @param {Array} mutations - The generated mutations
   */
  saveMutantGenerationReports(mutations) {
    this.saveGeneratedMutationsSumoLogTxt(mutations);
    this.saveGeneratedMutationsJson(mutations);
  }

  /**
   * Logs the generated mutants to sumo-log.txt
   * @param {Array} mutations - The generated mutations
   */
  saveGeneratedMutationsSumoLogTxt(mutations) {
    const groupedMutants = {};

    for (const mutant of mutations) {
      const file = mutant.fileName();
      if (!groupedMutants[file]) {
        groupedMutants[file] = [];
      }
      groupedMutants[file].push(mutant);
    }

    const reportLines = [
      "",
      "Generated mutant details",
      "-".repeat(72),
    ];

    for (const [file, fileMutants] of Object.entries(groupedMutants)) {
      reportLines.push(
        "",
        `${file} (${fileMutants.length})`,
        ...fileMutants.map(mutant =>
          `  - ${mutant.id}  [operator: ${mutant.operator}]`
        )
      );
    }

    reportLines.push("");
    fs.appendFileSync(sumoLogTxtPath, reportLines.join("\n"));
  }

  /**
   * Creates an empty mutations.json file.
   */
  setupMutationsJson() {
    this.writeMutationsJson({});
  }

  /**
   * Clusters generated mutants by contract and replaces mutations.json.
   * This is the canonical initialization used by lookup, mutate, and test.
   * @param {Array} mutants - Generated mutants.
   */
  saveGeneratedMutationsJson(mutants) {
    const mutationsByContract = {};

    for (const mutant of mutants) {
      const contract = mutant.fileName();
      if (!mutationsByContract[contract]) {
        mutationsByContract[contract] = [];
      }

      mutationsByContract[contract].push(JSON.parse(mutant.toJson()));
    }

    this.writeMutationsJson(mutationsByContract);
  }

  /**
   * Reads mutations.json.
   * @returns {Object} Parsed mutation data.
   */
  readMutationsJson() {
    if (!fs.existsSync(mutationsJsonPath)) {
      throw new Error(chalk.red(mutationsJsonPath + " does not exist!"));
    }

    return JSON.parse(fs.readFileSync(mutationsJsonPath, 'utf8'));
  }

  /**
   * Writes mutation data to mutations.json.
   * @param {Object} mutations - Mutations grouped by contract.
   */
  writeMutationsJson(mutations) {
    fs.writeFileSync(mutationsJsonPath, JSON.stringify(mutations, null, '\t'));
  }

  /**
   * Updates a mutant in mutations.json with its test results.
   * @param {Object} mutant - Mutant to update.
   */
  updateMutationsJson(mutant) {
    const mutations = this.readMutationsJson();
    const contract = mutant.fileName();

    if (!mutations[contract]) {
      console.error(chalk.red("\nContract " + contract + " not found in mutations.json\n"));
      return;
    }

    const mutantToUpdate = mutations[contract].find(candidate => candidate.id === mutant.id);
    if (!mutantToUpdate) {
      console.error(chalk.red("\nMutant " + mutant.id + " not found\n"));
      return;
    }

    mutantToUpdate.status = mutant.status;
    mutantToUpdate.compilationTime = mutant.compilationTime;
    mutantToUpdate.testingTime = mutant.testingTime;
    mutantToUpdate.totalTime = mutant.totalTime;

    this.writeMutationsJson(mutations);
  }

  /**********************************************************
  * HISTORY
  **********************************************************/
  /**
   * Copies the configured baseline and results folders into "history".
   */
  saveResultsHistory() {

    const newFolderName =
      `${path.basename(rootDir)}-${moment().format('YYYY-MM-DD-HH-mm-ss')}`;

    const destinationDir = path.join(historyDir, newFolderName);

    fs.mkdirSync(destinationDir, { recursive: true });

    const foldersToCopy = [
      resultsDir,
      baselineDir
    ];

    foldersToCopy.forEach(sourceDir => {
      const folderName = path.basename(sourceDir);
      const destinationPath = path.join(destinationDir, folderName);

      if (sourceDir === resultsDir) {
        const resultEntries = fs.readdirSync(sourceDir);

        resultEntries.forEach(entryName => {
          if (entryName === 'report-html') return;

          const sourcePath = path.join(sourceDir, entryName);
          const destinationEntryPath = path.join(
            destinationPath,
            entryName
          );

          fse.copySync(sourcePath, destinationEntryPath);
        });
      } else {
        fse.copySync(sourceDir, destinationPath);
      }
    });

    console.log(`Results copied to ${chalk.green(destinationDir)}`);
  }

  /**********************************************************
  * FORMATTING HELPERS
  **********************************************************/

  /**
   * Converts a duration in milliseconds into a formatted string.
   *
   * Example: 3_661_245 becomes "1 h, 1 min, 1 s, 245 ms".
   *
   * @param {number} timeInMilliseconds - Duration in milliseconds.
   * @returns {string} Formatted duration.
   */
  formatDuration(timeInMilliseconds) {
    const totalMilliseconds = Math.max(
      0,
      Math.round(Number(timeInMilliseconds) || 0)
    );

    const hours = Math.floor(totalMilliseconds / 3_600_000);
    const minutes = Math.floor(
      (totalMilliseconds % 3_600_000) / 60_000
    );
    const seconds = Math.floor(
      (totalMilliseconds % 60_000) / 1_000
    );
    const milliseconds = totalMilliseconds % 1_000;

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} h`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} min`);
    }

    if (seconds > 0) {
      parts.push(`${seconds} s`);
    }

    parts.push(`${milliseconds} ms`);

    return parts.join(", ");
  }
  /**
 * Creates a consistent heading for the plain-text report.
 * @param {string} title - Section title.
 * @returns {string} Formatted section heading.
 */
  formatSection(title) {
    const separator = "=".repeat(72);
    return `${separator}\n${title.toUpperCase()}\n${separator}`;
  }

  /**
   * Formats a label/value pair for aligned plain-text output.
   * @param {string} label - Field label.
   * @param {*} value - Field value.
   * @returns {string} Formatted line.
   */
  formatField(label, value) {
    return `${label.padEnd(24)}: ${value}`;
  }

  /**
   * Formats a list using a compact indented bullet style.
   * @param {string[]} items - Values to list.
   * @returns {string[]} Formatted list lines.
   */
  formatList(items) {
    return items.length > 0
      ? items.map(item => `  - ${item}`)
      : ["  - None"];
  }
}

module.exports = Reporter
