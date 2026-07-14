const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'cloudbase-d9gr8r6jkb1656853',
})
const db = app.database()
const _ = db.command
const COLLECTION = 'leaderboard_scores'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 10
const CLEANUP_LIMIT = 100
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

function normalizeLimit(limit) {
  const value = Math.round(Number(limit) || DEFAULT_LIMIT)
  return Math.max(1, Math.min(MAX_LIMIT, value))
}

function publicRow(row, rank, identity) {
  return {
    rank,
    totalScore: Number(row.totalScore) || 0,
    completedCount: Number(row.completedCount) || 0,
    nickname: row.nickname || DEFAULT_PLAYER_NAME,
    avatarUrl: row.avatarUrl || '',
    isSelf: !!(
      identity &&
      (
        row.playerKey === identity.playerKey ||
        (identity.openid && row.openid === identity.openid)
      )
    ),
  }
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

async function findSelfDoc(collection, identity) {
  if (!identity) return null
  let selfRes = await collection
    .where({ playerKey: identity.playerKey, authorized: true })
    .limit(1)
    .get()
  let selfDoc = selfRes.data && selfRes.data[0]
  if (!selfDoc && identity.openid) {
    selfRes = await collection
      .where({ openid: identity.openid, authorized: true })
      .limit(1)
      .get()
    selfDoc = selfRes.data && selfRes.data[0]
  }
  return selfDoc
}

function isAnonymousRow(row) {
  const nickname = String(row.nickname || '')
  return (
    row.authorized !== true ||
    !row.openid ||
    String(row.playerKey || '').indexOf('client:') === 0 ||
    nickname === '\u533f\u540d\u73a9\u5bb6' ||
    nickname === '\u672c\u5730\u73a9\u5bb6'
  )
}

async function cleanupAnonymousRows(collection) {
  try {
    const res = await collection
      .where({ authorized: _.neq(true) })
      .limit(CLEANUP_LIMIT)
      .get()
    const rows = (res.data || []).filter(isAnonymousRow)
    await Promise.all(rows.map(function (row) {
      return collection.doc(row._id).remove().catch(function (err) {
        console.warn('remove anonymous leaderboard row failed:', row._id, err)
      })
    }))
  } catch (err) {
    console.warn('cleanup anonymous leaderboard rows skipped:', err)
  }
}

async function countWhere(collection, condition) {
  const res = await collection.where(condition).count()
  return Number(res.total) || 0
}

async function getSelfRank(collection, self) {
  if (!self) return null
  const totalScore = Number(self.totalScore) || 0
  const completedCount = Number(self.completedCount) || 0
  const updatedAt = self.updatedAt
  const betterScore = await countWhere(collection, {
    authorized: true,
    totalScore: _.gt(totalScore),
  })
  const sameScoreMoreLevels = await countWhere(collection, {
    authorized: true,
    totalScore,
    completedCount: _.gt(completedCount),
  })
  let sameScoreSameLevelsEarlier = 0
  if (updatedAt) {
    sameScoreSameLevelsEarlier = await countWhere(collection, {
      authorized: true,
      totalScore,
      completedCount,
      updatedAt: _.lt(updatedAt),
    })
  }
  return betterScore + sameScoreMoreLevels + sameScoreSameLevelsEarlier + 1
}

exports.main = async function (event, context) {
  event = event || {}
  try {
    const identity = getPlayerIdentity(event, context)
    const limit = normalizeLimit(event.limit)
    await ensureCollection()
    const collection = db.collection(COLLECTION)
    await cleanupAnonymousRows(collection)

    const topRes = await collection
      .where({ authorized: true })
      .orderBy('totalScore', 'desc')
      .orderBy('completedCount', 'desc')
      .orderBy('updatedAt', 'asc')
      .limit(limit)
      .get()

    const rows = (topRes.data || []).map(function (row, index) {
      return publicRow(row, index + 1, identity)
    })

    let self = null
    const selfDoc = await findSelfDoc(collection, identity)
    if (selfDoc) {
      const rank = await getSelfRank(collection, selfDoc)
      self = publicRow(selfDoc, rank, identity)
    }

    return {
      ok: true,
      rows,
      self,
    }
  } catch (err) {
    const message = String((err && (err.message || err.errMsg || err.code)) || err || '')
    console.error('getLeaderboard read failed:', message)
    return {
      ok: false,
      reason: 'db-read-failed',
      errMsg: message,
      rows: [],
      self: null,
    }
  }
}
