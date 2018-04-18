require('../setup')

const HubClient = require('../../src/hubClient')
const server = require('./test-server')

describe('Hub Client Integration Test', function () {
  describe('with certs and specified token', function () {
    let deftly
    let config
    let client
    before(function () {
      config = {
        tokens: {
          api: 'test-token-1'
        },
        keys: {
          clientPrivate: './certs/client/privkey.pem',
          clientPublic: './certs/client/pubkey.pem',
          hikaruPublic: './certs/hikaru/pubkey.pem',
          hubPrivate: './certs/hub/privkey.pem',
          hubPublic: './certs/hub/pubkey.pem'
        },
        redisUrl: 'redis://localhost:6379/0',
        hubUrl: 'http://localhost:8012',
        port: 8012,
        transports: [ 'deftly-express' ],
        resources: [ './src/resources/*.js' ],
        plugins: [ './src/plugins/*.js' ],
        middleware: [ './src/middleware/*.js' ],
        logging: {
          level: 'info'
        }
      }
      return server(config)
        .then(instance => {
          deftly = instance
          client = new HubClient(config)
        })
    })

    it('should add cluster successfully', function () {
      return Promise.all([
        client.addCluster('test-one', 'https://hikaru.test-one.io'),
        client.addCluster('test-two', 'https://hikaru.test-two.io')
      ]).then(
        results => results.should.eql([true, true])
      )
    })

    it('should get clusters successfully', function () {
      return client.getClusters()
        .then(
          clusters => {
            clusters.sort((a, b) => {
              if (a.cluster > b.cluster) {
                return -1
              } else if (a.cluster < b.cluster) {
                return 1
              }
              return 0
            })
            clusters.should.eql([
              { cluster: 'test-two', url: 'https://hikaru.test-two.io' },
              { cluster: 'test-one', url: 'https://hikaru.test-one.io' }
            ])
          }
        )
    })

    it('should remove cluster', function () {
      return client.removeCluster('test-one')
        .then(
          result => {
            result.should.equal(true)
          }
        )
    })

    it('should have one cluster left', function (done) {
      setTimeout(() => {
        client.getClusters()
          .then(
            clusters => {
              clusters.should.eql([
                { cluster: 'test-two', url: 'https://hikaru.test-two.io' }
              ])
              done()
            }
          )
      }, 100)
    })

    after(function () {
      return deftly.service.stop()
        .then(
          () => {
            return deftly.clusters.clear()
              .then(() => deftly.clusters.close())
          }
        )
    })
  })
})
