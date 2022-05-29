module.exports = {
  sumoDir: '.sumo',
  projectDir: '',
  contractsDir: '',
  baselineDir: '.sumo/baseline',
  killedDir: '.sumo/killed',
  aliveDir: '.sumo/alive',
  mutantsDir: '.sumo/mutants',
  testingTimeOutInSec: 3000,
  bail: false,
  ganache: true,
  customTestScript: false,
  optimized: true,
  ignore: [],
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'
  ]
}
