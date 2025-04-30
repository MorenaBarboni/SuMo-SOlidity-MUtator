// External modules
const chalk = require('chalk')
const fs = require('fs')
const path = require("path");
// Internal modules
const utils = require('./utils');
//Sumo static conf
const { sumoLogTxtPath, mutationsJsonPath, mutOpsConfigPath } = utils.staticConf;
const mutOpsConfig = require(mutOpsConfigPath)


class Reporter {
  constructor() {
    this.operators = Object.entries(mutOpsConfig);
    this.survived = [];
    this.uncovered = [];
    this.killed = [];
    this.stillborn = [];
    this.timedout = [];
  }

  /**********************************************************
   * LOGGING MUTATION TESTING PROCESS INFO
   **********************************************************/

  chalkMutant(mutant) {
    return chalk.rgb(186, 85, 211)(mutant.hash());
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
   * @param {string} contractsDir - The contracts directory.
   * @param {string} testDir - The tests directory.
   * @param {string} buildDir - The build directory.
   * @param {Array<string>} testingFramework - The testing framework(s) used.
   */
  logAndSaveSetup(contractsDir, testDir, buildDir, testingFramework) {
    console.log("Testing framework(s): " + testingFramework.join(", "));
    console.log("Contracts directory: " + contractsDir);
    console.log("Test directory: " + testDir);
    console.log("Build directory (" + testingFramework[0] + "): " + buildDir + "\n");

    fs.writeFileSync(sumoLogTxtPath, ">>> PROJECT CONFIGURATION \n\nTesting framework: " + testingFramework + "\nContracts directory: " + contractsDir +
      "\nTest directory: " + testDir + "\nBuild directory (" + testingFramework[0] + "): " + buildDir + "\n\n", function (err) {
        if (err) return console.log(err);
      });
  }
  /**
   * Prints the files under test and saves them to sumo-log.txt.
   * @param {string[]} contracts the list of contracts to be mutated
   * @param {string[]} tests the list of tests to be run
   * @param {string[]} testingFrameworks - The list of testing frameworks used within the SUT
   */
  logSelectedFiles(contracts, tests, testingFrameworks) {
    const numContracts = contracts.length;
    const numTests = tests.length;

    console.log(chalk.yellow.bold("Selecting Contract and Test Files\n"));

    if (numContracts === 0) {
      console.log("Contracts to be mutated : " + chalk.red("None"));
    }
    else {
      console.log("Contracts to be mutated : (" + numContracts + "):");
      fs.appendFileSync(sumoLogTxtPath, ">>> SELECTED FILES \n\nContracts to be mutated : (" + numContracts + "):\n", function (err) {
        if (err) return console.log(err);
      });

      contracts.forEach((c) => {
        console.log(
          "\t" + path.parse(c).dir + "/" + chalk.bold(path.basename(c))
        );
        fs.appendFileSync(sumoLogTxtPath, "\t" + "- " + path.parse(c).dir + "/" + path.basename(c) + "\n", function (err) {
          if (err) return console.log(err);
        });
      });
    }
    console.log();

    if (numTests == 0) console.log("Tests to be run : " + chalk.red("None"));
    else {
      console.log("Tests to be run : (" + numTests + "):");
      fs.appendFileSync(sumoLogTxtPath, "Tests to be run : (" + numTests + "):\n", function (err) {
        if (err) return console.log(err);
      });

      tests.forEach((t) => {
        console.log(
          "\t" + path.parse(t).dir + "/" + chalk.bold(path.basename(t))
        );
        fs.appendFileSync(sumoLogTxtPath, "\t" + "- " + path.parse(t).dir + "/" + path.basename(t) + '\n', function (err) {
          if (err) return console.log(err);
        });

      });
    }
    console.log();
    if (testingFrameworks.includes("custom") && utils.getSkipTests().length > 0) {
      console.log(chalk.yellow("WARNING: You are using a CUSTOM testing framework - SKIPTESTS will be ignored."));
      console.log(chalk.yellow("\n         To skip some tests you can either:"));
      console.log(chalk.yellow("         - specify the test files to be run in your \"test\" script;\n         - remove the test files to be skipped from the test folder.\n\n"));
    }

    if (numContracts > 0) {
      fs.appendFileSync(sumoLogTxtPath, "\n\n>>> GENERATED MUTANTS \n", function (err) {
        if (err) return console.log(err);
      });
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
   * @param {number} genTime the mutant generation time
   */
  logLookupSummary(mutations, genTime) {
    const lookup = mutations.length + " mutation(s) found in " + genTime + " seconds\n"; // + "Results saved to /sumo/results/report-html\n";

    fs.appendFileSync(sumoLogTxtPath, "\n\n>>> GENERATION SUMMARY \n\n" + lookup + "\n", function (err) {
      if (err) return console.log(err);
    });

    console.log(lookup);
  }
  /**
 * Logs the final test summary to console (and to report.txt)
 * @param {*} time the total testing time in seconds
 */
  logTestSummary(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    let timeString = seconds + " seconds";

    if (hours > 0) {
      timeString = hours + " hours, " + minutes + " minutes and " + timeString;
    } else if (minutes > 0) {
      timeString = minutes + " minutes and " + timeString;
    }
    const killedMutants = this.killed.length;
    const uncoveredMutants = this.uncovered.length;
    const liveMutants = this.survived.length + uncoveredMutants;
    const stillbornMutants = this.stillborn.length;
    const timedoutMutants = this.timedout.length;
    const validMutants = liveMutants + killedMutants;
    const totalMutants = validMutants + stillbornMutants + timedoutMutants;
    const mutationScore = ((killedMutants / validMutants) * 100).toFixed(2);

    console.log("\n" + chalk.yellow.bold("Mutation Testing completed in " + timeString + " 👋"));

    let message =
      "SuMo generated " + totalMutants + " mutants: \n" +
      "- " + liveMutants + " live; \n";
    if (uncoveredMutants > 0) {
      message += "--- (of which " + uncoveredMutants + " uncovered) \n";
    }
    message +=
      "- " + killedMutants + " killed; \n" +
      "- " + stillbornMutants + " stillborn; \n" +
      "- " + timedoutMutants + " timed-out. \n";
    console.log(message);

    if (mutationScore >= 80) {
      console.log(chalk.bold("Mutation Score") + ": " + chalk.bold.green(mutationScore + " %"));
    } else if (mutationScore >= 60 && mutationScore < 80) {
      console.log(chalk.bold("Mutation Score") + ": " + chalk.bold.yellow(mutationScore + " %"));
    } else if (mutationScore < 60) {
      console.log(chalk.bold("Mutation Score") + ": " + chalk.bold.red(mutationScore + " %"));
    } else {
      console.log(chalk.bold("Mutation Score") + ": " + chalk.bold.red("-"));
    }

    var printString = "\n\n >>> TEST REPORT"
      + "\n\n - Generated mutants: " + totalMutants
      + "\n\n - Tested mutants: " + validMutants;

    printString = printString + "\n\n - Live mutants: " + liveMutants;
    if (liveMutants > 0)
      printString = printString + "\n --- Live: " + JSON.stringify(this.survived.map(m => m.hash()).join(", "));

    printString = printString + "\n\n - Killed mutants: " + killedMutants;
    if (killedMutants > 0)
      printString = printString + "\n --- Killed: " + JSON.stringify(this.killed.map(m => m.hash()).join(", "));

    printString = printString + "\n\n - Stillborn mutants: " + stillbornMutants;
    if (stillbornMutants > 0)
      printString = printString + "\n --- Stillborn: " + JSON.stringify(this.stillborn.map(m => m.hash()).join(", "));

    printString = printString + "\n\n - Timed-Out mutants: " + timedoutMutants;
    if (timedoutMutants > 0)
      printString = printString + "\n --- Timed-Out: " + JSON.stringify(this.timedout.map(m => m.hash()).join(", "));

    printString = printString + "\n\n MUTATION SCORE = " + mutationScore;
    fs.appendFileSync(sumoLogTxtPath, printString + "\n\n- " + totalMutants + " mutant(s) tested in " + timeString + "." + "\n- SuMo test done.", { "flags": "a" }, function (err) {
      if (err) return console.log(err);
    });
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
      case "live(uncovered)":
        this.uncovered.push(mutant);
        console.log("\n🐛 Mutant " + this.chalkMutant(mutant) + " survived testing (uncovered)");
        break;
      case "stillborn":
        this.stillborn.push(mutant);
        console.log("\n ❌ Mutant " + this.chalkMutant(mutant) + " is stillborn");
        break;
      case "timedout":
        this.timedout.push(mutant);
        console.log("\n 🕒 Mutant " + this.chalkMutant(mutant) + " has timed out after " + (utils.getTestingTimeout()) / 60 + " minutes");
        break;
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
    this.saveGeneratedMutationsJson(mutations)
  }

  /**
   * Logs the generated mutants to sumo-log.txt
   * @param {Array} mutations - The generated mutations
   */
  saveGeneratedMutationsSumoLogTxt(mutations) {

    const groupedMutants = {}; // Group mutants by file
    mutations.forEach(m => {
      if (!groupedMutants[m.file]) {
        groupedMutants[m.file] = [];
      }
      groupedMutants[m.file].push(m);
    });

    let mutantString = "";
    for (const file in groupedMutants) {
      mutantString += "\n Mutants generated for file: " + file + ": \n";
      groupedMutants[file].forEach(m => {
        mutantString += "- Mutant " + m.hash() + " was generated by " + m.operator + " \n";
        //        mutantString += "- Mutant " + m.hash() + " was generated by " + m.operator + " (" + m.operatorName + "). \n";
      });
    }

    fs.appendFileSync(sumoLogTxtPath, mutantString, { "flags": "a" }, function (err) {
      if (err) return console.log(err);
    });
  }

  //Setup the mutations.json file
  setupMutationsJson() {
    const mutationsJson = {};
    const jsonString = JSON.stringify(mutationsJson, null, '\t');

    fs.writeFileSync(mutationsJsonPath, jsonString, function (err) {
      if (err) return console.log(err);
    });
  }

  /**
  * Clusters a list of mutants by contract and saves them to the mutations.json file
  * @param {Array} mutants the array of mutants to be saved
  */
  saveGeneratedMutationsJson(mutants) {

    this.setupMutationsJson();
    var mutations = this.readMutationsJson();

    for (var mutant of mutants) {
      const contract = mutant.fileName();
      let m = JSON.parse(mutant.toJson());

      // Check if the array for the contract already exists, otherwise create it
      if (!mutations[contract]) {
        mutations[contract] = [];
      }

      mutations[contract].push(m);
    }
    this.writeMutantionsJson(mutations);
  }

  /**
  * Read the mutations.json file
  * @returns the content of the file
  */
  readMutationsJson() {
    if (fs.existsSync(mutationsJsonPath)) {
      return JSON.parse(fs.readFileSync(mutationsJsonPath, 'utf8'));
    } else {
      throw new Error(chalk.red(mutationsJsonPath + " does not exist!"))
    }
  }

  /**
   * Write a list of mutations to the mutations.json file
   * @param {Array} mutations the list of mutations to be written to file
   */
  writeMutantionsJson(mutations) {
    fs.writeFileSync(mutationsJsonPath, JSON.stringify(mutations, null, '\t'), function (err) {
      if (err) return console.log(err);
    });
  }

  /**
   * Updates a mutant in the mutations.json file with its test results (status and testing time)
   * @param {Object} mutant - the mutant to update
   */
  updateMutationsJson(mutant) {

    var mutations = this.readMutationsJson();

    const contract = mutant.fileName();
    let m = JSON.parse(mutant.toJson());

    var updated = false;

    for (var mutantToUpdate of mutations[contract]) {
      if (mutantToUpdate.id === m.id) {
        mutantToUpdate.status = m.status;
        mutantToUpdate.testingTime = m.testingTime;
        updated = true;
        break;
      }
    }

    if (!updated)
      console.error(chalk.red("\nMutant " + m.id + " not found\n"));

    this.writeMutantionsJson(mutations);
  }
}


module.exports = Reporter