const { each } = require('fauxdash')
const ui = require('cliui')({
  width: 140
})
function build () {
  return {
    image: {
      alias: 'i',
      describe: 'image description (docker image spec)',
      demandOption: true
    },
    channel: {
      alias: 'c',
      describe: 'limit results to a particular release channel'
    }
  }
}

async function handle (comhub, log, argv) {
  const {image, channel} = argv
  let results
  try {
    if (channel) {
      results = await comhub.findWorkloadsOnChannel(channel, image)
    } else {
      results = await comhub.findWorkloadsOnAll(image)
    }
  } catch (err) {
    log.error(`failed find workloads across all clusters ${channel && `on channel ${channel}`} with: ${err.stack}`)
  }

  if (Object.keys(results).length === 0) {
    log.warn(`no clusters have been registered - no results found'`)
    return
  }
  let failed = []
  ui.div(
    {
      text: 'CLUSTER',
      padding: [0, 1, 0, 0],
      width: 16
    },
    {
      text: 'NAMESPACE',
      padding: [0, 1, 0, 0],
      width: 12
    },
    {
      text: 'WORKLOAD NAME',
      padding: [0, 1, 0, 0],
      width: 30
    },
    {
      text: 'TYPE',
      padding: [0, 1, 0, 0],
      width: 14
    },
    {
      text: 'DOCKER IMAGE',
      padding: [0, 1, 0, 0]
    }
  )
  each(results, (list, cluster) => {
    if (list.failed) {
      failed.push(cluster)
    } else {
      list.forEach(x => {
        ui.div(
          {
            text: cluster,
            padding: [0, 1, 0, 0],
            width: 16
          },
          {
            text: x.namespace,
            padding: [0, 1, 0, 0],
            width: 12
          },
          {
            text: x.service,
            padding: [0, 1, 0, 0],
            width: 30
          },
          {
            text: x.type,
            padding: [0, 1, 0, 0],
            width: 14
          },
          {
            text: x.image,
            padding: [0, 1, 0, 0]
          }
        )
      })
    }
  })
  console.log(ui.toString())
  if (failed.length > 0) {
    console.log(`failed to find matches on the following clusters due to errors: ${failed.join(', ')}`)
  }
}

module.exports = function (comhub, log) {
  return {
    command: 'find-all [options]',
    desc: 'finds workloads with images that match the criteria provided across all clusters',
    builder: build(),
    handler: handle.bind(null, comhub, log)
  }
}
