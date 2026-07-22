const fs = require('fs')

function copyProjectConfigWithEnvAppId(sourcePath, targetPath) {
  const config = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const appid = process.env.WX_APPID || process.env.WECHAT_APPID
  if (appid && appid.trim()) {
    config.appid = appid.trim()
  }
  fs.writeFileSync(targetPath, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

module.exports = {
  copyProjectConfigWithEnvAppId,
}
