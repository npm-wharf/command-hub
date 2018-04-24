const axios = require('axios')
const keys = require('./keys')()
const log = require('bole')('hub-client')

function setDefaults (config) {
  const publicKey = keys.read(log, config.keys.hubPublic)
  const privateKey = keys.read(log, config.keys.clientPrivate)
  const {token, signature} = keys.encrypt(
    publicKey,
    privateKey,
    config.tokens.api
  )
  axios.defaults.baseURL = config.hubUrl
  axios.defaults.headers.authorization = token.toString('base64')
  axios.defaults.headers.signature = signature.toString('base64')
}

function findWorkloads (name, image) {
  let url = `/api/cluster/${name}/workload/${image}`
  return axios.get(url)
    .then(
      response => response.data,
      err => {
        if (err.response) {
          log.error(`failed to find workloads: ${err.response.status} - ${err.response.data}`)
        } else {
          log.error(`no response from server '${axios.defaults.baseURL}' - cannot find workloads due to error: ${err.stack}`)
        }
        return {}
      }
    )
}

function getCandidates (name, image, filter) {
  let url = `/api/cluster/${name}/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return axios.get(url)
    .then(
      response => response.data,
      err => {
        if (err.response) {
          log.error(`failed to get candidates: ${err.response.status} - ${err.response.data}`)
          return {}
        } else {
          log.error(`no response from server '${axios.defaults.baseURL}' - cannot get upgrade candidates due to error: ${err.stack}`)
        }
      }
    )
}

function getClusters () {
  return axios.get('/api/cluster')
    .then(
      response => response.data.clusters,
      err => {
        if (err.response) {
          log.error(`failed to get cluster list: ${err.response.status} - ${err.response.data}`)
        } else {
          log.error(`no response from server '${axios.defaults.baseURL}' - cannot get cluster list due to error: ${err.stack}`)
        }
        return []
      }
    )
}

function addCluster (name, url) {
  return axios.post(
    '/api/cluster',
    {
      headers: {
        'content-type': 'application/json'
      },
      data: { name, url }
    }
  ).then(
    response => response.status === 201,
    err => {
      if (err.response) {
        log.error(`failed to add cluster: ${err.response.status} - ${err.response.data}`)
        return false
      } else {
        log.error(`no response from server '${axios.defaults.baseURL}' - cannot add cluster due to error: ${err.stack}`)
      }
    }
  )
}

function removeCluster (name) {
  return axios.delete(
    `/api/cluster/${name}`
  ).then(
    response => response.status === 204,
    err => {
      if (err.response) {
        log.error(`failed to remove cluster: ${err.response.status} - ${err.response.data}`)
        return false
      } else {
        log.error(`no response from server '${axios.defaults.baseURL}' - cannot remove cluster due to error: ${err.stack}`)
      }
    }
  )
}

function upgradeWorkloads (name, image, filter) {
  let url = `/api/cluster/${name}/image/${image}`
  url = filter && filter.length > 0
    ? `${url}?filter=${filter.join(',')}`
    : url
  return axios.post(url)
    .then(
      response => response.data,
      err => {
        if (err.response) {
          log.error(`failed to upgrade workloads: ${err.response.status} - ${err.response.data}`)
          return {}
        } else {
          log.error(`no response from server '${axios.defaults.baseURL}' - cannot update workloads due to error: ${err.stack}`)
        }
      }
    )
}

module.exports = function (config) {
  setDefaults(config)
  return {
    addCluster,
    findWorkloads,
    getCandidates,
    getClusters,
    removeCluster,
    upgradeWorkloads
  }
}
