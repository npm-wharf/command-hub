#!/usr/bin/env node
const bole = require('bole')
const { client, log } = require('../src/index')
const chalk = require('chalk')
const levelColors = {
  debug: 'gray',
  info: 'white',
  warn: 'yellow',
  error: 'red'
}

const output = {
  write: function (data) {
    const entry = JSON.parse(data)
    const levelColor = levelColors[entry.level]
    console.log(`${chalk[levelColor](entry.time)} - ${chalk[levelColor](entry.level)} ${entry.message}`)
  }
}

bole.output({
  level: process.env.DEBUG ? 'debug' : 'info',
  stream: output
})

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(require('../src/commands/addCluster')(client, log))
  .command(require('../src/commands/removeCluster')(client, log))
  .command(require('../src/commands/listClusters')(client, log))
  .command(require('../src/commands/findWorkload')(client, log))
  .command(require('../src/commands/getCandidates')(client, log))
  .command(require('../src/commands/upgradeWorkload')(client, log))
  .command(require('../src/commands/printKey')(client, log))
  .demandCommand(1, 'A command is required')
  .help()
  .version()
  .argv
