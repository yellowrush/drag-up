const DEFAULT_LABELS = ['kid-idea', 'needs-parent-review', 'from-idea-box']
const LABEL_COLORS = {
  'kid-idea': 'f4b942',
  'needs-parent-review': '227c6f',
  'from-idea-box': '9ec5fe',
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

function getConfig() {
  return {
    owner: requireEnv('GITHUB_OWNER'),
    repo: requireEnv('GITHUB_REPO'),
    token: requireEnv('GITHUB_TOKEN'),
    labels: (process.env.KID_IDEA_LABELS || DEFAULT_LABELS.join(','))
      .split(',')
      .map(label => label.trim())
      .filter(Boolean),
  }
}

async function github(path, options = {}) {
  const config = getConfig()
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'drag-up-kid-idea-box',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data && data.message ? data.message : `GitHub API ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

async function ensureLabels(labels) {
  const usableLabels = []
  for (const name of labels) {
    try {
      await github(`/labels/${encodeURIComponent(name)}`)
      usableLabels.push(name)
    } catch (error) {
      if (error.status !== 404) continue
      try {
        await github('/labels', {
          method: 'POST',
          body: JSON.stringify({
            name,
            color: LABEL_COLORS[name] || 'd9e0ea',
            description: 'Created by Drag Up kid idea box',
          }),
        })
        usableLabels.push(name)
      } catch (_) {
        // Creating the issue without labels is better than rejecting the kid's idea.
      }
    }
  }
  return usableLabels
}

function classifyIdea(idea) {
  const text = idea.toLowerCase()
  if (/文案|文字|提示|名字|说明|按钮/.test(text)) return '文案'
  if (/玩法|机制|移动|旋转|奖励|猫爪|平台|道具/.test(text)) return '玩法想法'
  if (/关卡|第\s*\d+\s*关|地图|难|简单|通关|路线/.test(text)) return '关卡'
  return '想法'
}

function titleFromIdea(idea) {
  const compact = idea.replace(/\s+/g, ' ').trim()
  const shortTitle = compact.length > 32 ? `${compact.slice(0, 32)}...` : compact
  return `小朋友想法：${shortTitle}`
}

function issueBody(idea, playtest) {
  const type = classifyIdea(idea)
  return [
    '## 小朋友原始想法',
    '',
    idea,
    '',
    '## 自动提取',
    '',
    `- 任务类型：${type}`,
    '- 来源：小朋友想法箱',
    '- 默认流程：维护者审核后，再交给 Codex/Copilot 生成 PR',
    '',
    '## 试玩重点',
    '',
    playtest || '请试玩时看看是否更好玩、是否能通关、有没有看不懂的地方。',
    '',
    '## 安全提醒',
    '',
    '- 不直接发布正式版。',
    '- 不修改密钥、账号、云函数部署或隐私配置。',
    '- 需要维护者确认后再添加 `codex-ready` 或 `copilot-ready` 标签。',
  ].join('\n')
}

function compactIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels: (issue.labels || []).map(label => label.name),
  }
}

async function listIssues(req, res) {
  const { labels } = getConfig()
  const query = new URL(req.url, 'http://localhost').searchParams
  const state = query.get('state') || 'all'
  const data = await github(
    `/issues?state=${encodeURIComponent(state)}&labels=${encodeURIComponent(labels[0])}&per_page=20&sort=updated&direction=desc`
  )
  json(res, 200, { issues: data.filter(issue => !issue.pull_request).map(compactIssue) })
}

async function createIssue(req, res) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 10000) {
      json(res, 413, { error: '内容太长了，请少写一点。' })
      return
    }
  }

  const payload = raw ? JSON.parse(raw) : {}
  const idea = String(payload.idea || '').trim()
  const playtest = String(payload.playtest || '').trim()

  if (idea.length < 6) {
    json(res, 400, { error: '想法至少需要 6 个字。' })
    return
  }

  const { labels } = getConfig()
  const usableLabels = await ensureLabels(labels)
  const issue = await github('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: titleFromIdea(idea),
      body: issueBody(idea, playtest),
      labels: usableLabels,
    }),
  })

  json(res, 201, { issue: compactIssue(issue) })
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    if (req.method === 'GET') {
      await listIssues(req, res)
      return
    }
    if (req.method === 'POST') {
      await createIssue(req, res)
      return
    }
    res.setHeader('Allow', 'GET, POST')
    json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    json(res, error.status || 500, { error: error.message || '服务器开小差了。' })
  }
}
