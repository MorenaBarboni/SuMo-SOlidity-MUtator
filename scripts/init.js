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
      testingFramework: "auto",
      minimalOperators: false,
      randomSampling: false,
      randomMutants: 100,
      testingTimeOutInSec: 500  
}`;

if (!fs.existsSync(rootDir + "/sumo-config.js")) {
    fs.writeFileSync(rootDir + "/sumo-config.js", sumoconfig)
}