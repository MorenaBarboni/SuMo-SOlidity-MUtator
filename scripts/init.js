const appRoot = require('app-root-path');
const rootDir = appRoot.toString().replaceAll("\\", "/");
const fs = require('fs')


const sumoconfig = "module.exports = {\n    buildDir: '',\n    contractsDir: '',\n    testDir: '',\n    skipContracts: [],\n    skipTests: [],\n    testingTimeOutInSec: 300,\n    network: \"none\",\n    testingFramework: \"truffle\",\n    minimal: false,\n    tce: false\n  }"
if (!fs.existsSync(rootDir + "/sumo-config.js")) {
    fs.writeFileSync(rootDir + "/sumo-config.js", sumoconfig)
}
