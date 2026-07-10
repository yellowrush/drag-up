const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')

const APPID = 'wxcdf46c8da7dacd7a'
const MODE = process.argv[2] || 'mp-weixin'
const version = process.argv[3] || '1.0.0'
const desc = process.argv[4] || '自动上传'

const CONFIGS = {
  'mp-weixin': {
    type: 'miniProgram',
    projectPath: path.resolve(__dirname, 'dist/build/mp-weixin'),
    privateKeyPath: path.resolve(__dirname, 'private.wxcdf46c8da7dacd7a.key'),
  },
  'minigame': {
    type: 'miniGame',
    projectPath: path.resolve(__dirname, 'dist/build/minigame'),
    privateKeyPath: path.resolve(__dirname, 'private.wxcdf46c8da7dacd7a.key'),
  },
}

const config = CONFIGS[MODE]
if (!config) {
  console.error(`错误: 未知模式 "${MODE}"，可用模式: ${Object.keys(CONFIGS).join(', ')}`)
  process.exit(1)
}

if (!fs.existsSync(config.projectPath)) {
  console.error(`错误: 构建产物目录不存在 (${config.projectPath})`)
  console.error(`请先执行 npm run build:${MODE}`)
  process.exit(1)
}

if (!fs.existsSync(config.privateKeyPath)) {
  console.error(`错误: 私钥文件不存在 (${config.privateKeyPath})`)
  process.exit(1)
}

async function upload() {
  const project = new ci.Project({
    appid: APPID,
    type: config.type,
    projectPath: config.projectPath,
    privateKeyPath: config.privateKeyPath,
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
        console.log(`上传中... ${info.data?.done || 0}/${info.data?.total || '?'}`)
      }
    },
  })

  console.log('上传成功:', result)
}

upload().catch(err => {
  console.error('上传失败:', err)
  process.exit(1)
})
