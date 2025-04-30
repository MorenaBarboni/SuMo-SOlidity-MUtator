const appRoot = require('app-root-path');
const rootDir = appRoot.toString().replaceAll("\\", "/");
const fs = require('fs')

const sumoconfig =
    `module.exports = {  
      buildDir: "auto",
      contractsDir: "auto",
      testDir: "auto",
      skipContracts: ["interfaces", "mock", "test"],
      skipTests: [],
      mutation: {
         minimalOperators: false,     // Use minimal mutation operators
         randomSampling: false,       // Enable random sampling
         maxRandomMutants: 100,       // Max number of randomly sampled mutants
         pruneUncovered: false        // Prune uncovered mutants (hardhat-matrix only)
      },
      testingFramework: "auto",
      testingTimeOutInSec: 500  
}`;

if (!fs.existsSync(rootDir + "/sumo-config.js")) {
    fs.writeFileSync(rootDir + "/sumo-config.js", sumoconfig)
}