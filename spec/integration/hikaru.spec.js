require('../setup')

const HIKARU_URL = 'http://hikaru.fake.com'
const Hikaru = require('../../src/hikaru')
const clusters = {
  get: async (name) => ({ url: HIKARU_URL })
}

describe('Hikaru Client', function () {
  let config
  let hikaru
  before(function () {
    config = {
      tokens: {
        hikaru: 'test-token-1'
      },
      keys: {
        clientPrivate: './certs/client/privkey.pem',
        clientPublic: './certs/client/pubkey.pem',
        hikaruPublic: './certs/hikaru/pubkey.pem',
        hubPrivate: './certs/hub/privkey.pem',
        hubPublic: './certs/hub/pubkey.pem'
      },
      logging: {
        level: 'info'
      }
    }
    hikaru = Hikaru(config, clusters)
  })

  describe('when getting workloads (successfully)', function () {
    before(function () {
      nock(HIKARU_URL)
        .get('/api/workload/test/image:tag')
        .reply(200, [
          {
            namespace: 'namespace',
            type: 'deployment',
            service: 'test-1',
            image: 'test/image:tag',
            container: 'test-1'
          },
          {
            namespace: 'namespace',
            type: 'statefulSet',
            service: 'test-2',
            image: 'test/image:tag',
            container: 'test-2'
          }
        ])
    })

    it('should return the list', function () {
      return hikaru.findWorkloads('anycluster', 'test/image:tag')
        .then(
          result => {
            return result.should.eql([
              {
                namespace: 'namespace',
                type: 'deployment',
                service: 'test-1',
                image: 'test/image:tag',
                container: 'test-1'
              },
              {
                namespace: 'namespace',
                type: 'statefulSet',
                service: 'test-2',
                image: 'test/image:tag',
                container: 'test-2'
              }
            ])
          }
        )
    })
  })

  describe('when getting workloads (failure)', function () {
    before(function () {
      nock(HIKARU_URL)
        .get('/api/workload/test/image:tag')
        .reply(500, 'Nope forever')
    })

    it('should reject with an error', function () {
      return hikaru.findWorkloads('anycluster', 'test/image:tag')
        .should.be.rejectedWith(`failed to search workloads on cluster 'anycluster'`)
    })
  })

  describe('when getting candidates (successfully)', function () {
    before(function () {
      nock(HIKARU_URL)
        .get('/api/image/test/image:tag?filter=owner,version')
        .reply(200, {
          upgrade: [
            {
              namespace: 'namespace',
              type: 'deployment',
              service: 'test-1',
              image: 'test/image:tag',
              container: 'test-1'
            }
          ],
          obsolete: [
            {
              namespace: 'namespace',
              type: 'statefulSet',
              service: 'test-2',
              image: 'test/image:tag',
              container: 'test-2'
            }
          ],
          equal: [],
          error: []
        })
    })

    it('should return the set', function () {
      return hikaru.getCandidates('anycluster', 'test/image:tag', ['owner', 'version'])
        .then(
          result => {
            return result.should.eql({
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-1',
                  image: 'test/image:tag',
                  container: 'test-1'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-2',
                  image: 'test/image:tag',
                  container: 'test-2'
                }
              ],
              equal: [],
              error: []
            })
          }
        )
    })
  })

  describe('when getting candidates (failure)', function () {
    before(function () {
      nock(HIKARU_URL)
        .get('/api/image/test/image:tag?filter=owner,version')
        .reply(500, 'ohno')
    })

    it('should reject with an error', function () {
      return hikaru.getCandidates('anycluster', 'test/image:tag', ['owner', 'version'])
        .should.be.rejectedWith(`failed to get candidates from cluster 'anycluster'`)
    })
  })

  describe('when upgrading workloads (successfully)', function () {
    before(function () {
      nock(HIKARU_URL)
        .post('/api/image/test/image:tag?filter=owner,version')
        .reply(200, {
          upgrade: [
            {
              namespace: 'namespace',
              type: 'deployment',
              service: 'test-1',
              image: 'test/image:tag',
              container: 'test-1'
            }
          ],
          obsolete: [
            {
              namespace: 'namespace',
              type: 'statefulSet',
              service: 'test-2',
              image: 'test/image:tag',
              container: 'test-2'
            }
          ],
          equal: [],
          error: [
            {
              namespace: 'namespace',
              type: 'daemonSet',
              service: 'test-3',
              image: 'test/image:tag',
              container: 'test-3'
            }
          ]
        })
    })

    it('should return the set', function () {
      return hikaru.upgradeWorkloads('anycluster', 'test/image:tag', ['owner', 'version'])
        .then(
          result => {
            return result.should.eql({
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-1',
                  image: 'test/image:tag',
                  container: 'test-1'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-2',
                  image: 'test/image:tag',
                  container: 'test-2'
                }
              ],
              equal: [],
              error: [
                {
                  namespace: 'namespace',
                  type: 'daemonSet',
                  service: 'test-3',
                  image: 'test/image:tag',
                  container: 'test-3'
                }
              ]
            })
          }
        )
    })
  })

  describe('when upgrading workloads (failure)', function () {
    before(function () {
      nock(HIKARU_URL)
        .post('/api/image/test/image:tag?filter=owner,version')
        .reply(500, 'cannot do that')
    })

    it('should reject with an error', function () {
      return hikaru.upgradeWorkloads('anycluster', 'test/image:tag', ['owner', 'version'])
        .should.be.rejectedWith(`failed to upgrade workloads on cluster 'anycluster'`)
    })
  })

  after(function () {
    nock.cleanAll()
  })
})
