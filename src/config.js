module.exports = {
  sumoDir: '.sumo',
  baselineDir: '.sumo/baseline',
  resultsDir: '.sumo/results',
  projectDir: '',
  buildDir: '',
  contractsDir: '',
  testDir: '',
  skipContracts: [],
  skipTests: [],
  testingTimeOutInSec: 3000,
  bail: true,
  ganache: true,
  testingFramework: 'truffle',
  optimized: true,
  tce: false,
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testsGlob:  '/**/*.{js,sol,ts}'
}

