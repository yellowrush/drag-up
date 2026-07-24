const { createIssue, listIssues } = require('./issue-core')

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readBody(req, maxLength) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > maxLength) {
      const error = new Error('The idea is too long. Please make it shorter.')
      error.status = 413
      throw error
    }
  }
  return raw ? JSON.parse(raw) : {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'GET') {
      const query = new URL(req.url, 'http://localhost').searchParams
      json(res, 200, { issues: await listIssues(query.get('state') || 'all') })
      return
    }
    if (req.method === 'POST') {
      const issue = await createIssue(await readBody(req, 180000))
      json(res, 201, { issue })
      return
    }
    res.setHeader('Allow', 'GET, POST')
    json(res, 405, { error: 'Method not allowed' })
  } catch (error) {
    console.error(error)
    json(res, error.status || 500, { error: error.message || 'Server error.' })
  }
}
