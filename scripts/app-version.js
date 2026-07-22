const pkg = require('../package.json')

function getAppVersion() {
  return pkg.version
}

function getManifestVersionCode(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version)
  if (!match) {
    throw new Error(`package.json version must be semver-like, got "${version}"`)
  }

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  return String((major * 100) + (minor * 10) + patch)
}

module.exports = {
  getAppVersion,
  getManifestVersionCode,
}
