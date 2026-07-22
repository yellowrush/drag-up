const DEFAULT_LABELS = ['kid-idea', 'needs-parent-review', 'from-idea-box']
const READY_LABELS = ['copilot-ready', 'codex-ready']
const LABEL_COLORS = {
  'kid-idea': 'f4b942',
  'needs-parent-review': '227c6f',
  'from-idea-box': '9ec5fe',
  'copilot-ready': '8957e5',
  'codex-ready': '0969da',
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
        // Creating the issue without labels is better than rejecting the idea.
      }
    }
  }
  return usableLabels
}

function classifyIdea(idea) {
  const text = idea.toLowerCase()
  if (/copy|text|hint|button|label|name/.test(text)) return 'copy'
  if (/level|map|stage|route|hard|easy|clear|pass/.test(text)) return 'level'
  if (/gameplay|mechanic|move|rotate|reward|platform|item/.test(text)) return 'gameplay'
  return 'idea'
}

function titleFromIdea(idea) {
  const compact = idea.replace(/\s+/g, ' ').trim()
  const shortTitle = compact.length > 32 ? `${compact.slice(0, 32)}...` : compact
  return `Kid idea: ${shortTitle}`
}

function issueBody(idea, playtest) {
  const type = classifyIdea(idea)
  return [
    '## Kid idea',
    '',
    idea,
    '',
    '## Auto summary',
    '',
    `- Task type: ${type}`,
    '- Source: kid idea box',
    '- Default flow: maintainer reviews this issue, then adds `copilot-ready` or `codex-ready`.',
    '',
    '## Playtest focus',
    '',
    playtest || 'Check whether it is more fun, understandable, and playable.',
    '',
    '## Agent instructions',
    '',
    '- Follow `COLLABORATION-GUIDE.md`.',
    '- Keep the PR focused on this single issue.',
    '- Prefer small level, copy, or gameplay changes before engine-wide changes.',
    '- Run `npm run build:minigame` before finishing.',
    '- Do not publish a production release.',
    '- Do not edit secrets, account settings, cloud-function deployment settings, or private keys.',
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
      json(res, 413, { error: 'The idea is too long. Please make it shorter.' })
      return
    }
  }

  const payload = raw ? JSON.parse(raw) : {}
  const idea = String(payload.idea || '').trim()
  const playtest = String(payload.playtest || '').trim()

  if (idea.length < 6) {
    json(res, 400, { error: 'Please write at least 6 characters.' })
    return
  }

  const { labels } = getConfig()
  await ensureLabels(READY_LABELS)
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
    json(res, error.status || 500, { error: error.message || 'Server error.' })
  }
}
