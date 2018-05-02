const axios = require('axios')
const keys = require('./keys')()
const log = require('bole')('hikaru-client')

function getInstance (config) {
  const instance = axios.create()
  if (config.tokens && config.tokens.hikaru) {
    const publicKey = keys.read(log, config.keys.hikaruPublic)
    const privateKey = keys.read(log, config.keys.hubPrivate)
    const { token, signature } = keys.encrypt(
      publicKey,
      privateKey,
      config.tokens.hikaru
    )
    instance.defaults.headers.authorization = `bearer: ${token.toString('base64')}`
    instance.defaults.headers.signature = signature.toString('base64')
  }
  if (config.timeout) {
    instance.defaults.timeout = config.timeout
  }
  return instance
}

async function findWorkloads (clusters, instance, name, image) {
  let cluster = await clusters.get(name)
  let url = `${cluster}/api/workload/${image}`
  return instance.get(url)
    .then(
      response => response.data,
      err => {
        if (err.response) {
          log.error(`failed to find workloads: ${err.response.status} - ${err.response.data}`)
        } else {
          log.error(`failed to call hikaru endpoint '${cluster}' with ${err.stack}`)
        }
        throw new Error(`failed to search workloads on cluster '${name}'`)
      }
    )
}

async function getCandidates (clusters, instance, name, image, filter) {
  let cluster = await clusters.get(name)
  let url = `${cluster}/api/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.get(url)
    .then(
      response => response.data,
      err => {
        log.error(`failed to get candidates: ${err.response.status} - ${err.response.data}`)
        throw new Error(`failed to get candidates from cluster '${name}'`)
      }
    )
}

async function upgradeWorkloads (clusters, instance, name, image, filter) {
  let cluster = await clusters.get(name)
  let url = `${cluster}/api/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.post(url)
    .then(
      response => response.data,
      err => {
        log.error(`failed to upgrade workloads: ${err.response.status} - ${err.response.data}`)
        throw new Error(`failed to upgrade workloads on cluster '${name}'`)
      }
    )
}

module.exports = function (config, clusters) {
  const instance = getInstance(config)
  return {
    findWorkloads: findWorkloads.bind(null, clusters, instance),
    getCandidates: getCandidates.bind(null, clusters, instance),
    upgradeWorkloads: upgradeWorkloads.bind(null, clusters, instance)
  }
}
