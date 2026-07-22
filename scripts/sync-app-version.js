const fs = require('fs')
const path = require('path')
const {
  getAppVersion,
  getManifestVersionCode,
} = require('./app-version')

const manifestPath = path.resolve(__dirname, '../src/manifest.json')
const versionName = getAppVersion()
const versionCode = getManifestVersionCode(versionName)
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

manifest.versionName = versionName
manifest.versionCode = versionCode

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

console.log(`[version] package.json version ${versionName} -> src/manifest.json versionCode ${versionCode}`)
