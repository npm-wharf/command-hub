const Redis = require('ioredis')
const LIST_KEY = 'cluster-list'
const CHANNELS_KEY = 'cluster-channels'

async function addCluster (client, cluster, url, channel) {
  await client.hset(LIST_KEY, cluster, url)
  if (channel) {
    await client.hset(CHANNELS_KEY, cluster, channel)
    // this enables easy lookup by channel name
    await client.sadd(`${CHANNELS_KEY}-${channel}`, cluster)
  }
}

async function clearList (client) {
  await client.del(LIST_KEY)
  const keys = await client.keys(`${CHANNELS_KEY}*`)
  await Promise.all(keys.map(key => client.del(key)))
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
  await client.hdel(LIST_KEY, cluster)
  const channel = await client.hget(CHANNELS_KEY, cluster)
  if (channel) {
    await client.hdel(CHANNELS_KEY, cluster)
    await client.srem(`${CHANNELS_KEY}-${channel}`, cluster)
  }
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
  const clusters = await client.smembers(`${CHANNELS_KEY}-${channel}`)
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
