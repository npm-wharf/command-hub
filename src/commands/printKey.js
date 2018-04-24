#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function handle (comhub, log, argv) {
  if (!argv.keyFile || !fs.existsSync(path.resolve(argv.keyFile))) {
    log.error(`a valid key file is required`)
    process.exit(-1)
  }
  const buffer = fs.readFileSync(path.resolve(argv.keyFile))
  const compressed = zlib.deflateRawSync(buffer, { memLevel: 9 })
  log.info(`key file ${argv.keyFile} base64 content is:`)
  console.log(compressed.toString('base64'))
}

module.exports = function (comhub, log) {
  return {
    command: 'print key <keyFile>',
    desc: 'outputs a key file as a compressed, base64 string',
    builder: () => {},
    handler: handle.bind(null, comhub, log)
  }
}
