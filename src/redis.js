const Redis = require('ioredis')
const LIST_KEY = 'cluster-list'
const CHANNELS_KEY = 'cluster-channels'

async function addCluster (client, cluster, url, channel) {
  let txn = client.multi().hset(LIST_KEY, cluster, url)
  if (channel) {
    txn = txn.hset(CHANNELS_KEY, cluster, channel)
      // this enables easy lookup by channel name
      .sadd(`${CHANNELS_KEY}/${channel}`, cluster)
  }
  await txn.exec()
}

async function clearList (client) {
  const keys = await client.keys(`${CHANNELS_KEY}*`)
  let txn = client.multi().del(LIST_KEY)
  keys.forEach(key => { txn = txn.del(key) })

  await txn.exec()
}

function close (client) {
  return client.quit()
}

async function getCluster (client, cluster) {
  const [url, channel] = await Promise.all([
    client.hget(LIST_KEY, cluster),
    client.hget(CHANNELS_KEY, cluster)
  ])
  if (!url) return null

  const obj = {cluster, url}
  if (channel) obj.channel = channel
  return obj
}

async function removeCluster (client, cluster) {
  const channel = await client.hget(CHANNELS_KEY, cluster)
  let txn = client.multi().hdel(LIST_KEY, cluster)
  if (channel) {
    txn = txn.hdel(CHANNELS_KEY, cluster)
      .srem(`${CHANNELS_KEY}/${channel}`, cluster)
  }
  await txn.exec()
}

async function listClusters (client) {
  const [urls, channels] = await Promise.all([
    client.hgetall(LIST_KEY),
    client.hgetall(CHANNELS_KEY)
  ])
  return Object.keys(urls).map((name) => {
    const url = urls[name]
    const channel = channels[name]
    const obj = {cluster: name, url}
    if (channel) obj.channel = channel
    return obj
  })
}

async function listClustersByChannel (client, channel) {
  const clusters = await client.smembers(`${CHANNELS_KEY}/${channel}`)
  return Promise.all(clusters.map(async name => {
    const url = await client.hget(LIST_KEY, name)
    return {cluster: name, url, channel}
  }))
}

module.exports = function (config) {
  const client = new Redis(config.redisUrl, {lazyConnect: true})
  return {
    add: addCluster.bind(null, client),
    clear: clearList.bind(null, client),
    close: close.bind(null, client),
    get: getCluster.bind(null, client),
    list: listClusters.bind(null, client),
    listByChannel: listClustersByChannel.bind(null, client),
    remove: removeCluster.bind(null, client)
  }
}
