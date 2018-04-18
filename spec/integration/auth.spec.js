require('../setup')

const server = require('./test-server')
const keys = require('../../src/keys')()
const log = require('bole')('test')

const serverPublicKey = keys.read(log, './certs/hub/pubkey.pem')
const clientPrivateKey = keys.read(log, './certs/client/privkey.pem')

describe('Auth Integration Test', function () {
  describe('with certs and specified token', function () {
    let deftly
    let config
    before(function () {
      config = {
        tokens: {
          api: 'test-token-1',
          hikaru: 'test-token-2'
        },
        keys: {
          clientPrivate: './certs/client/privkey.pem',
          clientPublic: './certs/client/pubkey.pem',
          hikaruPublic: './certs/hikaru/pubkey.pem',
          hubPrivate: './certs/hub/privkey.pem',
          hubPublic: './certs/hub/pubkey.pem'
        },
        redisUrl: 'redis://localhost:6379/0',
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
        })
    })

    it('should get 200 with correct token', function () {
      let { token, signature } = keys.encrypt(
        serverPublicKey,
        clientPrivateKey,
        'test-token-1'
      )
      return axios.get('http://localhost:8012/api/_status/ping', {
        headers: {
          authorization: token.toString('base64'),
          signature: signature.toString('base64')
        }
      }).then(
        reply => reply.data.should.eql('Ok')
      )
    })

    it('should get 401 with bad token', function () {
      let { token, signature } = keys.encrypt(
        serverPublicKey,
        clientPrivateKey,
        'test-tok3nz'
      )
      return axios.get('http://localhost:8012/api/_status/ping', {
        headers: {
          authorization: token.toString('base64'),
          signature: signature.toString('base64')
        }
      }).then(
        null,
        err => err.response.data.should.eql('Authorization Required')
      )
    })

    it('should get 401 with missing signature', function () {
      let { token } = keys.encrypt(
        serverPublicKey,
        clientPrivateKey,
        'test-token'
      )
      return axios.get('http://localhost:8012/api/_status/ping', {
        headers: {
          authorization: token.toString('base64')
        }
      }).then(
        null,
        err => err.response.data.should.eql('Authorization Required')
      )
    })

    it('should get 401 with missing token', function () {
      let { signature } = keys.encrypt(
        serverPublicKey,
        clientPrivateKey,
        'test-token'
      )
      return axios.get('http://localhost:8012/api/_status/ping', {
        headers: {
          signature: signature.toString('base64')
        }
      }).then(
        null,
        err => err.response.data.should.eql('Authorization Required')
      )
    })

    it('should get 401 with bad signature', function () {
      let { token } = keys.encrypt(
        serverPublicKey,
        clientPrivateKey,
        'test-token'
      )
      return axios.get('http://localhost:8012/api/_status/ping', {
        headers: {
          authorization: token.toString('base64'),
          signature: 'lol'
        }
      }).then(
        null,
        err => err.response.data.should.eql('Authorization Required')
      )
    })

    after(function () {
      return deftly.service.stop()
    })
  })

  describe('with certs and no token', function () {
    let deftly
    let config
    before(function () {
      config = {
        keys: {
          clientPrivate: './certs/client/privkey.pem',
          clientPublic: './certs/client/pubkey.pem',
          hikaruPublic: './certs/hikaru/pubkey.pem',
          hubPrivate: './certs/hub/privkey.pem',
          hubPublic: './certs/hub/pubkey.pem'
        },
        redisUrl: 'redis://localhost:6379/0',
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
          axios.defaults.headers = {}
        })
    })

    it('should get 401 with generated token and signature then 200 with returned token', function () {
      return axios.get('http://localhost:8012/api/_status/ping')
        .then(
          null,
          err => {
            err.response.data.should.eql('Authorization Required')
            let { token, signature } = err.response.headers
            let tokenBuffer = Buffer.from(token, 'base64')
            let signatureBuffer = Buffer.from(signature, 'base64')
            let decryptedToken = keys.decrypt(serverPublicKey, clientPrivateKey, tokenBuffer, signatureBuffer)
            let creds = keys.encrypt(serverPublicKey, clientPrivateKey, decryptedToken)
            return axios.get(
              'http://localhost:8012/api/_status/ping',
              {
                headers: {
                  authorization: creds.token.toString('base64'),
                  signature: creds.signature.toString('base64')
                }
              }
            ).then(
              reply => reply.data.should.eql('Ok')
            )
          }
        )
    })

    it('should get 401 with generated token and signature then 401 if returning token and signature back', function () {
      return axios.get('http://localhost:8012/api/_status/ping')
        .then(
          null,
          err => {
            err.response.data.should.eql('Authorization Required')
            let { token, signature } = err.response.headers
            return axios.get(
              'http://localhost:8012/api/_status/ping',
              {
                headers: {
                  authorization: token,
                  signature: signature
                }
              }
            ).then(
              null,
              err => err.response.data.should.eql('Authorization Required')
            )
          }
        )
    })

    after(function () {
      return deftly.service.stop()
    })
  })
})
