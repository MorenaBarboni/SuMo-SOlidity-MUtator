module.exports = {
  sumoDir: '.sumo',
  projectDir: '',
  contractsDir: '',
  baselineDir: '.sumo/baseline',
  killedDir: '.sumo/killed',
  aliveDir: '.sumo/alive',
  mutantsDir: '.sumo/mutants',
  testingTimeOutInSec: 3000,
  ganache: true,
  customTestScript: false,
  ignore: [],    
  saveMutants: false,
  contractsGlob: '/**/*.sol',
  packageManagerGlob: ['/package-lock.json', '/yarn.lock'],
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'
  ]
}
