const config = require('./config')()
const bole = require('bole')
const log = bole('comhub')
const client = require('./hubClient')(config)

module.exports = {
  client,
  log
}
