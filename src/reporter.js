const chalk = require('chalk')
const fs = require('fs')
const config = require('./config')
var excel = require('excel4node');
const operatorsConfigFileName = "./operators.config.json";
const operatorsConfig = require(operatorsConfigFileName);
const resultsDir = config.resultsDir
const path = require("path");
const { parse } = require("path");



function Reporter() {
  this.operators = Object.entries(operatorsConfig);
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

Reporter.prototype.beginMutationTesting = function () {
  console.log("=====================================");
  console.log(chalk.yellow.bold("👾 Starting Mutation Testing 👾"))
  console.log("=====================================");
};

Reporter.prototype.beginPretest = function () {
  console.log("=================");
  console.log(chalk.yellow.bold("Running pre-test"));
  console.log("=================");
};

Reporter.prototype.beginTest = function (mutant) {

  console.log("Mutant successfully compiled.");

  console.log("Applying mutation " + this.chalkMutant(mutant) + " to " + mutant.file);
  process.stdout.write(mutant.diff());
  console.log("\n ");
  console.log(chalk.yellow("Running tests ") + "for mutation " + this.chalkMutant(mutant));
};

Reporter.prototype.beginCompile = function (mutant) {
  console.log("\n ");
  console.log("\n " + chalk.yellow("Compiling mutation ") + this.chalkMutant(mutant) + " of " + mutant.file);
};

//Set the status of a mutant
Reporter.prototype.mutantStatus = function (mutant) {
  switch (mutant.status) {
    case "killed":
      this.killed.push(mutant);
      console.log("Mutant " + this.chalkMutant(mutant) + " was killed by tests.");
      fs.writeFileSync(resultsDir + "/killed/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
    case "live":
      this.survived.push(mutant);
      console.log("Mutant " + this.chalkMutant(mutant) + " survived testing.");
      fs.writeFileSync(resultsDir + "/live/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
    case "stillborn":
      this.stillborn.push(mutant);
      console.log("Mutant " + this.chalkMutant(mutant) + " is stillborn.");
      fs.writeFileSync(resultsDir + "/stillborn/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
    case "equivalent":
      this.equivalent.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " is equivalent."
      );
      fs.writeFileSync(resultsDir + "/equivalent/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
    case "timedout":
      this.timedout.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " has timed out."
      );
      fs.writeFileSync(resultsDir + "/timedout/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
    case "redundant":
      this.redundant.push(mutant);
      console.log(
        "Mutant " + this.chalkMutant(mutant) + " is redundant."
      );
      fs.writeFileSync(resultsDir + "/redundant/mutant-" + mutant.hash() + ".sol", mutant.printMutation(), function (err) {
        if (err) return console.log(err);
      });
      break;
  }
};

//Prints preflight summary to console
Reporter.prototype.preflightSummary = function (mutations) {
  console.log("---------------------------------");
  console.log(chalk.yellow.bold("Preflight: ") + mutations.length + " mutation(s) found. ");
  console.log("--------------------------------");

  for (const mutation of mutations) {
    console.log(mutation.file + ":" + mutation.hash() + ":");
    process.stdout.write(mutation.diff());
  }
};


//Prints test summary to console
Reporter.prototype.testSummary = function () {
  console.log('\n')
  console.log('==============')
  console.log(chalk.yellow.bold("Test Summary"))
  console.log('==============')
  console.log(
    "• " + this.survived.length +
    " mutants survived testing.\n" +
    "• " + this.killed.length +
    " mutants killed.\n" +
    "• " + this.stillborn.length +
    " mutants stillborn.\n" +
    "• " + this.equivalent.length +
    " mutants equivalent.\n",
    "• " + this.redundant.length +
    " mutants redundant.\n",
    "• " + this.timedout.length +
    " mutants timed-out.\n"
  );
  if (this.survived.length > 0) {
    console.log(
      "Live: " + this.survived.map(m => this.chalkMutant(m)).join(", ")
    );
  }
};

//Setup test report
Reporter.prototype.setupReport = function () {
  fs.writeFileSync(resultsDir + "/report.txt", "################################################ REPORT ################################################\n\n------------------------------------------- GENERATED MUTANTS ------------------------------------------ \n", function (err) {
    if (err) return console.log(err);
  })
}


//Setup sync log
Reporter.prototype.setupLog = function () {
  fs.writeFileSync(resultsDir + "/log.txt", "################################################ LOG ################################################", function (err) {
    if (err) return console.log(err);
  })
  fs.writeFileSync(resultsDir + "/log.txt", "hash; file; operator; start; end; status; isRedundantTo; testingTime; \n", function (err) {
    if (err) return console.log(err);
  })
}

//Setup coverage report
Reporter.prototype.setupCoverageReport = function () {
  fs.writeFileSync(resultsDir + "/coverageReport.txt", "################################################ LOG ################################################", function (err) {
    if (err) return console.log(err);
  })
  fs.writeFileSync(resultsDir + "/log.txt", "hash; coveredBy; \n", function (err) {
    if (err) return console.log(err);
  })
}

//Write sync log
Reporter.prototype.writeLog = function (mutant, hashOfRedundant) {
  fs.appendFileSync(resultsDir + "/log.txt", mutant.hash() + "; " + mutant.file + "; " + mutant.operator + "; " + mutant.start + "; " + mutant.end + "; " + mutant.status + "; " + hashOfRedundant + "; " + mutant.testingTime + '\n', function (err) {
    if (err) return console.log(err);
  })
}

//Write sync log
Reporter.prototype.writeCoverageReport = function (mutant, coveredBy) {
  fs.appendFileSync(resultsDir + "/coverageReport.txt", mutant.hash() + "; " + coveredBy + '\n', function (err) {
    if (err) return console.log(err);
  })
}


//Save generated mutations to report
Reporter.prototype.saveGeneratedMutants = function (fileString, mutantString) {

  fs.appendFileSync(resultsDir + "/report.txt", fileString + mutantString, { 'flags': 'a' }, function (err) {
    if (err) return console.log(err);
  })
}

//Save mutants generation time to report
Reporter.prototype.saveGenerationTime = function (mutationsLength, generationTime) {
  fs.appendFileSync(resultsDir + "/report.txt", "\n" + mutationsLength + " mutant(s) found in " + generationTime + " seconds. \n", function (err) {
    if (err) return console.log(err);
  })
}

//Save test results to report
Reporter.prototype.printTestReport = function (time) {
  const validMutants = this.survived.length + this.killed.length;
  const stillbornMutants = this.stillborn.length;
  const equivalentMutants = this.equivalent.length;
  const redundantMutants = this.redundant.length;
  const timedoutMutants = this.timedout.length;
  const totalMutants = validMutants + stillbornMutants + timedoutMutants + equivalentMutants + redundantMutants;
  const mutationScore = ((this.killed.length / validMutants) * 100).toFixed(2);
  var printString = "\n ---------------------- TEST REPORT --------------------- \n\n  "
    + totalMutants + " mutant(s) tested in " + time + " minutes."
    + "\n\n - Total mutants: " + totalMutants
    + "\n\n - Valid mutants: " + validMutants;


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

  printString = printString + "\n\n Mutation Score = " + mutationScore;

  fs.appendFileSync(resultsDir + "/report.txt", printString, { "flags": "a" }, function (err) {
    if (err) return console.log(err);
  });
};

Reporter.prototype.printFilesUnderTest = function (contracts, tests) {
  const nc = contracts.length;
  console.log();
  console.log("=============================================");
  console.log(chalk.yellow.bold("> Selecting Contract and Test Files"))
  console.log("=============================================");
  console.log();

  if (nc == 0) console.log("Contracts to be mutated : " + chalk.green("none"));
  else {
    console.log("Contracts to be mutated : (" + nc + "):");

    contracts.forEach((c) => {
      console.log(
        "\t" + path.parse(c).dir + "/" + chalk.bold(path.basename(c))
      );
    });
  }
  console.log();

  if (!tests) {
    console.log("Tests to be run : " + chalk.green("all"));
    console.log();
  }
  else {
    const nt = tests.length;
    if (nt == 0) console.log("Tests to be run : " + chalk.green("none"));
    else {
      console.log("Tests to be run : (" + nt + "):");

      tests.forEach((t) => {
        console.log(
          "\t" + path.parse(t).dir + "/" + chalk.bold(path.basename(t))
        );
      });
    }
    console.log();
  }
}

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
  worksheet.cell(1, 1)
    .string("Operator")
    .style(headerStyle);

  worksheet.cell(1, 2)
    .string("Total")
    .style(headerStyle);

  worksheet.cell(1, 3)
    .string("Equivalent")
    .style(headerStyle);

  worksheet.cell(1, 4)
    .string("Redundant")
    .style(headerStyle);

  worksheet.cell(1, 5)
    .string("Tested")
    .style(headerStyle);

  worksheet.cell(1, 6)
    .string("Killed")
    .style(headerStyle);

  worksheet.cell(1, 7)
    .string("Live")
    .style(headerStyle);

  worksheet.cell(1, 8)
    .string("Timedout")
    .style(headerStyle)

  worksheet.cell(1, 9)
    .string("Stillborn")
    .style(headerStyle)

  worksheet.cell(1, 10)
    .string("Mutation Score")
    .style(headerStyle);

  worksheet.cell(1, 11)
    .string("Testing Time")
    .style(headerStyle);

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

  //Retrieve list of killed mutants for each operator
  var operators = Object.entries(operatorsConfig);
  for (var i = 0; i < operators.length; i++) {
    var time = 0
    var operatorKilled = this.killed.filter(mutant => mutant.operator === operators[i][0]);
    var operatorLive = this.survived.filter(mutant => mutant.operator === operators[i][0]);
    var operatorStillborn = this.stillborn.filter(mutant => mutant.operator === operators[i][0]);
    var operatorEquivalent = this.equivalent.filter(mutant => mutant.operator === operators[i][0]);
    var operatorRedundant = this.redundant.filter(mutant => mutant.operator === operators[i][0]);
    var operatorTimedout = this.timedout.filter(mutant => mutant.operator === operators[i][0]);
    this.killed.filter(mutant => {
      if (mutant.operator === operators[i][0]) {
        time = time + mutant.testingTime
      }
    })
    this.survived.filter(mutant => {
      if (mutant.operator === operators[i][0]) {
        time = time + mutant.testingTime
      }
    })
    worksheet.cell(i + 2, 2)
      .number(operatorKilled.length + operatorLive.length + operatorEquivalent.length + operatorRedundant.length + operatorTimedout.length + operatorStillborn.length)
      .style(style);

    worksheet.cell(i + 2, 3)
      .number(operatorEquivalent.length)
      .style(style);

    worksheet.cell(i + 2, 4)
      .number(operatorRedundant.length)
      .style(style)

    worksheet.cell(i + 2, 5)
      .number(operatorKilled.length + operatorLive.length)
      .style(style);

    worksheet.cell(i + 2, 6)
      .number(operatorKilled.length)
      .style(style);

    worksheet.cell(i + 2, 7)
      .number(operatorLive.length)
      .style(style);

    worksheet.cell(i + 2, 8)
      .number(operatorTimedout.length)
      .style(style);

    worksheet.cell(i + 2, 9)
      .number(operatorStillborn.length)
      .style(style);

    var ms = (operatorKilled.length / (operatorKilled.length + operatorLive.length)) * 100;
    if (!isNaN(ms)) {
      worksheet.cell(i + 2, 10)
        .number(ms)
        .style(style);
    }
    worksheet.cell(i + 2, 11)
      .number(time / 60000)
      .style(style)
    workbook.write("./" + resultsDir + "/operators.xlsx");
  }
};



//Extracts test coverage info from the solcover matrix
Reporter.prototype.extractCoverageInfo = function (mutation) {

  let pathMatrix = resultsDir + '/testMatrix.json';

  if (fs.existsSync(pathMatrix)) {

    let rawdata = fs.readFileSync(pathMatrix);
    var json = JSON.parse(rawdata);
    let mutationFileName = parse(mutation.file).name;

    var testList = []
    for (var entry in json) {
      if (entry === mutationFileName) {
        var lines = json[mutationFileName];

        for (var line in lines) {
          if (line >= mutation.startLine && line <= mutation.endLine) {
            var tests = lines[line];
            for (let index = 0; index < tests.length; index++) {
              const testData = tests[index];
              if (!testList.some(e => e.title === testData.title && e.file === testData.file)) {
                testList.push(testData);
              }
            }
          }
        }
      }
    }
    this.writeCoverageReport(mutation, testList.length);
  }
}





module.exports = Reporter
