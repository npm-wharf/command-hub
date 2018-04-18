
function build () {
  return {
    name: {
      alias: 'n',
      describe: 'cluster name',
      demandOption: true
    }
  }
}

function handle (comhub, log, argv) {
  comhub.removeCluster(argv.name)
    .then(
      () => log.info(`removed cluster '${argv.name}'`),
      err => log.error(`failed to remove cluster '${argv.name}' with: ${err.stack}`)
    )
}

module.exports = function (comhub, log) {
  return {
    command: 'remove cluster [options]',
    desc: 'removes the cluster by name from the storage backend',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
