/**
 * CI-friendly upload script for WeChat Mini Game / Mini Program.
 *
 * Reads WX_APPID and WX_PRIVATE_KEY from environment variables
 * (usually GitHub Secrets), writes the key to a temp file, then uploads
 * using miniprogram-ci.
 *
 * Usage:
 *   WX_APPID=<appid> WX_PRIVATE_KEY=<key_content> node ci-upload.js [mode] [version] [desc]
 *
 *   mode    - "minigame" (default) or "mp-weixin"
 *   version - defaults to package.json version
 *   desc    - defaults to "CI: <commit_short_hash>"
 */
const ci = require('miniprogram-ci')
const dns = require('dns')
const { getAppVersion } = require('./scripts/app-version')
const {
  assertProjectExists,
  formatError,
  loadUploadConfig,
  printObject,
} = require('./scripts/wechat-upload-config')

dns.setDefaultResultOrder('ipv4first')

const MODE = process.argv[2] || 'minigame'
const version = process.argv[3] || getAppVersion()
const desc = process.argv[4] || (process.env.GITHUB_SHA ? `CI: ${process.env.GITHUB_SHA.slice(0, 7)}` : 'CI auto upload')

async function upload() {
  const config = loadUploadConfig({ mode: MODE, defaultMode: 'minigame' })
  assertProjectExists(config)

  console.log('[ci-upload] Preparing WeChat upload')
  console.log(`  Mode: ${config.mode} (${config.label})`)
  console.log(`  AppId: ${config.appid}`)
  console.log(`  Project: ${config.projectPath}`)
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
          const done = (info.data && info.data.done) || 0
          const total = (info.data && info.data.total) || '?'
          console.log(`[ci-upload] Progress ${done}/${total}`)
        } else if (info.status) {
          console.log(`[ci-upload] ${info.status}`)
        }
      },
    })

    printObject('[ci-upload] Success response:', result)
  } finally {
    config.cleanupPrivateKey()
  }
}

upload().catch(err => {
  console.error('[ci-upload] Failed')
  console.error(formatError(err))
  process.exit(1)
})
