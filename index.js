#!/usr/bin/env node

const yargs = require('yargs')
const mutationRunner = require('./src/mutationRunner.js')
const utils = require('./src/utils')

yargs
  .usage('$0 <cmd> [args]')
  .command('test', 'run mutation tests', (yargs) => {
    yargs.option('failfast', {
      type: 'bool',
      default: false,
      describe: 'abort on first surviving mutant'
    })
  }, mutationRunner.test)
  .command('preflight', 'print preflight summary', mutationRunner.preflight)
  .command('preflightExcel', 'print preflight summary and save information about the mutations to excel', mutationRunner.preflightAndSaveExcel)  
  .command('diff <hash>', 'show diff for a given hash', (yargs) => {
    yargs.positional('hash', {
      type: 'string',
      describe: 'hash of mutant'
    })
  }, mutationRunner.diff)
  .command('mutate', 'save mutants to file', mutationRunner.mutate)
  .command('list', 'print list of enabled mutation operators', mutationRunner.list)
  .command('enable [ID]', 'enable a mutation operator', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'ID of the mutation operator to be enabled',
      })
  }, (argv) => {
    mutationRunner.enable(argv.ID)
  })
  .command('disable [ID]', 'disable a mutation operator', (yargs) => {
    yargs
      .positional('ID', {
        type: 'string',
        describe: 'ID of the mutation operator to be disabled.',
      })
  }, (argv) => {
    mutationRunner.disable(argv.ID)
  }) 
  .command('cleanSumo', 'clean .sumo directory', (argv) => {
    utils.cleanSumo()
  })
  .command('restore', 'restore SUT files', (argv) => {
    utils.restore()
  })
  .help()
  .argv