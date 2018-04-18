const Redis = require('ioredis')
const LIST_KEY = 'cluster-list'
const { reduce } = require('fauxdash')

function addCluster (client, cluster, url) {
  return client.hset(LIST_KEY, cluster, url)
}

function clearList (client) {
  return client.del(LIST_KEY)
}

function close (client) {
  return client.quit()
}

function getCluster (client, cluster) {
  return client.hget(LIST_KEY, cluster)
}

function removeCluster (client, cluster) {
  return client.hdel(LIST_KEY, cluster)
}

function listClusters (client) {
  return client.hgetall(LIST_KEY)
    .then(
      results => reduce(results, (acc, url, cluster) => {
        acc.push({ cluster: cluster, url: url })
        return acc
      }, [])
    )
}

module.exports = function (config) {
  const client = new Redis(config.redisUrl, {lazyConnect: true})
  return {
    add: addCluster.bind(null, client),
    clear: clearList.bind(null, client),
    close: close.bind(null, client),
    get: getCluster.bind(null, client),
    list: listClusters.bind(null, client),
    remove: removeCluster.bind(null, client)
  }
}
