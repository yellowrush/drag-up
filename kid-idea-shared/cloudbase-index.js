const { createIssue, listIssues } = require('./issue-core')

function response(statusCode, payload, extraHeaders) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(payload),
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
  if (raw.length > 180000) {
    const error = new Error('The idea is too long. Please make it shorter.')
    error.status = 413
    throw error
  }
  return JSON.parse(raw)
}

exports.main = async function main(event = {}, context = {}) {
  const method = getMethod(event, context)
  try {
    if (method === 'OPTIONS') return response(204, {})
    if (method === 'GET') {
      const query = getQuery(event)
      return response(200, { issues: await listIssues(query.state || 'all') })
    }
    if (method === 'POST') {
      return response(201, { issue: await createIssue(parseBody(event)) })
    }
    return response(405, { error: 'Method not allowed' }, { Allow: 'GET, POST' })
  } catch (error) {
    console.error(error)
    return response(error.status || 500, { error: error.message || 'Server error.' })
  }
}
