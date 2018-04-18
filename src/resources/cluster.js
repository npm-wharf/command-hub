const log = require('bole')('cluster-resource')
const { filter } = require('fauxdash')

function getImage (data) {
  return filter([data.registry, data.repo, data.image]).join('/')
}

module.exports = function (config, clusters, hikaru) {
  return {
    name: 'cluster',
    middleware: [
      'auth.bearer',
      'auth.cert'
    ],
    actions: {
      add: {
        method: 'POST',
        url: '',
        handle: (env) => {
          const { name, url } = env.data.data
          if (!name || !url) {
            return { status: 400, data: 'Invalid Request - name and url are required to add a cluster' }
          }
          return clusters.add(name, url)
            .then(
              () => { return { status: 201, data: 'cluster added' } },
              err => {
                log.error(`Failed to add cluster with error: ${err.stack}`)
                return { status: 500, data: 'Failed to add cluster due to server error' }
              }
            )
        }
      },
      candidates: {
        method: 'GET',
        url: [
          ':name/image/:registry/:repo/:image',
          ':name/image/:repo/:image',
          ':name/image/:image'
        ],
        handle: (env) => {
          const { name } = env.data
          const image = getImage(env.data)
          const filter = env.data.filter ? env.data.filter.split(',') : []
          return hikaru.getCandidates(name, image, filter)
            .then(
              candidates => { return { data: candidates } },
              err => {
                log.error(`failed to retrieve candidates matching '${image}' from cluster '${name}' with: ${err.stack}`)
                return { status: 500, data: `Error occurred trying to get candidate list from cluster '${name}'` }
              }
            )
        }
      },
      find: {
        method: 'GET',
        url: [
          ':name/workload/:registry/:repo/:image',
          ':name/workload/:repo/:image',
          ':name/workload/:image'
        ],
        handle: (env) => {
          const { name } = env.data
          const image = getImage(env.data)
          return hikaru.findWorkloads(name, image)
            .then(
              matches => {
                return { data: matches }
              },
              err => {
                log.error(`failed to find workloads matching '${image}' from cluster '${name}' with: ${err.stack}`)
                return { status: 500, data: `Error occurred searching workloads on cluster '${name}'` }
              }
            )
        }
      },
      list: {
        method: 'GET',
        url: '',
        handle: (env) => {
          return clusters.list()
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
      remove: {
        method: 'DELETE',
        url: ':name',
        handle: (env) => {
          const { name } = env.data
          if (!name) {
            return { status: 400, data: 'Invalid Request - name is required to remove a cluster' }
          }
          return clusters.remove(name)
            .then(
              () => { return { status: 204 } },
              err => {
                log.error(`Failed to remove cluster with error: ${err.stack}`)
                return { status: 500, data: 'Failed to remove cluster due to server error' }
              }
            )
        }
      },
      upgrade: {
        method: 'POST',
        url: [
          ':name/image/:registry/:repo/:image',
          ':name/image/:repo/:image',
          ':name/image/:image'
        ],
        handle: (env) => {
          const { name } = env.data
          const image = getImage(env.data)
          const filter = env.data.filter ? env.data.filter.split(',') : []
          return hikaru.upgradeWorkloads(name, image, filter)
            .then(
              upgrades => { return { data: upgrades } },
              err => {
                log.error(`failed to perform upgrades for '${image}' on cluster '${name}' with: ${err.stack}`)
                return { status: 500, data: `Error occurred trying to upgrade '${name}'` }
              }
            )
        }
      }
    }
  }
}
