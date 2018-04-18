require('dot-env')
const API_TOKEN = 'API_TOKEN'
const HIKARU_TOKEN = 'HIKARU_TOKEN'
const REDIS_URL = 'REDIS_URL'
const PORT = 'PORT'
const LOG = 'LOG_LEVEL'
const HUB_URL = 'HUB_URL'
const CLIENT_PUBLIC_KEY = 'CLIENT_PUBLIC_KEY'
const CLIENT_PRIVATE_KEY = 'CLIENT_PRIVATE_KEY'
const HIKARU_PUBLIC_KEY = 'HIKARU_PUBLIC_KEY'
const HUB_PRIVATE_KEY = 'HUB_PRIVATE_KEY'
const HUB_PUBLIC_KEY = 'HUB_PUBLIC_KEY'
const CLUSTER_API_HOST = 'CLUSTER_API_HOST'
const CLUSTER_API_LIST = 'CLUSTER_API_LIST'
const CLUSTER_API_CLUSTER = 'CLUSTER_API_CLUSTER'
const CLUSTER_API_TOKEN = 'CLUSTER_API_TOKEN'
const CLUSTER_API_USER = 'CLUSTER_API_USER'
const CLUSTER_API_PASS = 'CLUSTER_API_PASS'

module.exports = function () {
  return {
    tokens: {
      api: process.env[ API_TOKEN ],
      hikaru: process.env[ HIKARU_TOKEN ]
    },
    keys: {
      clientPrivate: process.env[ CLIENT_PRIVATE_KEY ],
      clientPublic: process.env[ CLIENT_PUBLIC_KEY ],
      hikaruPublic: process.env[ HIKARU_PUBLIC_KEY ],
      hubPrivate: process.env[ HUB_PRIVATE_KEY ],
      hubPublic: process.env[ HUB_PUBLIC_KEY ]
    },
    clusterApi: {
      host: process.env[ CLUSTER_API_HOST ],
      list: process.env[ CLUSTER_API_LIST ],
      cluster: process.env[ CLUSTER_API_CLUSTER ],
      token: process.env[ CLUSTER_API_TOKEN ],
      user: process.env[ CLUSTER_API_USER ],
      pass: process.env[ CLUSTER_API_PASS ]
    },
    hubUrl: process.env[ HUB_URL ],
    redisUrl: process.env[ REDIS_URL ],
    port: process.env[ PORT ] || 8010,
    transports: [ 'deftly-express' ],
    resources: [ './src/resources/*.js' ],
    plugins: [ './src/plugins/*.js' ],
    middleware: [ './src/middleware/*.js' ],
    logging: {
      level: process.env[LOG] || 'debug'
    }
  }
}
