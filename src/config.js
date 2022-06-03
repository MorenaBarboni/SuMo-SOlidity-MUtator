module.exports = {
  sumoDir: '.sumo',
  projectDir: '',
  buildDir: '',
  contractsDir: '',
  skipContracts: [''],
  baselineDir: '.sumo/baseline',
  killedDir: '.sumo/killed',
  aliveDir: '.sumo/alive',
  redundantDir: '.sumo/redundant',
  equivalentDir: '.sumo/equivalent',
  mutantsDir: '.sumo/mutants',
  testingTimeOutInSec: 3000,
  bail: false,
  ganache: true,
  customTestScript: false,
  optimized: true,
  tce: true,
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'
  ]
}
