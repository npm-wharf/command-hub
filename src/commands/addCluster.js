function build () {
  return {
    name: {
      alias: 'n',
      describe: 'cluster name',
      demandOption: true
    },
    url: {
      alias: 'u',
      describe: 'cluster url',
      demandOption: true
    },
    channel: {
      alias: 'c',
      describe: 'cluster release channel'
    }
  }
}

function handle (comhub, log, argv) {
  comhub.addCluster(argv.name, argv.url, argv.channel)
    .then(
      () => log.info(`added cluster '${argv.name}' with url '${argv.url}'`),
      err => log.error(`failed to add cluster '${argv.name}' with: ${err.stack}`)
    )
}

module.exports = function (comhub, log) {
  return {
    command: 'add cluster [options]',
    desc: 'adds a cluster url by name to the storage backend for future use',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
