module.exports = {
  sumoDir: '.sumo',
  baselineDir: '.sumo/baseline',
  resultsDir: '.sumo/results',
  projectDir: '',
  buildDir: '',
  contractsDir: '',
  skipContracts: [],
  skipTests: [],
  testingTimeOutInSec: 3000,
  bail: true,
  ganache: true,
  customTestScript: false,
  optimized: true,
  tce: true,
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'
  ]
}