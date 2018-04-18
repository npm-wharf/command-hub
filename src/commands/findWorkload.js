const ui = require('cliui')({
  width: 120
})
function build () {
  return {
    name: {
      alias: 'n',
      describe: 'cluster name',
      demandOption: true
    },
    image: {
      alias: 'i',
      describe: 'image description (docker image spec)',
      demandOption: true
    }
  }
}

function handle (comhub, log, argv) {
  comhub.findWorkloads(argv.name, argv.image)
    .then(
      results => {
        ui.div(
          {
            text: 'NAMESPACE',
            padding: [0, 1, 0, 0],
            width: 12
          },
          {
            text: 'WORKLOAD NAME',
            padding: [0, 1, 0, 0],
            width: 30
          },
          {
            text: 'TYPE',
            padding: [0, 1, 0, 0],
            width: 14
          },
          {
            text: 'DOCKER IMAGE',
            padding: [0, 1, 0, 0]
          }
        )
        results.forEach(x => {
          ui.div(
            {
              text: x.namespace,
              padding: [0, 1, 0, 0],
              width: 12
            },
            {
              text: x.service,
              padding: [0, 1, 0, 0],
              width: 30
            },
            {
              text: x.type,
              padding: [0, 1, 0, 0],
              width: 14
            },
            {
              text: x.image,
              padding: [0, 1, 0, 0]
            }
          )
        })
        console.log(ui.toString())
      },
      err => log.error(`failed find workloads in cluster '${argv.name}' with: ${err.stack}`)
    )
}

module.exports = function (comhub, log) {
  return {
    command: 'find [options]',
    desc: 'finds workloads with images that match the criteria provided',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
