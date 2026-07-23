const DEFAULT_LABELS = ['kid-idea', 'needs-parent-review', 'from-idea-box']
const READY_LABELS = ['copilot-ready', 'codex-ready']
const LABEL_COLORS = {
  'kid-idea': 'f4b942',
  'needs-parent-review': '227c6f',
  'from-idea-box': '9ec5fe',
  'copilot-ready': '8957e5',
  'codex-ready': '0969da',
}

function response(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  }
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
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'drag-up-kid-idea-box-cloudbase',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = data && data.message ? data.message : `GitHub API ${res.status}`
    const error = new Error(message)
    error.status = res.status
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
  if (/copy|text|hint|button|label|name|\u6587\u6848|\u6587\u5b57|\u63d0\u793a|\u540d\u5b57|\u8bf4\u660e|\u6309\u94ae/.test(text)) return 'copy'
  if (/level|map|stage|route|hard|easy|clear|pass|\u5173\u5361|\u5730\u56fe|\u8def\u7ebf|\u96be|\u7b80\u5355|\u901a\u5173|\u65b0\u589e|\u65b0\u52a0|\u52a0\u4e00\u4e2a/.test(text)) return 'level'
  if (/change|modify|before|after|\u4fee\u6539|\u6539\u4e00\u4e0b|\u8c03\u6574|\u53d8\u6210/.test(text)) return 'modification'
  if (/gameplay|mechanic|move|rotate|reward|platform|item|\u73a9\u6cd5|\u673a\u5236|\u79fb\u52a8|\u65cb\u8f6c|\u5956\u52b1|\u5e73\u53f0|\u9053\u5177/.test(text)) return 'gameplay'
  return 'idea'
}

function titleFromIdea(idea, childName) {
  const compact = idea.replace(/\s+/g, ' ').trim()
  const shortTitle = compact.length > 32 ? `${compact.slice(0, 32)}...` : compact
  return `Kid idea from ${childName}: ${shortTitle}`
}

function cleanMarkdownText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim()
}

function validImageDataUrl(value) {
  const image = String(value || '').trim()
  if (!image) return ''
  if (image.length > 50000) return ''
  if (!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)) return ''
  return image
}

function issueBody(childName, idea, playtest, imageDataUrl) {
  const type = classifyIdea(idea)
  const image = validImageDataUrl(imageDataUrl)
  const drawingSection = image
    ? [
        '## Picture',
        '',
        '<img alt="Kid idea drawing" src="' + image + '" />',
        '',
      ]
    : []
  return [
    '## Kid',
    '',
    cleanMarkdownText(childName),
    '',
    '## Kid idea',
    '',
    cleanMarkdownText(idea),
    '',
    ...drawingSection,
    '## Auto summary',
    '',
    `- Task type: ${type}`,
    '- Source: kid idea box',
    '- Default flow: maintainer reviews this issue, then adds `copilot-ready` or `codex-ready`.',
    '',
    '## Playtest focus',
    '',
    cleanMarkdownText(playtest) || 'Check whether it is more fun, understandable, and playable.',
    '',
    '## Agent instructions',
    '',
    '- Follow `COLLABORATION-GUIDE.md`.',
    '- Keep the PR focused on this single issue.',
    '- Prefer small level, copy, or gameplay changes before engine-wide changes.',
    '- Follow `docs/kid-idea-agent-output.md` for PR evidence.',
    '- If this changes an existing level, screen, visual state, copy location, or gameplay behavior, include a side-by-side Before / After comparison in the PR description.',
    '- If this adds levels, include a Markdown table in the PR description with one row per new level.',
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

function getMethod(event, context) {
  return (
    event.httpMethod ||
    event.requestContext?.http?.method ||
    context?.httpContext?.httpMethod ||
    'GET'
  ).toUpperCase()
}

function getQuery(event) {
  return event.queryStringParameters || event.queryString || {}
}

function parseBody(event) {
  if (!event.body) return {}
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body
  if (raw.length > 90000) {
    const error = new Error('The idea is too long. Please make it shorter.')
    error.status = 413
    throw error
  }
  return JSON.parse(raw)
}

async function listIssues(event) {
  const { labels } = getConfig()
  const query = getQuery(event)
  const state = query.state || 'all'
  const data = await github(
    `/issues?state=${encodeURIComponent(state)}&labels=${encodeURIComponent(labels[0])}&per_page=20&sort=updated&direction=desc`
  )
  return response(200, { issues: data.filter(issue => !issue.pull_request).map(compactIssue) })
}

async function createIssue(event) {
  const payload = parseBody(event)
  const childName = String(payload.childName || '').trim()
  const idea = String(payload.idea || '').trim()
  const playtest = String(payload.playtest || '').trim()
  const imageDataUrl = validImageDataUrl(payload.imageDataUrl)

  if (childName.length < 1) {
    return response(400, { error: 'Please write a name.' })
  }
  if (idea.length < 6) {
    return response(400, { error: 'Please write at least 6 characters.' })
  }

  const { labels } = getConfig()
  await ensureLabels(READY_LABELS)
  const usableLabels = await ensureLabels(labels)
  const issue = await github('/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: titleFromIdea(idea, childName),
      body: issueBody(childName, idea, playtest, imageDataUrl),
      labels: usableLabels,
    }),
  })

  return response(201, { issue: compactIssue(issue) })
}

exports.main = async function main(event = {}, context = {}) {
  const method = getMethod(event, context)

  try {
    if (method === 'OPTIONS') {
      return response(204, {})
    }
    if (method === 'GET') {
      return listIssues(event)
    }
    if (method === 'POST') {
      return createIssue(event)
    }
    return response(405, { error: 'Method not allowed' }, { Allow: 'GET, POST' })
  } catch (error) {
    console.error(error)
    return response(error.status || 500, { error: error.message || 'Server error.' })
  }
}
