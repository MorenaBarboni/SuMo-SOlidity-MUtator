#!/usr/bin/env node

const yargs = require('yargs')
const mutationRunner = require('./src/mutationRunner.js')
const utils = require('./src/utils')

yargs
  .usage('$0 <cmd> [args]')
  .command('lookup', 'generate the mutations without starting the testing process', mutationRunner.lookup)
  .command('mutate', 'generate the mutations and save each mutated contract to file', mutationRunner.mutate)
  .command('pretest', 'run pretest', mutationRunner.pretest)
  .command('test [startHash] [endHash]', 'run mutation testing', (yargs) => {
    yargs
      .positional('startHash', {
        type: 'string',
        describe: 'ID of the first mutant to be tested (optional)',
        example: 'm46f345c9'
      })
      .positional('endHash', {
        type: 'string',
        describe: 'ID of the last mutant to be tested (optional)',
        example: 'ma6c345c9'
      })
  }, (argv) => {
    mutationRunner.test(argv.startHash, argv.endHash)
  })
  .command('list', 'print list of enabled mutation operators', mutationRunner.list)
  .command('enable [ID..]', 'enable one or more mutation operators', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'List of IDs of mutation operators to be enabled. ',
      })
  }, (argv) => {
    mutationRunner.enable(argv.ID)
  })
  .command('disable [ID..]', 'disable one or more mutation operators', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'List of IDs of mutation operators to be disabled.',
      })
  }, (argv) => {
    mutationRunner.disable(argv.ID)
  })
  .command('restore', 'restore the SUT files', utils.restore)
  .help()
  .argv