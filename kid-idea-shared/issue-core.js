const DEFAULT_LABELS = ['kid-idea', 'needs-parent-review', 'from-idea-box']
const READY_LABELS = ['copilot-ready', 'codex-ready']
const LABEL_COLORS = {
  'kid-idea': 'f4b942',
  'needs-parent-review': '227c6f',
  'from-idea-box': '9ec5fe',
  'new-level': '0e8a16',
  'edit-level': 'fbca04',
  'reward-task': 'c2e0c6',
  'reward-item': 'bfdadc',
  'game-system': 'd4c5f9',
  'world-cat-box': 'f9d0c4',
  'world-cat-scratcher': 'fef2c0',
  'world-yarn-ball': 'c5def5',
  'tutorial-level': 'ffdf5d',
  'copilot-ready': '8957e5',
  'codex-ready': '0969da',
}

const TASK_TABS = {
  'new-level': '新建关卡',
  'edit-level': '编辑关卡',
  'reward-task': '新建任务',
  'reward-item': '奖励品',
  'game-system': '游戏系统',
}

const WORLD_LABELS = {
  'cat-box': '猫箱子',
  'cat-scratcher': '猫抓板',
  'yarn-ball': '毛线球',
}

const WORLD_LABELS_EN = {
  'cat-box': 'Cat Box',
  'cat-scratcher': 'Cat Scratcher',
  'yarn-ball': 'Yarn Time',
}

const REQUIRED_FIELDS = {
  'new-level': [
    'gameWorld',
    'levelKind',
    'levelGoal',
    'mechanics',
    'difficulty',
    'routeRequirement',
    'instructionCopy',
  ],
  'edit-level': [
    'gameWorld',
    'targetLevel',
    'changeType',
    'currentProblem',
    'desiredChange',
  ],
  'reward-task': ['rewardTaskType', 'completionCondition', 'rewardContent', 'releaseState'],
  'reward-item': ['rewardOperation', 'rewardItemType', 'rewardName', 'appearance', 'unlockMethod'],
  'game-system': ['systemType'],
}

function cleanText(value, maxLength) {
  var text = String(value || '').replace(/\r\n/g, '\n').trim()
  if (maxLength && text.length > maxLength) return text.slice(0, maxLength).trim()
  return text
}

function requireEnv(name) {
  var value = process.env[name]
  if (!value) throw new Error('Missing ' + name)
  return value
}

function getConfig() {
  return {
    owner: requireEnv('GITHUB_OWNER'),
    repo: requireEnv('GITHUB_REPO'),
    token: requireEnv('GITHUB_TOKEN'),
    uploadBranch: process.env.KID_IDEA_UPLOAD_BRANCH || 'develop',
    uploadPath: process.env.KID_IDEA_UPLOAD_PATH || 'kid-idea-uploads',
    labels: (process.env.KID_IDEA_LABELS || DEFAULT_LABELS.join(','))
      .split(',')
      .map(function (label) { return label.trim() })
      .filter(Boolean),
  }
}

async function github(path, options) {
  var config = getConfig()
  var res = await fetch('https://api.github.com/repos/' + config.owner + '/' + config.repo + path, {
    ...(options || {}),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + config.token,
      'Content-Type': 'application/json',
      'User-Agent': 'drag-up-kid-idea-box',
      'X-GitHub-Api-Version': '2022-11-28',
      ...((options && options.headers) || {}),
    },
  })
  var text = await res.text()
  var data = text ? JSON.parse(text) : null
  if (!res.ok) {
    var error = new Error(data && data.message ? data.message : 'GitHub API ' + res.status)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

async function ensureLabels(labels) {
  var usableLabels = []
  for (var i = 0; i < labels.length; i++) {
    var name = labels[i]
    try {
      await github('/labels/' + encodeURIComponent(name))
      usableLabels.push(name)
    } catch (error) {
      if (error.status !== 404) continue
      try {
        await github('/labels', {
          method: 'POST',
          body: JSON.stringify({
            name: name,
            color: LABEL_COLORS[name] || 'd9e0ea',
            description: 'Created by Drag Up kid idea box',
          }),
        })
        usableLabels.push(name)
      } catch (_) {
        // Creating the issue without labels is better than rejecting the idea.
      }
    }
  }
  return usableLabels
}

function validImageDataUrl(value) {
  var image = String(value || '').trim()
  if (!image) return ''
  if (image.length > 100000) return ''
  if (!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)) return ''
  return image
}

function imageInfoFromDataUrl(imageDataUrl) {
  var match = String(imageDataUrl || '').match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/i)
  if (!match) return null
  var format = match[1].toLowerCase().replace('jpeg', 'jpg')
  return {
    extension: format === 'jpg' ? 'jpg' : format,
    base64: match[2],
  }
}

function encodePathForUrl(path) {
  return path.split('/').map(function (segment) { return encodeURIComponent(segment) }).join('/')
}

function compactSlug(value) {
  return cleanText(value, 48)
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '')
    .slice(0, 24) || 'kid'
}

async function uploadIdeaImage(childName, imageDataUrl) {
  var image = imageInfoFromDataUrl(validImageDataUrl(imageDataUrl))
  if (!image) return { url: '', error: '' }

  try {
    var config = getConfig()
    var now = new Date()
    var datePath = now.toISOString().slice(0, 10)
    var stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
    var random = Math.random().toString(36).slice(2, 8)
    var filename = stamp + '-' + compactSlug(childName) + '-' + random + '.' + image.extension
    var path = config.uploadPath.replace(/^\/+|\/+$/g, '') + '/' + datePath + '/' + filename

    await github('/contents/' + encodePathForUrl(path), {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Add kid idea image ' + filename,
        content: image.base64,
        branch: config.uploadBranch,
      }),
    })

    return {
      url: 'https://github.com/' + config.owner + '/' + config.repo + '/raw/' + encodeURIComponent(config.uploadBranch) + '/' + encodePathForUrl(path),
      error: '',
    }
  } catch (error) {
    return { url: '', error: error.message || 'Image upload failed' }
  }
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.map(function (item) { return cleanText(item, 80) }).filter(Boolean)
  }
  var text = cleanText(value, 400)
  return text ? [text] : []
}

function normalizePayload(payload) {
  var raw = payload || {}
  var fields = raw.fields && typeof raw.fields === 'object' ? raw.fields : {}
  return {
    childName: cleanText(raw.childName, 40),
    taskTab: cleanText(raw.taskTab, 40),
    title: cleanText(raw.title, 80),
    reason: cleanText(raw.reason, 500),
    playtestFocus: cleanText(raw.playtestFocus, 500),
    fields: fields,
    imageDataUrl: validImageDataUrl(raw.imageDataUrl),
  }
}

function fieldText(fields, name, maxLength) {
  return cleanText(fields[name], maxLength || 500)
}

function validatePayload(payload) {
  var item = normalizePayload(payload)
  if (!item.childName) return { ok: false, error: '请先写名字。', payload: item }
  if (!TASK_TABS[item.taskTab]) return { ok: false, error: '请选择任务类型。', payload: item }
  if (!item.title) return { ok: false, error: '请写一个简短标题。', payload: item }
  if (!item.reason) return { ok: false, error: '请写一下为什么想要这个。', payload: item }
  if (!item.playtestFocus) return { ok: false, error: '请写一下试玩重点。', payload: item }

  var fields = item.fields || {}
  var required = REQUIRED_FIELDS[item.taskTab] || []
  for (var i = 0; i < required.length; i++) {
    var name = required[i]
    if (name === 'mechanics') {
      if (!ensureArray(fields.mechanics).length && !fieldText(fields, 'mechanicsOther')) {
        return { ok: false, error: '请至少写一个机制。', payload: item }
      }
    } else if (!fieldText(fields, name)) {
      return { ok: false, error: '还有必填内容没写完。', payload: item }
    }
  }

  if (item.taskTab === 'new-level') {
    if (fields.levelKind === 'tutorial' && !fieldText(fields, 'teachingMechanism')) {
      return { ok: false, error: '教学关必须写新增或第一次教学的机制。', payload: item }
    }
    if (fields.levelKind === 'challenge' && !fieldText(fields, 'challengePoint')) {
      return { ok: false, error: '挑战关必须写主要挑战点。', payload: item }
    }
  }

  if (item.taskTab === 'reward-item' && fields.rewardItemType === 'sticker') {
    if (!fieldText(fields, 'stickerWorld') || !fieldText(fields, 'stickerLevel') || !fieldText(fields, 'stickerCamera')) {
      return { ok: false, error: '贴图需要填写所属世界、触发关卡和相机/彩蛋位置。', payload: item }
    }
  }

  return { ok: true, payload: item }
}

function titleFromPayload(payload) {
  var fields = payload.fields || {}
  var world = fields.gameWorld ? '[' + (WORLD_LABELS[fields.gameWorld] || fields.gameWorld) + '] ' : ''
  return 'Kid idea: ' + world + TASK_TABS[payload.taskTab] + ' - ' + payload.title
}

function line(label, value) {
  var text = Array.isArray(value) ? value.filter(Boolean).join(', ') : cleanText(value)
  return text ? '- ' + label + ': ' + text : ''
}

function section(title, lines) {
  var body = lines.filter(Boolean)
  if (!body.length) body = ['- 未填写']
  return ['## ' + title, '', ...body, '']
}

function yesNo(value) {
  if (value === true || value === 'true' || value === 'yes') return '是'
  if (value === false || value === 'false' || value === 'no') return '否'
  return cleanText(value)
}

function structuredLines(payload) {
  var f = payload.fields || {}
  if (payload.taskTab === 'new-level') {
    return [
      line('游戏世界', WORLD_LABELS[f.gameWorld] || f.gameWorld),
      line('关卡类型', f.levelKind === 'tutorial' ? '教学关' : '挑战关'),
      line('教学机制', f.teachingMechanism),
      line('挑战点', f.challengePoint),
      line('目标', f.levelGoal),
      line('机制', ensureArray(f.mechanics).concat(fieldText(f, 'mechanicsOther'))),
      line('难度', f.difficulty),
      line('路线要求', f.routeRequirement),
      line('关卡说明文案', f.instructionCopy),
      line('Yarn Time 多层', yesNo(f.yarnMultiLayer)),
      line('Yarn Time 约束', f.gameWorld === 'yarn-ball' ? '保持左下到右上，maxX <= 16，验证连通和可通关。' : ''),
    ]
  }
  if (payload.taskTab === 'edit-level') {
    return [
      line('游戏世界', WORLD_LABELS[f.gameWorld] || f.gameWorld),
      line('目标关卡', f.targetLevel),
      line('修改类型', f.changeType),
      line('现在的问题', f.currentProblem),
      line('想怎么改', f.desiredChange),
      line('不要改变', f.keepUnchanged),
    ]
  }
  if (payload.taskTab === 'reward-task') {
    return [
      line('任务类型', f.rewardTaskType),
      line('完成条件', f.completionCondition),
      line('奖励内容', f.rewardContent),
      line('是否立刻开放', f.releaseState),
    ]
  }
  if (payload.taskTab === 'reward-item') {
    return [
      line('操作', f.rewardOperation),
      line('奖励品类型', f.rewardItemType),
      line('名字', f.rewardName),
      line('外观描述', f.appearance),
      line('解锁方式', f.unlockMethod),
      line('成功动画或效果', f.successEffect),
      line('贴图所属世界', WORLD_LABELS[f.stickerWorld] || f.stickerWorld),
      line('贴图触发关卡', f.stickerLevel),
      line('相机/彩蛋位置', f.stickerCamera),
    ]
  }
  return [
    line('系统类型', f.systemType),
    line('使用场景', f.entryPoint),
    line('玩家能做什么', f.playerAction),
    line('数据保存', f.dataStorage),
    line('风险提示', '涉及云函数、隐私、账号、支付、发布的部分必须成人审核。'),
  ]
}

function acceptanceCriteria(payload) {
  if (payload.taskTab === 'new-level') {
    return [
      '- 新关卡能进入并能完成。',
      '- 关卡说明文案出现在正确位置，且小朋友能理解。',
      '- PR 描述包含 New Levels 表和新增关卡截图。',
      '- 如果是教学关，只教学一个新增或第一次教学的机制。',
    ]
  }
  if (payload.taskTab === 'edit-level') {
    return [
      '- 只修改目标关卡相关内容。',
      '- 保留“不改变的地方”。',
      '- PR 描述包含 Before / After 截图表。',
    ]
  }
  if (payload.taskTab === 'reward-task') {
    return [
      '- 任务在奖励任务列表中显示。',
      '- 完成条件、未完成、可领取或已领取状态正确。',
      '- PR 描述包含任务列表和领取状态截图。',
    ]
  }
  if (payload.taskTab === 'reward-item') {
    return [
      '- 奖励品能在对应列表中看到。',
      '- 预览、试穿或贴图展示正确。',
      '- 解锁方式和领取状态正确。',
      '- PR 描述包含奖励列表、预览和解锁/领取状态截图。',
    ]
  }
  return [
    '- 系统入口清楚，主要交互可用。',
    '- 空状态、错误状态或未授权状态有明确反馈。',
    '- 涉及云函数、隐私、账号、支付、发布时标出成人审核风险。',
    '- PR 描述包含入口、主要状态、空/错误状态截图。',
  ]
}

function prEvidence(payload) {
  var map = {
    'new-level': [
      '- 新增关卡截图。',
      '- 通关或关键路径截图。',
      '- New Levels Markdown 表。',
    ],
    'edit-level': [
      '- Before / After 两列表格。',
      '- 修改前截图或手动补拍说明。',
      '- 修改后截图。',
    ],
    'reward-task': [
      '- 奖励任务列表截图。',
      '- 任务未完成、可领取或已领取状态截图。',
    ],
    'reward-item': [
      '- 奖励列表截图。',
      '- 试穿/预览截图。',
      '- 解锁或领取状态截图。',
    ],
    'game-system': [
      '- 系统入口截图。',
      '- 主要交互状态截图。',
      '- 空状态或错误状态截图。',
    ],
  }
  return (map[payload.taskTab] || []).concat([
    '- 如果 agent 环境无法截图，必须写明需要人工补拍的具体页面和状态。',
  ])
}

function agentInstructions(payload) {
  var instructions = [
    '- Follow `COLLABORATION-GUIDE.md`.',
    '- Keep the PR focused on this single issue.',
    '- Follow `docs/kid-idea-agent-output.md` for PR evidence.',
    '- Run `npm run build:minigame` before finishing.',
    '- Do not publish a production release.',
    '- Do not edit secrets, account settings, private keys, or payment settings.',
  ]
  if (payload.taskTab === 'new-level' && payload.fields && payload.fields.gameWorld === 'yarn-ball') {
    instructions.push('- For Yarn Time, keep maps left-bottom to right-top, maxX <= 16, and validate reachability/connectivity.')
  }
  return instructions
}

function issueBody(payload, imageResult) {
  imageResult = imageResult || {}
  var picture = []
  if (imageResult.url) {
    picture = ['![Kid idea picture](' + imageResult.url + ')']
  } else if (imageResult.error) {
    picture = ['- 图片上传失败: ' + imageResult.error]
  }

  return [
    ...section('Kid', [
      line('名字', payload.childName),
      line('为什么想要这个', payload.reason),
    ]),
    ...section('Task Type', [
      line('类型', TASK_TABS[payload.taskTab]),
    ]),
    ...section('Structured Request', structuredLines(payload)),
    ...section('Acceptance Criteria', acceptanceCriteria(payload)),
    ...section('Required PR Evidence', prEvidence(payload)),
    ...section('Picture', picture),
    ...section('Playtest Focus', [
      '- ' + payload.playtestFocus,
    ]),
    ...section('Agent Instructions', agentInstructions(payload)),
  ].join('\n')
}

function labelsForPayload(payload) {
  var labels = [payload.taskTab]
  var fields = payload.fields || {}
  var world = fields.gameWorld || fields.stickerWorld
  if (world && WORLD_LABELS[world]) labels.push('world-' + world)
  if (payload.taskTab === 'new-level' && fields.levelKind === 'tutorial') labels.push('tutorial-level')
  return labels
}

function compactIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels: (issue.labels || []).map(function (label) { return label.name }),
  }
}

async function listIssues(state) {
  var config = getConfig()
  var data = await github(
    '/issues?state=' + encodeURIComponent(state || 'all') +
      '&labels=' + encodeURIComponent(config.labels[0]) +
      '&per_page=20&sort=updated&direction=desc'
  )
  return data.filter(function (issue) { return !issue.pull_request }).map(compactIssue)
}

async function createIssue(payload) {
  var validation = validatePayload(payload)
  if (!validation.ok) {
    var error = new Error(validation.error)
    error.status = 400
    throw error
  }
  var normalized = validation.payload
  var config = getConfig()
  await ensureLabels(READY_LABELS)
  var usableLabels = await ensureLabels(config.labels.concat(labelsForPayload(normalized)))
  var imageResult = await uploadIdeaImage(normalized.childName, normalized.imageDataUrl)
  var issue = await github('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: titleFromPayload(normalized),
      body: issueBody(normalized, imageResult),
      labels: usableLabels,
    }),
  })
  return compactIssue(issue)
}

module.exports = {
  TASK_TABS,
  WORLD_LABELS,
  WORLD_LABELS_EN,
  createIssue,
  listIssues,
  validatePayload,
  issueBody,
  titleFromPayload,
}
