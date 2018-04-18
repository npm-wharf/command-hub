require('../setup')

const Redis = require('../../src/redis')

describe('redis', function () {
  let redis
  before(function () {
    redis = Redis({
      redisUrl: 'redis://localhost:6379/0'
    })
  })

  it('should add multiple clusters', function () {
    return (Promise.all([
      redis.add('one', 'https://hikaru.one.npme.io'),
      redis.add('two', 'https://hikaru.two.npme.io'),
      redis.add('three', 'https://hikaru.three.npme.io'),
      redis.add('four', 'https://hikaru.four.npme.io'),
      redis.add('five', 'https://hikaru.five.npme.io'),
      redis.add('six', 'https://hikaru.six.npme.io')
    ]))
  })

  it('should get full cluster list', function () {
    return redis.list().should.eventually.eql([
      { cluster: 'one', url: 'https://hikaru.one.npme.io' },
      { cluster: 'two', url: 'https://hikaru.two.npme.io' },
      { cluster: 'three', url: 'https://hikaru.three.npme.io' },
      { cluster: 'four', url: 'https://hikaru.four.npme.io' },
      { cluster: 'five', url: 'https://hikaru.five.npme.io' },
      { cluster: 'six', url: 'https://hikaru.six.npme.io' }
    ])
  })

  it('should get url for existing clusters', function () {
    return redis.get('three').should.eventually.eql('https://hikaru.three.npme.io')
  })

  it('should return null for non-existing clusters', function () {
    return redis.get('seven').should.eventually.eql(null)
  })

  it('should remove clusters correctly', function () {
    return (Promise.all([
      redis.remove('two'),
      redis.remove('four'),
      redis.remove('six')
    ])).then(
      () => {
        return (Promise.all([
          redis.add('one', 'https://hikaru.one.npme.io'),
          redis.add('three', 'https://hikaru.three.npme.io'),
          redis.add('five', 'https://hikaru.five.npme.io')
        ]))
      }
    )
  })

  after(function () {
    return redis.clear()
      .then(() => redis.close())
  })
})
