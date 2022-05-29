module.exports = {
  sumoDir: '.sumo',
  baselineDir: '.sumo/baseline',
  killedDir: '.sumo/killed',
  aliveDir: '.sumo/alive',
  mutantsDir: '.sumo/mutants',
  projectDir: '',
  contractsDir: '',
  ignore: [],
  customTestScript: false,
  ganache: true,
  optimized: true,
  testingTimeOutInSec: 3000,
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'
  ]
}
