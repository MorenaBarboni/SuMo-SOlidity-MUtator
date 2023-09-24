const chalk = require('chalk')
const fs = require('fs')
var excel = require('excel4node');
const fse = require('fs-extra');
const path = require("path");
const utils = require('./utils');
const appRoot = require('app-root-path');
const rootDir = appRoot.toString().replaceAll("\\", "/");
const sumoConfig = require(rootDir + "/sumo-config");
const mutOpsConfig = require(utils.config.mutOpsConfig);
const reportTxt = utils.config.reportTxt;
const resultsDir = utils.config.resultsDir;
const Papa = require('papaparse');

function Reporter() {
  this.operators = Object.entries(mutOpsConfig);
  this.survived = [];
  this.killed = [];
  this.stillborn = [];
  this.equivalent = [];
  this.redundant = [];
  this.timedout = [];
}

Reporter.prototype.chalkMutant = function (mutant) {
  return chalk.rgb(186, 85, 211)(mutant.hash());
}

Reporter.prototype.logPretest = function () {
  console.log(chalk.yellow.bold("Running pre-test 🔎\n"));
};

/**
 * Prints the files under test and saves them to report.txt
 * @param {*} contracts list of contracts to be mutated
 * @param {*} tests list of tests to be run
 */
Reporter.prototype.logSetup = function () {
  console.log(chalk.yellow.bold("\nChecking project configuration\n"));
}

/**
 * Prints the project folders and saves them to report.txt
 * @param {*} contracts list of contracts to be mutated
 * @param {*} tests list of tests to be run
 */
Reporter.prototype.logAndSaveConfigDirs = function (contractsDir, testDir, buildDir) {
  console.log("Contracts directory: " + contractsDir);
  console.log("Test directory: " + testDir);
  console.log("Build directory: " + buildDir + "\n");
  fs.writeFileSync(reportTxt, ">>> PROJECT CONFIGURATION \n\nContracts directory: " + contractsDir +
    "\nTest directory: " + testDir + "\nBuild directory: " + buildDir + "\n\n", function (err) {
      if (err) return console.log(err);
    });
}

/**
 * Prints the files under test and saves them to report.txt
 * @param {*} contracts list of contracts to be mutated
 * @param {*} tests list of tests to be run
 */
Reporter.prototype.logSelectedFiles = function (contracts, tests) {
  const numContracts = contracts.length;
  const numTests = tests.length;

  console.log(chalk.yellow.bold("Selecting Contract and Test Files\n"))

  if (numContracts === 0) {
    console.log("Contracts to be mutated : " + chalk.red("None"));
  }
  else {
    console.log("Contracts to be mutated : (" + numContracts + "):");
    fs.appendFileSync(reportTxt, ">>> SELECTED FILES \n\nContracts to be mutated : (" + numContracts + "):\n", function (err) {
      if (err) return console.log(err);
    });

    contracts.forEach((c) => {
      console.log(
        "\t" + path.parse(c).dir + "/" + chalk.bold(path.basename(c))
      );
      fs.appendFileSync(reportTxt, "\t" + "- " + path.parse(c).dir + "/" + path.basename(c) + "\n", function (err) {
        if (err) return console.log(err);
      });
    });
  }
  console.log();

  if (numTests == 0) console.log("Tests to be run : " + chalk.red("None"));
  else {
    console.log("Tests to be run : (" + numTests + "):");
    fs.appendFileSync(reportTxt, "Tests to be run : (" + numTests + "):\n", function (err) {
      if (err) return console.log(err);
    });

    tests.forEach((t) => {
      console.log(
        "\t" + path.parse(t).dir + "/" + chalk.bold(path.basename(t))
      );
      fs.appendFileSync(reportTxt, "\t" + "- " + path.parse(t).dir + "/" + path.basename(t) + '\n', function (err) {
        if (err) return console.log(err);
      });

    });
  }
  console.log();
  if (sumoConfig.testingFramework === "custom" && sumoConfig.skipTests.length > 0) {
    console.log(chalk.yellow("WARNING: You are using a CUSTOM testing framework - SKIPTESTS will be ignored."));
    console.log(chalk.yellow("\n         To skip some tests you can either:"))
    console.log(chalk.yellow("         - specify the test files to be run in your \"test\" script;\n         - remove the test files to be skipped from the test folder.\n\n"))
  }

  if (numContracts > 0) {
    fs.appendFileSync(reportTxt, "\n\n>>> GENERATED MUTANTS \n", function (err) {
      if (err) return console.log(err);
    });
  }
}

Reporter.prototype.logStartMutationTesting = function () {
  console.log(chalk.yellow.bold("Starting Mutation Testing 👾"))
};

Reporter.prototype.logLookup = function (mutations, genTime, operators) {

  console.log(chalk.yellow.bold("Lookup") + " 🧬");

  const lookup = mutations.length + " mutation(s) found in " + genTime + " seconds \n" +
    "Generated mutations saved to sumo/results/results.csv and sumo/results/mutations.json \n"

  fs.appendFileSync(reportTxt, "\n\n>>> LOOKUP SUMMARY \n\n" + lookup + "\n", function (err) {
    if (err) return console.log(err);
  });

  console.log(operators + "\n\n" + lookup);
};

/**
   * Log the mutation testing progress
   * @param {*} mutations_index index of the current mutant
   * @param {*} mutations_length total number of mutants
   * @param {*} mutation the current mutant
   */
Reporter.prototype.logMutationProgress = function (mutations_index, mutations_length, mutant) {
  console.log("\n" + chalk.bgYellow("> Mutation " + chalk.bold(mutations_index) + " of " + chalk.bold(mutations_length) + " - [" + chalk.bold(mutant.id) + " of " + chalk.bold(mutant.fileName()) + "]"));
}

/**
 * Logs the mutants generated by the mutationGenerator to report.txt
 * @param {*} fileString 
 * @param {*} mutantString 
 */
Reporter.prototype.saveGeneratedMutants = function (fileString, mutantString) {
  fs.appendFileSync(reportTxt, fileString + mutantString, { "flags": "a" }, function (err) {
    if (err) return console.log(err);
  });
};

Reporter.prototype.logCompile = function (mutant) {
  console.log("\n" + chalk.yellow("Compiling mutation ") + this.chalkMutant(mutant) + " of " + mutant.fileName());
};

Reporter.prototype.logTest = function (mutant) {

  console.log("Mutant successfully compiled\n");

  console.log(chalk.yellow("Applying mutation ") + this.chalkMutant(mutant) + " to " + mutant.fileName());
  process.stdout.write(mutant.diff());
  console.log("\n" + (chalk.yellow("Running tests ") + "for mutant " + this.chalkMutant(mutant)));
};


/**
 * Sets the status of a mutant and saves the mutation to file
 * @param {*} mutant the mutant under test
 */
Reporter.prototype.mutantStatus = function (mutant) {
  switch (mutant.status) {
    case "killed":
      this.killed.push(mutant);
      console.log("\n💀 Mutant " + this.chalkMutant(mutant) + " was killed by the tests.");
      break;
    case "live":
      this.survived.push(mutant);
      console.log("\n🐛 Mutant " + this.chalkMutant(mutant) + " survived testing");
      break;
    case "stillborn":
      this.stillborn.push(mutant);
      console.log("Mutant " + this.chalkMutant(mutant) + " is stillborn");
      break;
    case "equivalent":
      this.equivalent.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " is equivalent"
      );
      break;
    case "timedout":
      this.timedout.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " has timed out after " + (sumoConfig.testingTimeOutInSec) / 60 + " minutes"
      );
      break;
    case "redundant":
      this.redundant.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " is redundant"
      );
      break;
  }
  this.saveResultMutationsJson(mutant);
};

/**
 * Save the test results of the current mutant to the mutations.json synchronous log
 * @param {*} mutant the mutant to save
 */
Reporter.prototype.saveResultMutationsJson = function (mutant) {
  var mutations = readMutationsJson();
  const contract = mutant.fileName();
  let m = JSON.parse(mutant.toJson());
  var updated = false
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
  writeMutantionsJson(mutations);
}
/**
 * Add mutants to the mutations.json
 * @param {*} mutants the array of mutants to add
 */
Reporter.prototype.saveGeneratedMutationsJson = function (mutants) {
  this.setupMutationsJson();
  var mutations = readMutationsJson();
  for (var mutant of mutants) {
    const contract = mutant.fileName();
    let m = JSON.parse(mutant.toJson());
    // Check if the array for the contract already exists, otherwise create it
    if (!mutations[contract]) {
      mutations[contract] = [];
    }
    mutations[contract].push(m);
  }
  writeMutantionsJson(mutations);
}

/**
 * Read the "/mutations.json" file
 * @returns the content of the file
 */
function readMutationsJson() {
  return JSON.parse(fs.readFileSync(resultsDir + "/mutations.json", 'utf8'));
}
/**
 * Write the "/mutations.json" file
 * @param mutations the content to be written in the file
 */
function writeMutantionsJson(mutations) {
  fs.writeFileSync(resultsDir + "/mutations.json", JSON.stringify(mutations, null, '\t'), function (err) {
    if (err) return console.log(err);
  });
}
//Setup mutations.json
Reporter.prototype.setupMutationsJson = function () {
  const mutationsJson = {};
  const jsonString = JSON.stringify(mutationsJson, null, '\t');
  fs.writeFileSync(resultsDir + "/mutations.json", jsonString, function (err) {
    if (err) return console.log(err);
  });
}


/**
 * Logs the final test summary to console (and to report.txt)
 * @param {*} time the total testing time
 */
Reporter.prototype.logAndSaveTestSummary = function (time) {

  const validMutants = this.survived.length + this.killed.length;
  const stillbornMutants = this.stillborn.length;
  const equivalentMutants = this.equivalent.length;
  const redundantMutants = this.redundant.length;
  const timedoutMutants = this.timedout.length;
  const totalMutants = validMutants + stillbornMutants + timedoutMutants + equivalentMutants + redundantMutants;
  const mutationScore = ((this.killed.length / validMutants) * 100).toFixed(2);

  console.log("\n" + chalk.yellow.bold("Mutation Testing completed in " + time + " minutes 👋"))
  console.log(
    "SuMo generated " + totalMutants + " mutants: \n" +
    "- " + this.survived.length + " live; \n" +
    "- " + this.killed.length + " killed; \n" +
    "- " + this.stillborn.length + " stillborn; \n" +
    "- " + this.equivalent.length + " equivalent; \n" +
    "- " + this.redundant.length + " redundant; \n" +
    "- " + this.timedout.length + " timed-out. \n"
  );
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


  printString = printString + "\n\n - Live mutants: " + this.survived.length;
  if (this.survived.length > 0)
    printString = printString + "\n --- Live: " + JSON.stringify(this.survived.map(m => m.hash()).join(", "));

  printString = printString + "\n\n - Killed mutants: " + this.killed.length;
  if (this.killed.length > 0)
    printString = printString + "\n --- Killed: " + JSON.stringify(this.killed.map(m => m.hash()).join(", "));

  printString = printString + "\n\n - Equivalent mutants: " + this.equivalent.length;
  if (this.equivalent.length > 0)
    printString = printString + "\n --- Equivalent: " + JSON.stringify(this.equivalent.map(m => m.hash()).join(", "));

  printString = printString + "\n\n - Redundant mutants: " + this.redundant.length;
  if (this.redundant.length > 0)
    printString = printString + "\n --- Redundant: " + JSON.stringify(this.redundant.map(m => m.hash()).join(", "));

  printString = printString + "\n\n - Stillborn mutants: " + this.stillborn.length;
  if (this.stillborn.length > 0)
    printString = printString + "\n --- Stillborn: " + JSON.stringify(this.stillborn.map(m => m.hash()).join(", "));

  printString = printString + "\n\n - Timed-Out mutants: " + this.timedout.length;
  if (this.timedout.length > 0)
    printString = printString + "\n --- Timed-Out: " + JSON.stringify(this.timedout.map(m => m.hash()).join(", "));

  printString = printString + "\n\n MUTATION SCORE = " + mutationScore;

  fs.appendFileSync(reportTxt, printString + "\n\n- " + totalMutants + " mutant(s) tested in " + time + " minutes.", { "flags": "a" }, function (err) {
    if (err) return console.log(err);
  });
};

//Save generated mutations to csv
Reporter.prototype.saveGeneratedMutantsCsv = function (mutations) {
  const csvData = [];
  csvData.push(["Hash", "File", "Operator", "Start", "End", "StartLine", "EndLine", "Original", "Replacement", "Status", "Time(ms)"]);

  mutations.forEach(m => {
    const originalString = m.original.toString().replace(/[\n\r]/g, '');
    const replaceString = m.replace.toString().replace(/[\n\r]/g, '');

    // Push the mutation data as an array to the CSV data
    csvData.push([
      m.hash(),
      m.file,
      m.operator,
      m.start,
      m.end,
      m.startLine,
      m.endLine,
      originalString,
      replaceString,
      "untested",
      "0"
    ]);
  });

  // Convert the CSV data array to a CSV string
  const csvString = Papa.unparse(csvData);

  // Write the CSV string to a file
  fs.writeFileSync(resultsDir + "/results.csv", csvString, function (err) {
    if (err) return console.log(err);
  });
}


/**
 * Update the status and testingTime of the currently tested mutant to the results.csv synchronous log
 * @param {*} mutant tested mutant object
 */
Reporter.prototype.saveResultsCsv = function (mutant) {
  const filePath = resultsDir + "/results.csv";
  if (fs.existsSync(filePath)) {
    const existingData = fs.readFileSync(filePath, "utf8");
    const parsedData = Papa.parse(existingData, { header: true });

    // Check if the mutant's data already exists in the CSV
    const mutantIndex = parsedData.data.findIndex(item => item.Hash === mutant.hash());

    if (mutantIndex !== -1) {
      // If the mutant's data exists, update it
      parsedData.data[mutantIndex]["Status"] = mutant.status;
      parsedData.data[mutantIndex]["Time(ms)"] = mutant.testingTime;
    }

    fs.writeFileSync(filePath, Papa.unparse(parsedData.data, { header: true }), function (err) {
      if (err) return console.log(err);
    });
  }
};

/*Saves results for each operator to operators.xlsx */
Reporter.prototype.saveOperatorsResults = function () {

  var workbook = new excel.Workbook
  var worksheet = workbook.addWorksheet("Sheet 1");

  var headerStyle = workbook.createStyle({
    font: {
      color: "#000000",
      size: 12,
      bold: true
    },
    fill: {
      type: "pattern",
      patternType: "solid",
      bgColor: "#e9e2d2",
      fgColor: "#e9e2d2"
    }
  });

  var operatorStyle = workbook.createStyle({
    font: {
      color: "#000000",
      size: 10,
      bold: true
    }
  });
  // Set Headers
  worksheet.cell(1, 1).string("Operator").style(headerStyle);
  worksheet.cell(1, 2).string("Total").style(headerStyle);
  worksheet.cell(1, 3).string("Equivalent").style(headerStyle);
  worksheet.cell(1, 4).string("Redundant").style(headerStyle);
  worksheet.cell(1, 5).string("Tested").style(headerStyle);
  worksheet.cell(1, 6).string("Killed").style(headerStyle);
  worksheet.cell(1, 7).string("Live").style(headerStyle);
  worksheet.cell(1, 8).string("Timedout").style(headerStyle);
  worksheet.cell(1, 9).string("Stillborn").style(headerStyle);
  worksheet.cell(1, 10).string("Mutation Score").style(headerStyle);
  worksheet.cell(1, 11).string("Time(min)").style(headerStyle);

  for (var i = 0; i < this.operators.length; i++) {
    worksheet.cell(i + 2, 1)
      .string(this.operators[i])
      .style(operatorStyle);
  }

  var style = workbook.createStyle({
    font: {
      color: "#000000",
      size: 10
    }
  });

  //Retrieve list of mutants for each operator
  var operators = Object.entries(mutOpsConfig);
  var allMutants = this.killed.concat(this.survived, this.stillborn, this.equivalent, this.redundant, this.timedout)
  for (var i = 0; i < operators.length; i++) {
    var time = 0
    var operatorKilled = this.killed.filter(mutant => mutant.operator === operators[i][0]);
    var operatorLive = this.survived.filter(mutant => mutant.operator === operators[i][0]);
    var operatorStillborn = this.stillborn.filter(mutant => mutant.operator === operators[i][0]);
    var operatorEquivalent = this.equivalent.filter(mutant => mutant.operator === operators[i][0]);
    var operatorRedundant = this.redundant.filter(mutant => mutant.operator === operators[i][0]);
    var operatorTimedout = this.timedout.filter(mutant => mutant.operator === operators[i][0]);
    allMutants.filter(mutant => {
      if (mutant.operator === operators[i][0]) {
        time = time + mutant.testingTime
      }
    })
    //Set cells
    worksheet.cell(i + 2, 2).number(operatorKilled.length + operatorLive.length + operatorEquivalent.length + operatorRedundant.length + operatorTimedout.length + operatorStillborn.length).style(style);
    worksheet.cell(i + 2, 3).number(operatorEquivalent.length).style(style);
    worksheet.cell(i + 2, 4).number(operatorRedundant.length).style(style);
    worksheet.cell(i + 2, 5).number(operatorKilled.length + operatorLive.length).style(style);
    worksheet.cell(i + 2, 6).number(operatorKilled.length).style(style);
    worksheet.cell(i + 2, 7).number(operatorLive.length).style(style);
    worksheet.cell(i + 2, 8).number(operatorTimedout.length).style(style);
    worksheet.cell(i + 2, 9).number(operatorStillborn.length).style(style);

    var ms = (operatorKilled.length / (operatorKilled.length + operatorLive.length)) * 100;
    if (!isNaN(ms)) {
      worksheet.cell(i + 2, 10)
        .number(ms)
        .style(style);
    }
    worksheet.cell(i + 2, 11)
      .number((time / 60000))
      .style(style)
    workbook.write(resultsDir + "/operators.xlsx");
  }
};
module.exports = Reporter
