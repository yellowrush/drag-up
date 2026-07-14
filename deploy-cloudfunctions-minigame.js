const ci = require('miniprogram-ci')
const path = require('path')
const fs = require('fs')
const dns = require('dns')
const JSZip = require('jszip')
const cloudApiTools = require('miniprogram-ci/dist/ci/cloud/cloudapi')
const cloudAPI = require('miniprogram-ci/dist/common/cloud-api')

dns.setDefaultResultOrder('ipv4first')

const APPID = 'wxcdf46c8da7dacd7a'
const DIST = path.resolve(__dirname, 'dist/build/minigame')
const PRIVATE_KEY = path.resolve(__dirname, 'private.wxcdf46c8da7dacd7a.key')
const CLOUD_CONFIG = path.resolve(__dirname, 'cloudbaserc.json')

const cloudConfig = JSON.parse(fs.readFileSync(CLOUD_CONFIG, 'utf8'))
const envId = process.argv[2] || cloudConfig.envId
const functions = cloudConfig.functions || [
  { name: 'syncLeaderboardScore', runtime: 'Nodejs20.19' },
  { name: 'getLeaderboard', runtime: 'Nodejs20.19' },
]

if (!fs.existsSync(DIST)) {
  console.error('Missing minigame build:', DIST)
  console.error('Run npm run build:minigame first.')
  process.exit(1)
}

if (!fs.existsSync(PRIVATE_KEY)) {
  console.error('Missing private key:', PRIVATE_KEY)
  process.exit(1)
}

async function deploy() {
  const project = new ci.Project({
    appid: APPID,
    type: 'miniGame',
    projectPath: DIST,
    privateKeyPath: PRIVATE_KEY,
  })

  cloudApiTools.initCloudAPI(APPID)
  const envInfo = await getEnvInfo(project)
  const region = envInfo.functions && envInfo.functions[0] && envInfo.functions[0].region
  if (!region) {
    throw new Error(`Missing cloud function region for env ${envId}`)
  }
  const codeSecret = await cloudApiTools.get3rdCloudCodeSecret(project)
  const requestOptions = {
    request: cloudApiTools.boundTransactRequest(project),
    transactType: cloudAPI.TransactType.IDE,
  }

  for (const item of functions) {
    const name = item.name
    const functionPath = path.join(DIST, 'cloudfunctions', name)
    await ensureFunctionExists({
      name,
      runtime: item.runtime || 'Nodejs20.19',
      region,
      codeSecret,
      requestOptions,
      envInfo,
    })
    console.log(`Uploading ${name} to ${envId}...`)
    const result = await ci.cloud.uploadFunction({
      project,
      env: envId,
      name,
      path: functionPath,
      remoteNpmInstall: true,
    })
    console.log(`${name} uploaded:`, result)
  }
}

async function getEnvInfo(project) {
  const res = await cloudAPI.tcbGetEnvironments({}, {
    request: cloudApiTools.boundTransactRequest(project),
    transactType: cloudAPI.TransactType.IDE,
  })
  const envInfo = (res.envList || []).find(item => item.envId === envId)
  if (!envInfo) {
    throw new Error(`Env not found for current appid: ${envId}`)
  }
  return envInfo
}

async function ensureFunctionExists(options) {
  const { name, region, codeSecret, requestOptions } = options
  try {
    await cloudAPI.scfGetFunctionInfo({
      namespace: envId,
      region,
      functionName: name,
      codeSecret,
    }, requestOptions)
    return
  } catch (err) {
    if (err && err.code !== 'ResourceNotFound.Function') {
      throw err
    }
  }

  console.log(`Creating ${name} in ${envId}...`)
  await createFunction(options)
  await waitFunctionActive({ name, region, codeSecret, requestOptions })
}

async function createFunction(options) {
  const { name, runtime, region, codeSecret, requestOptions, envInfo } = options
  const { clsLogsetId, clsTopicId } = getLogServiceProperties(envInfo)
  const zipFile = await createHelloWorldZip()
  await cloudAPI.scfCreateFunction({
    functionName: name,
    code: { zipFile },
    handler: 'index.main',
    description: '',
    memorySize: 256,
    timeout: 10,
    environment: { variables: [] },
    role: 'TCB_QcsRole',
    runtime,
    namespace: envId,
    region,
    stamp: 'MINI_QCBASE',
    installDependency: true,
    codeSecret,
    clsLogsetId,
    clsTopicId,
  }, requestOptions)
}

async function waitFunctionActive(options) {
  const { name, region, codeSecret, requestOptions } = options
  const startedAt = Date.now()
  while (Date.now() - startedAt < 180000) {
    const info = await cloudAPI.scfGetFunctionInfo({
      namespace: envId,
      region,
      functionName: name,
      codeSecret,
    }, requestOptions)
    console.log(`${name} status: ${info.status}`)
    if (info.status === 'Active') return
    if (info.status === 'CreateFailed') {
      throw new Error(`Create function failed: ${info.statusDesc || name}`)
    }
    await sleep(3000)
  }
  throw new Error(`Timeout waiting for ${name} to become Active`)
}

async function createHelloWorldZip() {
  const zip = new JSZip()
  zip.file('index.js', 'exports.main = async function () { return { ok: true } }\n')
  return zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
  })
}

function getLogServiceProperties(envInfo) {
  try {
    const logService = envInfo.logServices[0]
    return {
      clsLogsetId: logService.logsetId,
      clsTopicId: logService.topicId,
    }
  } catch (err) {
    return {
      clsLogsetId: undefined,
      clsTopicId: undefined,
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

deploy().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Cloud function deploy failed:', err)
  process.exit(1)
})
