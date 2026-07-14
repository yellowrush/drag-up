const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'drag-meow-d8ggfohez51d8d1d7',
})
const db = app.database()
const _ = db.command
const COLLECTION = 'leaderboard_scores'
const SCORE_SCHEMA_VERSION = 2
const MAX_LEVEL_SCORE = 10
const MIN_LEVEL_SCORE = 1
const MAX_LEVEL_ID_LENGTH = 48

function clampLevelScore(score) {
  const value = Math.round(Number(score) || 0)
  if (value < MIN_LEVEL_SCORE) return 0
  if (value > MAX_LEVEL_SCORE) return MAX_LEVEL_SCORE
  return value
}

function sanitizeLevelId(levelId) {
  return String(levelId || '').trim().slice(0, MAX_LEVEL_ID_LENGTH)
}

function normalizeScores(input) {
  const normalized = {}
  if (!input || typeof input !== 'object') {
    return normalized
  }

  if (Array.isArray(input)) {
    input.forEach(function (item) {
      if (!item || typeof item !== 'object') return
      const levelId = sanitizeLevelId(item.levelId || item.id)
      const score = clampLevelScore(item.score)
      if (levelId && score > 0) {
        normalized[levelId] = Math.max(Number(normalized[levelId]) || 0, score)
      }
    })
    return normalized
  }

  Object.keys(input).forEach(function (levelId) {
    const sanitizedLevelId = sanitizeLevelId(levelId)
    const score = clampLevelScore(input[levelId])
    if (sanitizedLevelId && score > 0) {
      normalized[sanitizedLevelId] = Math.max(
        Number(normalized[sanitizedLevelId]) || 0,
        score,
      )
    }
  })
  return normalized
}

function mergeScoreMaps(existing, incoming) {
  const merged = {}
  Object.keys(existing || {}).forEach(function (levelId) {
    const score = clampLevelScore(existing[levelId])
    if (score > 0) merged[levelId] = score
  })
  Object.keys(incoming || {}).forEach(function (levelId) {
    const score = clampLevelScore(incoming[levelId])
    if (score > 0) {
      merged[levelId] = Math.max(Number(merged[levelId]) || 0, score)
    }
  })
  return merged
}

function levelSort(a, b) {
  const aMatch = String(a).match(/\d+/)
  const bMatch = String(b).match(/\d+/)
  const aNumber = aMatch ? Number(aMatch[0]) : Number.MAX_SAFE_INTEGER
  const bNumber = bMatch ? Number(bMatch[0]) : Number.MAX_SAFE_INTEGER
  if (aNumber !== bNumber) return aNumber - bNumber
  return String(a).localeCompare(String(b))
}

function toScoreArray(scoreMap) {
  return Object.keys(scoreMap || {})
    .sort(levelSort)
    .map(function (levelId) {
      return {
        levelId,
        score: clampLevelScore(scoreMap[levelId]),
      }
    })
    .filter(function (item) {
      return item.levelId && item.score > 0
    })
}

function summarize(scoreMap) {
  const levelIds = Object.keys(scoreMap || {})
  const totalScore = levelIds.reduce(function (total, levelId) {
    return total + clampLevelScore(scoreMap[levelId])
  }, 0)
  return {
    totalScore,
    completedCount: levelIds.length,
  }
}

function sanitizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function getOpenId(context) {
  const wxContext =
    typeof cloudbase.getWXContext === 'function' ? cloudbase.getWXContext() : {}
  const auth = typeof app.auth === 'function' ? app.auth() : null
  const userInfo =
    auth && typeof auth.getUserInfo === 'function' ? auth.getUserInfo() : {}
  return (
    wxContext.OPENID ||
    wxContext.openid ||
    userInfo.openId ||
    userInfo.openid ||
    (context && (context.OPENID || context.openid || context.openId)) ||
    ''
  )
}

exports.main = async function (event, context) {
  const openid = getOpenId(context)
  if (!openid) {
    return { ok: false, reason: 'missing-openid' }
  }

  const incomingRaw = event.scores || event.levelScores
  const incomingScores = normalizeScores(incomingRaw)
  const nickname = sanitizeText(event.nickname, 24)
  const avatarUrl = sanitizeText(event.avatarUrl, 300)
  const collection = db.collection(COLLECTION)

  const existingRes = await collection.where({ openid }).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]
  const storedScores = mergeScoreMaps(
    normalizeScores(existing && existing.levelScores),
    normalizeScores(existing && existing.scores),
  )
  const scoreMap = mergeScoreMaps(storedScores, incomingScores)
  const summary = summarize(scoreMap)
  const now = db.serverDate()

  const data = {
    schemaVersion: SCORE_SCHEMA_VERSION,
    openid,
    scores: toScoreArray(scoreMap),
    totalScore: summary.totalScore,
    completedCount: summary.completedCount,
    updatedAt: now,
  }
  if (nickname) data.nickname = nickname
  if (avatarUrl) data.avatarUrl = avatarUrl

  if (existing) {
    await collection.doc(existing._id).update({
      data: {
        ...data,
        levelScores: _.remove(),
      },
    })
  } else {
    await collection.add({
      data: {
        ...data,
        nickname: nickname || '\u533f\u540d\u73a9\u5bb6',
        avatarUrl: avatarUrl || '',
        createdAt: now,
      },
    })
  }

  return {
    ok: true,
    totalScore: summary.totalScore,
    completedCount: summary.completedCount,
  }
}
