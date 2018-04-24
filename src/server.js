const config = require('./config')()
const fount = require('fount')
const express = require('./express')()
const service = require('./service')
const bole = require('bole')
const log = bole('comhub')
const Redis = require('./redis')
const Client = require('./clusterApi')
const Hikaru = require('./hikaru')

config.http = {
  apiPrefix: '/api',
  configure: express.configure,
  port: config.port
}

const clusters = config.redisUrl
  ? Redis(config)
  : Client(config)

const hikaru = Hikaru(config, clusters)

const dependencies = {
  fount,
  express,
  config,
  hikaru,
  clusters,
  log
}

fount({
  default: dependencies,
  resources: dependencies,
  stack: dependencies
})

fount.inject(service.start)
