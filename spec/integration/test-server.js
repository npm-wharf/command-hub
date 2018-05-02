const fount = require('fount')
const bole = require('bole')
const log = bole('hikaru')
const express = require('../../src/express')()
const service = require('../../src/service')
const Redis = require('../../src/redis')
const Client = require('../../src/clusterApi')

module.exports = function (config) {
  config.http = {
    apiPrefix: '/api',
    configure: express.configure,
    port: config.port
  }

  const clusters = config.redisUrl
    ? Redis(config)
    : Client(config)

  const hikaru = require('../../src/hikaru')(config, clusters)

  const dependencies = {
    fount,
    express,
    config,
    clusters,
    hikaru,
    log
  }

  fount({
    default: dependencies,
    resources: dependencies,
    stack: dependencies
  })

  return fount.inject(service.start)
    .then(s => {
      return {
        fount,
        dependencies,
        service: s,
        clusters
      }
    })
}
