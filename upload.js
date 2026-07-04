const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')

const APPID = 'wxcdf46c8da7dacd7a'
const PROJECT_PATH = path.resolve(__dirname, 'dist/build/mp-weixin')
const PRIVATE_KEY_PATH = path.resolve(__dirname, 'private.wxcdf46c8da7dacd7a.key')

const version = process.argv[2] || '1.0.0'
const desc = process.argv[3] || '自动上传'

if (!fs.existsSync(PROJECT_PATH)) {
  console.error(`错误: 构建产物目录不存在 (${PROJECT_PATH})`)
  console.error('请先执行 npm run build:mp-weixin')
  process.exit(1)
}

if (!fs.existsSync(PRIVATE_KEY_PATH)) {
  console.error(`错误: 私钥文件不存在 (${PRIVATE_KEY_PATH})`)
  process.exit(1)
}

async function upload() {
  const project = new ci.Project({
    appid: APPID,
    type: 'miniProgram',
    projectPath: PROJECT_PATH,
    privateKeyPath: PRIVATE_KEY_PATH,
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
