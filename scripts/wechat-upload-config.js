const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const MODES = {
  'mp-weixin': {
    label: 'WeChat Mini Program',
    type: 'miniProgram',
    buildScript: 'build:mp-weixin',
    projectPath: path.join(ROOT, 'dist/build/mp-weixin'),
  },
  minigame: {
    label: 'WeChat Mini Game',
    type: 'miniGame',
    buildScript: 'build:minigame',
    projectPath: path.join(ROOT, 'dist/build/minigame'),
  },
}

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return {}
  const env = {}
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach(function (line) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match) return
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (value && !env[match[1]]) env[match[1]] = value
    })
  return env
}

function findLocalAppId() {
  const fromEnv = process.env.WX_APPID || process.env.WECHAT_APPID
  if (fromEnv && fromEnv.trim()) return { appid: fromEnv.trim(), source: 'env' }

  const dotEnv = loadDotEnv()
  const fromDotEnv = dotEnv.WX_APPID || dotEnv.WECHAT_APPID
  if (fromDotEnv && fromDotEnv.trim()) return { appid: fromDotEnv.trim(), source: '.env' }

  try {
    const keyFile = fs.readdirSync(ROOT).find(function (name) {
      return /^private\..+\.key$/.test(name)
    })
    if (keyFile) {
      return {
        appid: keyFile.slice('private.'.length, -'.key'.length),
        source: 'local private key file name',
      }
    }
  } catch (err) {
    // Fall through to the missing-env error below.
  }

  return { appid: '', source: '' }
}

function getMode(input, fallback) {
  const mode = input || fallback
  const config = MODES[mode]
  if (!config) {
    throw new Error(`Unknown upload mode "${mode}". Available modes: ${Object.keys(MODES).join(', ')}`)
  }
  return { mode, config }
}

function normalizePrivateKey(content) {
  return content.replace(/\\n/g, '\n').trim() + '\n'
}

function resolvePrivateKeyPath(options) {
  const explicitPath = process.env.WX_PRIVATE_KEY_PATH || process.env.WECHAT_PRIVATE_KEY_PATH
  if (explicitPath && explicitPath.trim()) {
    return path.resolve(ROOT, explicitPath.trim())
  }
  return path.join(ROOT, `private.${options.appid}.key`)
}

function preparePrivateKey(options) {
  const keyFromEnv = process.env.WX_PRIVATE_KEY || process.env.WECHAT_PRIVATE_KEY
  if (keyFromEnv && keyFromEnv.trim()) {
    const keyPath = path.join(os.tmpdir(), `wechat-ci-${process.pid}-${Date.now()}.key`)
    fs.writeFileSync(keyPath, normalizePrivateKey(keyFromEnv), 'utf8')
    return { privateKeyPath: keyPath, cleanup: () => safeUnlink(keyPath), source: 'WX_PRIVATE_KEY' }
  }

  const privateKeyPath = resolvePrivateKeyPath(options)
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(
      `Private key not found: ${privateKeyPath}. Set WX_PRIVATE_KEY for CI or WX_PRIVATE_KEY_PATH for a local key file.`,
    )
  }
  return { privateKeyPath, cleanup: () => {}, source: 'local file' }
}

function loadUploadConfig(options) {
  const { mode, config } = getMode(options.mode, options.defaultMode || 'minigame')
  const { appid, source: appidSource } = findLocalAppId()
  if (!appid) {
    throw new Error(
      'Missing required env WX_APPID. Set it in GitHub Actions secrets, your local shell, or your local .env file before uploading.',
    )
  }
  const key = preparePrivateKey({ appid })

  return {
    appid,
    appidSource,
    mode,
    label: config.label,
    type: config.type,
    buildScript: config.buildScript,
    projectPath: config.projectPath,
    privateKeyPath: key.privateKeyPath,
    privateKeySource: key.source,
    cleanupPrivateKey: key.cleanup,
  }
}

function assertProjectExists(config) {
  if (fs.existsSync(config.projectPath)) return
  throw new Error(`Build output not found: ${config.projectPath}. Run "npm run ${config.buildScript}" first.`)
}

function formatError(err) {
  if (!err) return 'Unknown error'
  const parts = []
  if (err.message) parts.push(err.message)
  if (err.code) parts.push(`code=${err.code}`)
  if (err.errCode) parts.push(`errCode=${err.errCode}`)
  if (err.errMsg) parts.push(`errMsg=${err.errMsg}`)
  if (err.stack && process.env.CI) parts.push(err.stack)
  return parts.join('\n')
}

function printObject(label, value) {
  console.log(label)
  console.log(JSON.stringify(value, null, 2))
}

function createUploadProgressLogger(prefix) {
  let started = false
  let lastPercent = -1
  let lastStatus = ''

  return function onProgressUpdate(info) {
    if (!info || !info.status) return

    if (info.status === 'doing') {
      const done = Number(info.data && info.data.done)
      const total = Number(info.data && info.data.total)

      if (!started) {
        console.log(`${prefix} Upload started`)
        started = true
      }

      if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return

      const percent = Math.max(0, Math.min(100, Math.floor((done / total) * 100)))
      const bucket = percent === 100 ? 100 : Math.floor(percent / 10) * 10
      if (bucket > lastPercent) {
        console.log(`${prefix} Upload progress ${bucket}% (${done}/${total})`)
        lastPercent = bucket
      }
      return
    }

    if (info.status === 'done') {
      return
    }

    if (info.status !== lastStatus) {
      console.log(`${prefix} Status: ${info.status}`)
      lastStatus = info.status
    }
  }
}

function printUploadResult(prefix, result) {
  console.log(`${prefix} Upload succeeded`)

  const fullPackage = result && result.subPackageInfo && result.subPackageInfo.__FULL__
  if (fullPackage && fullPackage.size) {
    console.log(`${prefix} Package size: ${formatBytes(fullPackage.size)}`)
  }

  if (process.env.CI_UPLOAD_DEBUG === '1') {
    printObject(`${prefix} Full miniprogram-ci response:`, result)
  }
}

function formatBytes(value) {
  const bytes = Number(value)
  if (!Number.isFinite(bytes)) return String(value)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function safeUnlink(file) {
  try {
    fs.unlinkSync(file)
  } catch (err) {
    // Temp-key cleanup is best-effort.
  }
}

module.exports = {
  assertProjectExists,
  createUploadProgressLogger,
  formatError,
  loadUploadConfig,
  printObject,
  printUploadResult,
}
