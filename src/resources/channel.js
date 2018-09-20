const log = require('bole')('channel-resource')
const { filter } = require('fauxdash')

function getImage (data) {
  return filter([data.registry, data.repo, data.image]).join('/')
}

module.exports = function (config, clusters, hikaru) {
  return {
    name: 'channel',
    middleware: [
      'auth.bearer',
      'auth.cert'
    ],
    actions: {
      listByChannel: {
        method: 'GET',
        url: ':channel',
        handle: (env) => {
          return clusters.listByChannel(env.data.channel)
            .then(
              clusters => {
                return { data: { clusters } }
              },
              err => {
                log.error(`Failed to retrieve clusters with error: ${err.stack}`)
                return { status: 500, data: 'Could not get list of clusters' }
              }
            )
        }
      },
      candidatesByChannel: {
        method: 'GET',
        url: [
          ':channel/image/:registry/:repo/:image',
          ':channel/image/:repo/:image',
          ':channel/image/:image'
        ],
        handle: async (env) => {
          const { channel } = env.data
          const image = getImage(env.data)
          const filter = env.data.filter ? env.data.filter.split(',') : []
          const list = await clusters.listByChannel(channel)
          return Promise.all(list.map(async ({cluster}) => {
            return hikaru.getCandidates(cluster, image, filter)
              .then(
                candidates => { return { data: candidates } },
                err => {
                  log.error(`failed to retrieve candidates matching '${image}' from cluster '${cluster}' with: ${err.stack}`)
                  return { status: 500, data: `Error occurred trying to get candidate list from cluster '${cluster}'` }
                }
              )
          }))
        }
      },
      findByChannel: {
        method: 'GET',
        url: [
          ':channel/workload/:registry/:repo/:image',
          ':channel/workload/:repo/:image',
          ':channel/workload/:image'
        ],
        handle: async (env) => {
          const { channel } = env.data
          const image = getImage(env.data)
          const list = await clusters.listByChannel(channel)
          return Promise.all(list.map(async ({cluster}) => {
            return hikaru.findWorkloads(cluster, image)
              .then(
                matches => {
                  return { data: matches }
                },
                err => {
                  log.error(`failed to find workloads matching '${image}' from cluster '${cluster}' with: ${err.stack}`)
                  return { status: 500, data: `Error occurred searching workloads on cluster '${cluster}'` }
                }
              )
          }))
        }
      }
    }
  }
}
