const ui = require('cliui')({
  width: 80
})

function build () {
  return {
    channel: {
      alias: 'c',
      describe: 'limit results to a particular release channel'
    }
  }
}

function handle (comhub, log, argv) {
  const {channel} = argv

  const get = channel
    ? comhub.getClustersOnChannel(channel)
    : comhub.getClusters()

  get.then(
    list => {
      if (list.length > 0) {
        ui.div(
          {
            text: 'NAME',
            padding: [0, 1, 0, 1]
          },
          {
            text: 'URL',
            padding: [0, 1, 0, 0]
          }
        )
        list.forEach(x => {
          ui.div(
            {
              text: x.cluster,
              padding: [0, 1, 0, 1]
            },
            {
              text: x.url,
              padding: [0, 1, 0, 0]
            }
          )
        })
        console.log(ui.toString())
      } else {
        log.warn('no clusters were returned from the server')
      }
    },
    err => log.error(`failed to get cluster list with: ${err.stack}`)
  )
}

module.exports = function (comhub, log) {
  return {
    command: 'list clusters',
    desc: 'list clusters in the storage backend',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
