require('../setup')

const HubClient = require('../../src/hubClient')
const server = require('./test-server')
const HIKARU_URL_1 = 'https://hikaru.test-one.io'
const HIKARU_URL_2 = 'https://hikaru.test-two.io'
const HIKARU_INT_1 = 'https://hikaru.int-one.io'
const HIKARU_INT_2 = 'https://hikaru.int-two.io'
const HUB_URL = 'http://localhost:8012'

const sorter = (a, b) => {
  if (a.cluster > b.cluster) {
    return -1
  } else if (a.cluster < b.cluster) {
    return 1
  }
  return 0
}

describe('Hub Client Integration Test', function () {
  this.timeout(500)
  describe('with certs and specified token', function () {
    let deftly
    let config
    let client
    before(async () => {
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
        hubUrl: HUB_URL,
        timeout: 500,
        port: 8012,
        transports: [ 'deftly-express' ],
        resources: [ './src/resources/*.js' ],
        plugins: [ './src/plugins/*.js' ],
        middleware: [ './src/middleware/*.js' ],
        logging: {
          level: 'info'
        }
      }
      deftly = await server(config)
      client = new HubClient(config)
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
            clusters.sort(sorter)
            clusters.should.eql([
              { cluster: 'test-two', url: 'https://hikaru.test-two.io' },
              { cluster: 'test-one', url: 'https://hikaru.test-one.io' }
            ])
          }
        )
    })

    describe('with two clusters', function () {
      describe('when getting all workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
          nock(HIKARU_URL_2)
            .get('/api/workload/test/image:tag')
            .reply(200, [
              {
                namespace: 'namespace',
                type: 'deployment',
                service: 'test-3',
                image: 'test/image:tag',
                container: 'test-3'
              },
              {
                namespace: 'namespace',
                type: 'statefulSet',
                service: 'test-4',
                image: 'test/image:tag',
                container: 'test-4'
              }
            ])
        })

        it('should return the list', function () {
          return client.findWorkloadsOnAll('test/image:tag')
            .then(
              result => {
                return result.should.eql({
                  'test-one': [
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
                  ],
                  'test-two': [
                    {
                      namespace: 'namespace',
                      type: 'deployment',
                      service: 'test-3',
                      image: 'test/image:tag',
                      container: 'test-3'
                    },
                    {
                      namespace: 'namespace',
                      type: 'statefulSet',
                      service: 'test-4',
                      image: 'test/image:tag',
                      container: 'test-4'
                    }
                  ]
                })
              }
            )
        })
      })

      describe('when getting all workloads (error)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
          nock(HIKARU_URL_2)
            .get('/api/workload/test/image:tag')
            .reply(500, 'Nope forever')
        })

        it('should return the list', function () {
          return client.findWorkloadsOnAll('test/image:tag')
            .then(
              result => {
                return result.should.partiallyEql({
                  'test-one': [
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
                  ],
                  'test-two': {
                    failed: true,
                    message: `failed to perform find 'test/image:tag' on 'test-two'`,
                    url: 'https://hikaru.test-two.io'
                  }
                })
              }
            )
        })
      })

      describe('when getting all candidates (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
          nock(HIKARU_URL_2)
            .get('/api/image/test/image:tag?filter=owner,version')
            .reply(200, {
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-3',
                  image: 'test/image:tag',
                  container: 'test-3'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-4',
                  image: 'test/image:tag',
                  container: 'test-4'
                }
              ],
              equal: [],
              error: []
            })
        })

        it('should return the set', function () {
          return client.getCandidatesOnAll('test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'test-one': {
                    url: 'https://hikaru.test-one.io',
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
                    ]
                  },
                  'test-two': {
                    url: 'https://hikaru.test-two.io',
                    upgrade: [
                      {
                        namespace: 'namespace',
                        type: 'deployment',
                        service: 'test-3',
                        image: 'test/image:tag',
                        container: 'test-3'
                      }
                    ],
                    obsolete: [
                      {
                        namespace: 'namespace',
                        type: 'statefulSet',
                        service: 'test-4',
                        image: 'test/image:tag',
                        container: 'test-4'
                      }
                    ]
                  }
                })
              }
            )
        })
      })

      describe('when getting all candidates (error)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
          nock(HIKARU_URL_2)
            .get('/api/image/test/image:tag?filter=owner,version')
            .reply(500, 'ohno')
        })

        it('should reject with an error', function () {
          return client.getCandidatesOnAll('test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'test-one': {
                    url: HIKARU_URL_1,
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
                    ]
                  },
                  'test-two': {
                    failed: true,
                    message: `failed to get candidates for 'test/image:tag'`,
                    url: HIKARU_URL_2
                  }
                })
              }
            )
        })
      })

      describe('when upgrading all workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
              error: []
            })
          nock(HIKARU_URL_2)
            .post('/api/image/test/image:tag?filter=owner,version')
            .reply(200, {
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-3',
                  image: 'test/image:tag',
                  container: 'test-3'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-4',
                  image: 'test/image:tag',
                  container: 'test-4'
                }
              ],
              equal: [],
              error: []
            })
        })

        it('should return the set', function () {
          return client.upgradeWorkloadsOnAll('test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'test-one': {
                    url: HIKARU_URL_1,
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
                    ]
                  },
                  'test-two': {
                    url: HIKARU_URL_2,
                    upgrade: [
                      {
                        namespace: 'namespace',
                        type: 'deployment',
                        service: 'test-3',
                        image: 'test/image:tag',
                        container: 'test-3'
                      }
                    ],
                    obsolete: [
                      {
                        namespace: 'namespace',
                        type: 'statefulSet',
                        service: 'test-4',
                        image: 'test/image:tag',
                        container: 'test-4'
                      }
                    ]
                  }
                })
              }
            )
        })
      })

      describe('when upgrading all workloads (error)', function () {
        before(function () {
          nock(HIKARU_URL_1)
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
              error: []
            })
          nock(HIKARU_URL_2)
            .post('/api/image/test/image:tag?filter=owner,version')
            .reply(500, 'cannot do that')
        })

        it('should reject with an error', function () {
          return client.upgradeWorkloadsOnAll('test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'test-one': {
                    url: HIKARU_URL_1,
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
                    ]
                  },
                  'test-two': {
                    failed: true,
                    message: `failed to perform upgrades for 'test/image:tag'`,
                    url: HIKARU_URL_2
                  }
                })
              }
            )
        })
      })
    })

    describe('with one cluster', function () {
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

      describe('when getting workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_2)
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

        it('should return the list', async () => {
          const result = await client.findWorkloads('test-two', 'test/image:tag')
          result.should.eql([
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
      })

      describe('when getting workloads (failure)', function () {
        before(function () {
          nock(HIKARU_URL_2)
            .get('/api/workload/test/image:tag')
            .reply(500, 'Nope forever')
        })

        it('should reject with an error', function () {
          return client.findWorkloads('test-two', 'test/image:tag')
            .should.be.rejectedWith(`failed to find workloads: 500 - Error occurred searching workloads on cluster 'test-two'`)
        })
      })

      describe('when getting candidates (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_2)
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
          return client.getCandidates('test-two', 'test/image:tag', ['owner', 'version'])
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
          nock(HIKARU_URL_2)
            .get('/api/image/test/image:tag?filter=owner,version')
            .reply(500, 'ohno')
        })

        it('should reject with an error', function () {
          return client.getCandidates('test-two', 'test/image:tag', ['owner', 'version'])
            .should.be.rejectedWith(`failed to get upgrade candidates: 500 - Error occurred trying to get candidate list from cluster 'test-two'`)
        })
      })

      describe('when upgrading workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_URL_2)
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
          return client.upgradeWorkloads('test-two', 'test/image:tag', ['owner', 'version'])
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
          nock(HIKARU_URL_2)
            .post('/api/image/test/image:tag?filter=owner,version')
            .reply(500, 'cannot do that')
        })

        it('should reject with an error', function () {
          return client.upgradeWorkloads('test-two', 'test/image:tag', ['owner', 'version'])
            .should.be.rejectedWith(`failed to upgrade workloads: 500 - Error occurred trying to upgrade 'test-two'`)
        })
      })

      describe('when adding cluster (failure)', function () {
        before(function () {
          nock(HUB_URL)
            .post('/api/cluster')
            .reply(500, 'server error')
        })

        it('should fail to add cluster (failure)', function () {
          return client.addCluster('test-three', 'https://hikaru.test-two.io')
            .should.eventually.be.rejectedWith('failed to add cluster: 500 - server error')
        })
      })

      describe('when removing cluster (failure)', function () {
        before(function () {
          nock(HUB_URL)
            .delete('/api/cluster/test-three')
            .reply(500, 'server error')
        })

        it('should fail to remove cluster (failure)', function () {
          return client.removeCluster('test-three')
            .should.eventually.be.rejectedWith('failed to remove cluster: 500 - server error')
        })
      })

      describe('when listing clusters (failure)', function () {
        before(function () {
          nock(HUB_URL)
            .get('/api/cluster')
            .reply(500, 'server error')
        })

        it('should fail to get clusters (failure)', function () {
          return client.getClusters()
            .should.eventually.be.rejectedWith('failed to get cluster list: 500 - server error')
        })
      })
    })

    describe('errors', () => {
      describe('with failing hub server calls', function () {
        describe('when adding cluster (error)', function () {
          it('should fail to add cluster (failure)', function () {
            return client.addCluster('test-three', 'https://hikaru.test-two.io')
              .should.eventually.be.rejectedWith('no response from server')
          })
        })

        describe('when removing cluster (error)', function () {
          it('should fail to add cluster (failure)', function () {
            return client.removeCluster('test-three')
              .should.eventually.be.rejectedWith('no response from server')
          })
        })

        describe('when listing clusters (error)', function () {
          it('should fail to add cluster (failure)', function () {
            return client.getClusters()
              .should.eventually.be.rejectedWith('no response from server')
          })
        })

        describe('when getting workloads (error)', function () {
          it('should reject with an error', function () {
            return client.findWorkloads('test-two', 'test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting workloads (error)', function () {
          it('should reject with an error', function () {
            return client.findWorkloads('test-two', 'test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting all workloads (error)', function () {
          it('should reject with an error', function () {
            return client.findWorkloadsOnAll('test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting upgrade candidates (error)', function () {
          it('should reject with an error', function () {
            return client.getCandidates('test-two', 'test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting all upgrade candidates (error)', function () {
          it('should reject with an error', function () {
            return client.getCandidatesOnAll('test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting upgrade candidates (error)', function () {
          it('should reject with an error', function () {
            return client.upgradeWorkloads('test-two', 'test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })

        describe('when getting all upgrade candidates (error)', function () {
          it('should reject with an error', function () {
            return client.upgradeWorkloadsOnAll('test/image:tag')
              .should.be.rejectedWith(`no response from server`)
          })
        })
      })
    })

    describe('with channels', () => {
      before(async () => {
        nock.cleanAll()
        await deftly.clusters.clear()
      })
      it('should add clusters successfully', function () {
        return Promise.all([
          client.addCluster('test-one', 'https://hikaru.test-one.io'),
          client.addCluster('prod-one', 'https://hikaru.prod-one.io', 'production'),
          client.addCluster('int-one', 'https://hikaru.int-one.io', 'integration'),
          client.addCluster('int-two', 'https://hikaru.int-two.io', 'integration')
        ]).then(
          results => results.should.eql([true, true, true, true])
        )
      })

      it('should get clusters successfully', function () {
        return client.getClusters()
          .then(
            clusters => {
              clusters.sort(sorter)
              clusters.should.eql([
                { cluster: 'test-one', url: 'https://hikaru.test-one.io' },
                { cluster: 'prod-one', url: 'https://hikaru.prod-one.io', channel: 'production' },
                { cluster: 'int-two', url: 'https://hikaru.int-two.io', channel: 'integration' },
                { cluster: 'int-one', url: 'https://hikaru.int-one.io', channel: 'integration' }
              ])
            }
          )
      })

      it('should get clusters by channel', function () {
        return client.getClustersByChannel('integration')
          .then(
            clusters => {
              clusters.sort(sorter)
              clusters.should.eql([
                { cluster: 'int-two', url: 'https://hikaru.int-two.io', channel: 'integration' },
                { cluster: 'int-one', url: 'https://hikaru.int-one.io', channel: 'integration' }
              ])
            }
          )
      })

      describe('when getting all workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_INT_1)
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
          nock(HIKARU_INT_2)
            .get('/api/workload/test/image:tag')
            .reply(200, [
              {
                namespace: 'namespace',
                type: 'deployment',
                service: 'test-3',
                image: 'test/image:tag',
                container: 'test-3'
              },
              {
                namespace: 'namespace',
                type: 'statefulSet',
                service: 'test-4',
                image: 'test/image:tag',
                container: 'test-4'
              }
            ])
        })

        it('should return the list', function () {
          return client.findWorkloadsOnChannel('integration', 'test/image:tag')
            .then(
              result => {
                return result.should.eql({
                  'int-one': [
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
                  ],
                  'int-two': [
                    {
                      namespace: 'namespace',
                      type: 'deployment',
                      service: 'test-3',
                      image: 'test/image:tag',
                      container: 'test-3'
                    },
                    {
                      namespace: 'namespace',
                      type: 'statefulSet',
                      service: 'test-4',
                      image: 'test/image:tag',
                      container: 'test-4'
                    }
                  ]
                })
              }
            )
        })
      })

      describe('when getting candidates on a channel (successfully)', function () {
        before(function () {
          nock(HIKARU_INT_1)
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
          nock(HIKARU_INT_2)
            .get('/api/image/test/image:tag?filter=owner,version')
            .reply(200, {
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-3',
                  image: 'test/image:tag',
                  container: 'test-3'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-4',
                  image: 'test/image:tag',
                  container: 'test-4'
                }
              ],
              equal: [],
              error: []
            })
        })

        it('should return the set', function () {
          return client.getCandidatesOnChannel('integration', 'test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'int-one': {
                    url: 'https://hikaru.int-one.io',
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
                    ]
                  },
                  'int-two': {
                    url: 'https://hikaru.int-two.io',
                    upgrade: [
                      {
                        namespace: 'namespace',
                        type: 'deployment',
                        service: 'test-3',
                        image: 'test/image:tag',
                        container: 'test-3'
                      }
                    ],
                    obsolete: [
                      {
                        namespace: 'namespace',
                        type: 'statefulSet',
                        service: 'test-4',
                        image: 'test/image:tag',
                        container: 'test-4'
                      }
                    ]
                  }
                })
              }
            )
        })
      })

      describe('when upgrading all workloads (successfully)', function () {
        before(function () {
          nock(HIKARU_INT_1)
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
              error: []
            })
          nock(HIKARU_INT_2)
            .post('/api/image/test/image:tag?filter=owner,version')
            .reply(200, {
              upgrade: [
                {
                  namespace: 'namespace',
                  type: 'deployment',
                  service: 'test-3',
                  image: 'test/image:tag',
                  container: 'test-3'
                }
              ],
              obsolete: [
                {
                  namespace: 'namespace',
                  type: 'statefulSet',
                  service: 'test-4',
                  image: 'test/image:tag',
                  container: 'test-4'
                }
              ],
              equal: [],
              error: []
            })
        })

        it('should return the set', function () {
          return client.upgradeWorkloadsOnChannel('integration', 'test/image:tag', ['owner', 'version'])
            .then(
              result => {
                return result.should.partiallyEql({
                  'int-one': {
                    url: HIKARU_INT_1,
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
                    ]
                  },
                  'int-two': {
                    url: HIKARU_INT_2,
                    upgrade: [
                      {
                        namespace: 'namespace',
                        type: 'deployment',
                        service: 'test-3',
                        image: 'test/image:tag',
                        container: 'test-3'
                      }
                    ],
                    obsolete: [
                      {
                        namespace: 'namespace',
                        type: 'statefulSet',
                        service: 'test-4',
                        image: 'test/image:tag',
                        container: 'test-4'
                      }
                    ]
                  }
                })
              }
            )
        })
      })
    })

    after(async () => {
      nock.cleanAll()
      nock.restore()
      await deftly.service.stop()
      await deftly.clusters.clear()
      await deftly.clusters.close()
    })
  })
})
