const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'cloudbase-d9gr8r6jkb1656853',
})
const db = app.database()
const COLLECTION = 'leaderboard_scores'
const SCORE_SCHEMA_VERSION = 2
const MAX_LEVEL_SCORE = 10
const MIN_LEVEL_SCORE = 1
const MAX_LEVEL_ID_LENGTH = 48
const DEFAULT_PLAYER_NAME = '\u5fae\u4fe1\u73a9\u5bb6'
let collectionReady = false

async function ensureCollection() {
  if (collectionReady || typeof db.createCollection !== 'function') return
  try {
    await db.createCollection(COLLECTION)
  } catch (err) {
    const message = String((err && (err.message || err.errMsg || err.code)) || err || '')
    if (!/exist|already/i.test(message)) {
      console.warn('create collection skipped:', message)
    }
  }
  collectionReady = true
}

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

function pickOpenId(source) {
  if (!source || typeof source !== 'object') return ''
  const userInfo = source.userInfo || source.UserInfo || {}
  return (
    source.WX_OPENID ||
    source.OPENID ||
    source.openid ||
    source.openId ||
    source.wxOpenId ||
    userInfo.WX_OPENID ||
    userInfo.OPENID ||
    userInfo.openid ||
    userInfo.openId ||
    userInfo.wxOpenId ||
    ''
  )
}

function getOpenId(event, context) {
  const wxContext =
    typeof cloudbase.getWXContext === 'function' ? cloudbase.getWXContext() : {}
  const auth = typeof app.auth === 'function' ? app.auth() : null
  const userInfo =
    auth && typeof auth.getUserInfo === 'function' ? auth.getUserInfo() : {}
  return (
    pickOpenId(wxContext) ||
    pickOpenId(userInfo) ||
    pickOpenId(event) ||
    pickOpenId(context) ||
    ''
  )
}

function getPlayerIdentity(event, context) {
  const openid = getOpenId(event, context)
  if (!openid) return null
  return {
    openid,
    playerKey: `openid:${openid}`,
  }
}

async function findFirst(collection, condition) {
  try {
    const res = await collection.where(condition).limit(1).get()
    return res.data && res.data[0]
  } catch (err) {
    console.warn('find leaderboard player skipped:', condition, err && (err.message || err.errMsg || err))
    return null
  }
}

async function findExistingPlayer(collection, identity) {
  let existing = await findFirst(collection, { playerKey: identity.playerKey })
  if (!existing && identity.openid) {
    existing = await findFirst(collection, { openid: identity.openid })
  }
  if (!existing) {
    existing = await findFirst(collection, { 'data.playerKey': identity.playerKey })
  }
  if (!existing && identity.openid) {
    existing = await findFirst(collection, { 'data.openid': identity.openid })
  }
  return existing
}

exports.main = async function (event, context) {
  event = event || {}
  const identity = getPlayerIdentity(event, context)
  if (!identity) {
    console.warn('leaderboard sync missing openid', {
      eventKeys: Object.keys(event || {}),
      contextKeys: Object.keys(context || {}),
      hasEventUserInfo: !!(event && event.userInfo),
    })
    return { ok: false, reason: 'missing-openid' }
  }

  try {
    const incomingRaw = event.scores || event.levelScores
    const incomingScores = normalizeScores(incomingRaw)
    const nickname = sanitizeText(event.nickname, 24)
    const avatarUrl = sanitizeText(event.avatarUrl, 300)
    if (event.authorized !== true || (!nickname && !avatarUrl)) {
      return { ok: false, reason: 'profile-required' }
    }
    await ensureCollection()
    const collection = db.collection(COLLECTION)

    const existing = await findExistingPlayer(collection, identity)
    const existingData = existing && existing.data
    const storedScores = mergeScoreMaps(
      mergeScoreMaps(
        normalizeScores(existing && existing.levelScores),
        normalizeScores(existingData && existingData.levelScores),
      ),
      mergeScoreMaps(
        normalizeScores(existing && existing.scores),
        normalizeScores(existingData && existingData.scores),
      ),
    )
    const scoreMap = mergeScoreMaps(storedScores, incomingScores)
    const summary = summarize(scoreMap)
    const now = db.serverDate()

    const data = {
      schemaVersion: SCORE_SCHEMA_VERSION,
      authorized: true,
      playerKey: identity.playerKey,
      openid: identity.openid,
      scores: toScoreArray(scoreMap),
      totalScore: summary.totalScore,
      completedCount: summary.completedCount,
      updatedAt: now,
    }
    data.nickname = nickname || DEFAULT_PLAYER_NAME
    if (avatarUrl) data.avatarUrl = avatarUrl

    let docId = existing && existing._id
    if (existing) {
      await collection.doc(existing._id).update(data)
    } else {
      const addResult = await collection.add({
        ...data,
        avatarUrl: avatarUrl || '',
        createdAt: now,
      })
      docId = addResult && (addResult.id || (addResult.ids && addResult.ids[0]))
    }

    return {
      ok: true,
      totalScore: summary.totalScore,
      completedCount: summary.completedCount,
      scoreCount: data.scores.length,
      updatedExisting: !!existing,
      docId: docId || '',
      openidTail: String(identity.openid || '').slice(-6),
    }
  } catch (err) {
    const message = String((err && (err.message || err.errMsg || err.code)) || err || '')
    console.error('syncLeaderboardScore write failed:', message)
    return {
      ok: false,
      reason: 'db-write-failed',
      errMsg: message,
    }
  }
}
