const ci = require('miniprogram-ci')
const dns = require('dns')
const {
  assertProjectExists,
  formatError,
  loadUploadConfig,
  printObject,
} = require('./scripts/wechat-upload-config')

dns.setDefaultResultOrder('ipv4first')

const MODE = process.argv[2] || 'mp-weixin'
const version = process.argv[3] || require('./scripts/app-version').getAppVersion()
const desc = process.argv[4] || 'Manual upload'

async function upload() {
  const config = loadUploadConfig({ mode: MODE, defaultMode: 'mp-weixin' })
  assertProjectExists(config)

  console.log('[upload] Preparing WeChat upload')
  console.log(`  Mode: ${config.mode} (${config.label})`)
  console.log(`  AppId: ${config.appid}`)
  console.log(`  Project: ${config.projectPath}`)
  console.log(`  Private key: ${config.privateKeySource}`)
  console.log(`  Version: ${version}`)
  console.log(`  Description: ${desc}`)

  const project = new ci.Project({
    appid: config.appid,
    type: config.type,
    projectPath: config.projectPath,
    privateKeyPath: config.privateKeyPath,
  })

  try {
    const result = await ci.upload({
      project,
      version,
      desc,
      setting: {
        es6: true,
        minify: true,
      },
      onProgressUpdate(info) {
        if (info.status === 'doing') {
          const done = info.data && info.data.done ? info.data.done : 0
          const total = info.data && info.data.total ? info.data.total : '?'
          console.log(`[upload] Progress ${done}/${total}`)
        } else if (info.status) {
          console.log(`[upload] ${info.status}`)
        }
      },
    })

    printObject('[upload] Success response:', result)
  } finally {
    config.cleanupPrivateKey()
  }
}

upload().catch(err => {
  console.error('[upload] Failed')
  console.error(formatError(err))
  process.exit(1)
})
