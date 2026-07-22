/**
 * CI-friendly upload script for WeChat Mini Game / Mini Program.
 *
 * Reads the private key from the WX_PRIVATE_KEY environment variable
 * (set as a GitHub Secret), writes it to a temp file, then uploads
 * using miniprogram-ci.
 *
 * Usage:
 *   WX_PRIVATE_KEY=<key_content> node ci-upload.js [mode] [version] [desc]
 *
 *   mode    - "minigame" (default) or "mp-weixin"
 *   version - defaults to 1.0.<run_number>
 *   desc    - defaults to "CI: <commit_short_hash>"
 */
const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')

const APPID = 'wxcdf46c8da7dacd7a'
const MODE = process.argv[2] || 'minigame'
const version = process.argv[3] || `1.0.${process.env.GITHUB_RUN_NUMBER || '0'}`
const desc = process.argv[4] || (process.env.GITHUB_SHA ? `CI: ${process.env.GITHUB_SHA.slice(0, 7)}` : 'CI auto upload')

const CONFIGS = {
  'mp-weixin': {
    type: 'miniProgram',
    projectPath: path.resolve(__dirname, 'dist/build/mp-weixin'),
  },
  'minigame': {
    type: 'miniGame',
    projectPath: path.resolve(__dirname, 'dist/build/minigame'),
  },
}

const config = CONFIGS[MODE]
if (!config) {
  console.error(`Unknown mode: ${MODE}. Available: ${Object.keys(CONFIGS).join(', ')}`)
  process.exit(1)
}

// Write private key from environment variable
const keyContent = process.env.WX_PRIVATE_KEY
if (!keyContent) {
  console.error('WX_PRIVATE_KEY environment variable is not set')
  console.error('Set it as a GitHub Secret: repo Settings > Secrets and variables > Actions')
  process.exit(1)
}

const keyPath = path.resolve(__dirname, 'private.wxcdf46c8da7dacd7a.key')
fs.writeFileSync(keyPath, keyContent, 'utf-8')

if (!fs.existsSync(config.projectPath)) {
  console.error(`Build output not found: ${config.projectPath}`)
  console.error(`Run "npm run build:${MODE}" first`)
  process.exit(1)
}

async function upload() {
  console.log(`Uploading ${MODE} to WeChat...`)
  console.log(`  Version: ${version}`)
  console.log(`  Desc: ${desc}`)

  const project = new ci.Project({
    appid: APPID,
    type: config.type,
    projectPath: config.projectPath,
    privateKeyPath: keyPath,
  })

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
        console.log(`  Uploading... ${done}/${total}`)
      }
    },
  })

  console.log('Upload success!', result)

  // Clean up key file
  try { fs.unlinkSync(keyPath) } catch (e) { /* ignore */ }
}

upload().catch(err => {
  console.error('Upload failed:', err)
  // Clean up key file even on failure
  try { fs.unlinkSync(keyPath) } catch (e) { /* ignore */ }
  process.exit(1)
})
