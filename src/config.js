module.exports = {
  OS: 'Windows',
  packageManager: 'npm',
  projectDir: '',
  contractsDir: '',
  baselineDir: '.sumo/baseline',
  killedDir: '.sumo/killed',
  aliveDir: '.sumo/alive',
  mutantsDir: '.sumo/mutants',
  ignore: [
   ],
  contractsGlob: '/**/*.sol',
  testGlob: ['/test/**/*.js', '/test/**/*.sol,', '/test/**/*.ts'],
  optimized: false,
  saveMutants: false  
}