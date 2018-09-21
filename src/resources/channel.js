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
        handle: (env) => clusters.listByChannel(env.data.channel)
          .then(
            clusters => {
              return { data: { clusters } }
            },
            err => {
              log.error(`Failed to retrieve clusters with error: ${err.stack}`)
              return { status: 500, data: 'Could not get list of clusters' }
            }
          )

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
          const set = {}
          await Promise.all(list.map(async ({cluster, url}) => {
            try {
              var candidates = await hikaru.getCandidates(cluster, image, filter)
            } catch (err) {
              log.error(`failed to retrieve candidates matching '${image}' from cluster '${cluster}' with: ${err.stack}`)
              set[cluster] = {
                message: `Error occurred trying to get candidate list from cluster '${cluster}'`,
                failed: true,
                error: err.stack
              }
              return
            }
            candidates.url = url
            set[cluster] = candidates
          }))
          return {status: 200, data: set}
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
          const data = {}
          await Promise.all(list.map(async ({cluster, url}) => hikaru.findWorkloads(cluster, image)
            .then(
              matches => {
                matches.url = url
                data[cluster] = matches
              },
              err => {
                log.error(`failed to find workloads matching '${image}' from cluster '${cluster}' with: ${err.stack}`)
                data[cluster] = {
                  failed: true,
                  error: err.stack,
                  message: `Error occurred searching workloads on cluster '${cluster}'`
                }
              }
            )))
          return {status: 200, data}
        }
      },
      upgradeByChannel: {
        method: 'POST',
        url: [
          ':channel/image/:registry/:repo/:image',
          ':channel/image/:repo/:image',
          ':channel/image/:image'
        ],
        handle: async (env) => {
          const { channel } = env.data
          const image = getImage(env.data)
          const filter = env.data.filter ? env.data.filter.split(',') : []
          try {
            var list = await clusters.listByChannel(channel)
          } catch (err) {
            log.error(`failed to perform upgrades across all clusters - could not get cluster list: ${err.stack}`)
            return { status: 500, data: `Error occurred upgrading clusters - could not retrieve cluster list` }
          }
          const set = {}
          let promises = list.map(({cluster, url}) => hikaru.upgradeWorkloads(cluster, image, filter)
            .then(
              upgrades => {
                upgrades.url = url
                set[cluster] = upgrades
              },
              err => {
                log.error(`failed to perform upgrades for '${image}' on cluster '${cluster}' with: ${err.stack}`)
                set[cluster] = {
                  url,
                  failed: true,
                  message: `failed to perform upgrades for '${image}'`,
                  error: err.stack
                }
              }
            ))

          await Promise.all(promises)
          return { status: 200, data: set }
        }
      }
    }
  }
}
