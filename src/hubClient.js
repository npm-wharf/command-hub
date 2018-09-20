const axios = require('axios')
const keys = require('./keys')()
const log = require('bole')('hub-client')

function addCluster (instance, name, url, channel) {
  return instance.post(
    '/api/cluster',
    {
      headers: {
        'content-type': 'application/json'
      },
      data: { name, url, channel }
    }
  ).then(
    response => response.status === 201,
    err => {
      let message = ''
      if (err.response) {
        message = `failed to add cluster: ${err.response.status} - ${err.response.data}`
      } else {
        message = `no response from server '${axios.defaults.baseURL}' - cannot add cluster due to error: ${err.stack}`
      }
      log.error(message)
      throw new Error(message)
    }
  )
}

function findWorkloads (instance, name, image) {
  let url = `/api/cluster/${name}/workload/${image}`
  return instance.get(url)
    .then(
      response => { log.info(response.data); return response.data },
      err => {
        let message = ''
        if (err.response) {
          message = `failed to find workloads: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot find workloads due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

function findWorkloadsOnAll (instance, image) {
  let url = `/api/cluster/workload/${image}`
  return instance.get(url)
    .then(
      response => response.data,
      err => {
        let message = ''
        if (err.response) {
          message = `failed to find workloads on all clusters: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot find workloads for all clusters due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

function getCandidates (instance, name, image, filter) {
  let url = `/api/cluster/${name}/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.get(url)
    .then(
      response => response.data,
      err => {
        let message = ''
        if (err.response) {
          message = `failed to get upgrade candidates: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot get upgrade candidates due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

function getCandidatesOnAll (instance, image, filter) {
  let url = `/api/cluster/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.get(url)
    .then(
      response => response.data,
      err => {
        let message = ''
        if (err.response) {
          message = `failed to get upgrade candidates on all clusters: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot get upgrade candidates due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

async function getClusters (instance) {
  const response = await instance.get('/api/cluster').catch(err => {
    let message = ''
    if (err.response) {
      message = `failed to get cluster list: ${err.response.status} - ${err.response.data}`
    } else {
      message = `no response from server '${axios.defaults.baseURL}' - cannot get cluster list due to error: ${err.stack}`
    }
    log.error(message)
    throw new Error(message)
  })
  return response.data.clusters
}

async function getClustersByChannel (instance, channel) {
  const response = await instance.get(`/api/channel/${channel}`).catch(err => {
    let message = ''
    if (err.response) {
      message = `failed to get cluster list: ${err.response.status} - ${err.response.data}`
    } else {
      message = `no response from server '${axios.defaults.baseURL}' - cannot get cluster list due to error: ${err.stack}`
    }
    log.error(message)
    throw new Error(message)
  })
  return response.data.clusters
}

function getInstance (config) {
  const publicKey = keys.read(log, config.keys.hubPublic)
  const privateKey = keys.read(log, config.keys.clientPrivate)
  const { token, signature } = keys.encrypt(
    publicKey,
    privateKey,
    config.tokens.api
  )
  const instance = axios.create()
  instance.defaults.baseURL = config.hubUrl
  instance.defaults.headers.authorization = token.toString('base64')
  instance.defaults.headers.signature = signature.toString('base64')
  if (config.timeout) {
    instance.defaults.timeout = config.timeout
  }
  return instance
}

function removeCluster (instance, name) {
  return instance.delete(
    `/api/cluster/${name}`
  ).then(
    response => response.status === 204,
    err => {
      let message = ''
      if (err.response) {
        message = `failed to remove cluster: ${err.response.status} - ${err.response.data}`
      } else {
        message = `no response from server '${axios.defaults.baseURL}' - cannot remove cluster due to error: ${err.stack}`
      }
      log.error(message)
      throw new Error(message)
    }
  )
}

function upgradeWorkloads (instance, name, image, filter) {
  let url = `/api/cluster/${name}/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.post(url)
    .then(
      response => response.data,
      err => {
        let message = ''
        if (err.response) {
          message = `failed to upgrade workloads: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot update workloads due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

function upgradeWorkloadsOnAll (instance, image, filter) {
  let url = `/api/cluster/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return instance.post(url)
    .then(
      response => response.data,
      err => {
        let message = ''
        if (err.response) {
          message = `failed to upgrade workloads on all clusters: ${err.response.status} - ${err.response.data}`
        } else {
          message = `no response from server '${axios.defaults.baseURL}' - cannot update workloads due to error: ${err.stack}`
        }
        log.error(message)
        throw new Error(message)
      }
    )
}

module.exports = function (config) {
  const instance = getInstance(config)
  return {
    addCluster: addCluster.bind(null, instance),
    findWorkloads: findWorkloads.bind(null, instance),
    findWorkloadsOnAll: findWorkloadsOnAll.bind(null, instance),
    getCandidates: getCandidates.bind(null, instance),
    getCandidatesOnAll: getCandidatesOnAll.bind(null, instance),
    getClusters: getClusters.bind(null, instance),
    getClustersByChannel: getClustersByChannel.bind(null, instance),
    removeCluster: removeCluster.bind(null, instance),
    upgradeWorkloads: upgradeWorkloads.bind(null, instance),
    upgradeWorkloadsOnAll: upgradeWorkloadsOnAll.bind(null, instance)
  }
}
