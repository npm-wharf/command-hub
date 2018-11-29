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
    },
    filter: {
      alias: 'f',
      describe: 'specify which fields must match in order to be eligible for upgrade',
      choices: ['imageName', 'imageOwner', 'owner', 'repo', 'branch', 'fullVersion', 'version', 'build', 'commit']
    }
  }
}

function handle (comhub, log, argv) {
  comhub.getCandidates(argv.name, argv.image, argv.filter.split())
    .then(
      results => {
        if (results.upgrade.length) {
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
          results.upgrade.forEach(x => {
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
        } else {
          log.warn(`no workloads were eligible for upgrade on cluster '${argv.name}' using the image and tag '${argv.image}'`)
        }
        ui.div(
          {
            text: 'EQUAL',
            padding: [1, 1, 0, 0],
            width: 15
          },
          {
            text: 'OBSOLETE',
            padding: [1, 1, 0, 0],
            width: 15
          },
          {
            text: 'ERROR',
            padding: [1, 1, 0, 0],
            width: 15
          }
        )
        ui.div(
          {
            text: results.equal.length,
            padding: [0, 1, 0, 0],
            width: 15
          },
          {
            text: results.obsolete.length,
            padding: [0, 1, 0, 0],
            width: 15
          },
          {
            text: results.error.length,
            padding: [0, 1, 0, 0],
            width: 15
          }
        )
        console.log(ui.toString())
      },
      err => log.error(`failed to get candidates from cluster '${argv.name}' with: ${err.stack}`)
    )
}

module.exports = function (comhub, log) {
  return {
    command: 'get candidates [options]',
    desc: 'get upgrade candidates based on full image spec for a specific cluster',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
