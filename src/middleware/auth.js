const uuid = require('uuid/v4')
const keys = require('../keys')()

module.exports = function auth (config, log) {
  let localKey
  let publicKey
  let secret
  if (config.keys.hubPrivate && config.keys.clientPublic) {
    localKey = keys.read(log, config.keys.hubPrivate)
    publicKey = keys.read(log, config.keys.clientPublic)
    secret = config.tokens ? (config.tokens.api || uuid()) : uuid()
  }
  return [
    function bearer (env, next) {
      let pass = true
      if (config.tokens.api && !localKey && !publicKey) {
        pass = false
        if (env.headers.authorization) {
          const [ fallback, token ] = env.headers.authorization.split(/bearer[: ]{1,}/i)
          pass = (token || fallback) === config.tokens.api
        }
      }
      if (!pass) {
        log.warn(`unauthorized request for '${env.route}' denied`)
        return {
          status: 401,
          data: 'Authorization Required'
        }
      } else {
        next()
      }
    },
    function cert (env, next) {
      let pass = true
      if (localKey && publicKey) {
        pass = false
        if (env.headers.authorization && env.headers.signature) {
          const [ fallback, token ] = env.headers.authorization.split(/bearer[: ]{1,}/i)
          const tokBuffer = Buffer.from((token || fallback), 'base64')
          const sigBuffer = Buffer.from(env.headers.signature, 'base64')
          pass = secret === keys.decrypt(publicKey, localKey, tokBuffer, sigBuffer)
        } else if (!config.tokens || !config.tokens.api) {
          try {
            let { token, signature } = keys.encrypt(publicKey, localKey, secret)
            return {
              status: 401,
              headers: {
                token: token.toString('base64'),
                signature: signature.toString('base64')
              },
              data: 'Authorization Required'
            }
          } catch (e) {
            console.log(e)
          }
        }
      }
      if (!pass) {
        log.warn(`unauthorized request for '${env.route}' denied`)
        return {
          status: 401,
          data: 'Authorization Required'
        }
      } else {
        next()
      }
    }
  ]
}
