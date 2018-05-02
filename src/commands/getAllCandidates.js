const { each } = require('fauxdash')
const ui = require('cliui')({
  width: 140
})

function build () {
  return {
    image: {
      alias: 'i',
      describe: 'image description (docker image spec)',
      demandOption: true
    },
    filter: {
      alias: 'f',
      describe: 'specify which fields must match in order to be eligible for upgrade',
      choices: [ 'imageName', 'imageOwner', 'owner', 'repo', 'branch', 'fullVersion', 'version', 'build', 'commit' ]
    }
  }
}

function handle (comhub, log, argv) {
  comhub.getCandidatesOnAll(argv.image)
    .then(
      results => {
        if (Object.keys(results).length === 0) {
          log.warn(`no clusters have been registered - no clusters to check'`)
        } else {
          let failed = 0
          ui.div(
            {
              text: 'CLUSTER',
              padding: [0, 1, 0, 0],
              width: 16
            },
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
          each(results, (x, cluster) => {
            if (x.upgrade && x.upgrade.length > 0) {
              x.upgrade.forEach(candidate => {
                ui.div(
                  {
                    text: cluster,
                    padding: [0, 1, 0, 0],
                    width: 16
                  },
                  {
                    text: candidate.namespace,
                    padding: [0, 1, 0, 0],
                    width: 12
                  },
                  {
                    text: candidate.service,
                    padding: [0, 1, 0, 0],
                    width: 30
                  },
                  {
                    text: candidate.type,
                    padding: [0, 1, 0, 0],
                    width: 14
                  },
                  {
                    text: candidate.image,
                    padding: [0, 1, 0, 0]
                  }
                )
              })
            }
          })

          ui.div(
            {
              text: 'CLUSTER',
              padding: [1, 1, 0, 0],
              width: 16
            },
            {
              text: 'ELIGIBLE',
              padding: [1, 1, 0, 0],
              width: 15
            },
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
          each(results, (x, cluster) => {
            if (!x.failed) {
              ui.div(
                {
                  text: cluster,
                  padding: [0, 1, 0, 0],
                  width: 16
                },
                {
                  text: x.upgrade.length,
                  padding: [0, 1, 0, 0],
                  width: 15
                },
                {
                  text: x.equal.length,
                  padding: [0, 1, 0, 0],
                  width: 15
                },
                {
                  text: x.obsolete.length,
                  padding: [0, 1, 0, 0],
                  width: 15
                },
                {
                  text: x.error.length,
                  padding: [0, 1, 0, 0],
                  width: 15
                }
              )
            } else if (x.failed) {
              failed++
            }
          })

          if (failed > 0) {
            ui.div(
              {
                text: 'CLUSTER',
                padding: [1, 1, 0, 0],
                width: 16
              },
              {
                text: 'EXCEPTIONS',
                padding: [1, 1, 0, 0]
              }
            )
            each(results, (x, cluster) => {
              if (x.failed) {
                ui.div(
                  {
                    text: cluster,
                    padding: [1, 1, 0, 0],
                    width: 16
                  },
                  {
                    text: x.error.length,
                    padding: [1, 1, 0, 0]
                  }
                )
              }
            })
          }

          console.log(ui.toString())
        }
      },
      err => log.error(`failed to fetch candidates across clusters with: ${err.stack}`)
    )
}

module.exports = function (comhub, log) {
  return {
    command: 'get-all candidates [options]',
    desc: 'get upgrade candidates based on full image spec for all clusters',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
