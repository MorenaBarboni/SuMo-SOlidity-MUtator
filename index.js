#!/usr/bin/env node

const yargs = require('yargs')
const mutationRunner = require('./src/mutationRunner.js')
const utils = require('./src/utils')

yargs
  .usage('$0 <cmd> [args]')
  .command('preflight', 'run preflight', mutationRunner.preflight)
  .command('mutate', 'save mutants to file', mutationRunner.mutate)
  .command('pretest', 'run pretest', mutationRunner.pretest)
  .command('test [startHash] [endHash]', 'run mutation testing', (yargs) => {
    yargs
      .positional('startHash', {
        type: 'string',
        describe: '(optional) ID of the first mutant to be tested',
        default: 'first'
      })
      .positional('endHash', {
        type: 'string',
        describe: '(optional) ID of the last mutant to be tested',
        default: 'last'
      })
  }, (argv) => {
    mutationRunner.test(argv.startHash, argv.endHash)
  })
  .command('diff <hash>', 'show diff for a given hash', (yargs) => {
    yargs.positional('hash', {
      type: 'string',
      describe: 'hash of mutant'
    })
  }, mutationRunner.diff)
  .command('list', 'print list of enabled mutation operators', mutationRunner.list)
  .command('enable [ID..]', 'enable one or more mutation operators', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'ID of the mutation operator(s) to be enabled',
      })
  }, (argv) => {
    mutationRunner.enable(argv.ID)
  })
  .command('disable [ID..]', 'disable one or more mutation operators', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'ID of the mutation operator(s) to be disabled.',
      })
  }, (argv) => {
    mutationRunner.disable(argv.ID)
  })
  .command('restore', 'restore the SUT files', (argv) => {
    utils.restore()
  })
  .help()
  .argv