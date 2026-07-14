const cloudbase = require('@cloudbase/node-sdk')

const app = cloudbase.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'drag-meow-d8ggfohez51d8d1d7',
})
const db = app.database()
const _ = db.command
const COLLECTION = 'leaderboard_scores'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 10

function normalizeLimit(limit) {
  const value = Math.round(Number(limit) || DEFAULT_LIMIT)
  return Math.max(1, Math.min(MAX_LIMIT, value))
}

function publicRow(row, rank, openid) {
  return {
    rank,
    totalScore: Number(row.totalScore) || 0,
    completedCount: Number(row.completedCount) || 0,
    nickname: row.nickname || '\u533f\u540d\u73a9\u5bb6',
    avatarUrl: row.avatarUrl || '',
    isSelf: row.openid === openid,
  }
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
    totalScore: _.gt(totalScore),
  })
  const sameScoreMoreLevels = await countWhere(collection, {
    totalScore,
    completedCount: _.gt(completedCount),
  })
  let sameScoreSameLevelsEarlier = 0
  if (updatedAt) {
    sameScoreSameLevelsEarlier = await countWhere(collection, {
      totalScore,
      completedCount,
      updatedAt: _.lt(updatedAt),
    })
  }
  return betterScore + sameScoreMoreLevels + sameScoreSameLevelsEarlier + 1
}

exports.main = async function (event, context) {
  const openid = getOpenId(context)
  const limit = normalizeLimit(event.limit)
  const collection = db.collection(COLLECTION)

  const topRes = await collection
    .orderBy('totalScore', 'desc')
    .orderBy('completedCount', 'desc')
    .orderBy('updatedAt', 'asc')
    .limit(limit)
    .get()

  const rows = (topRes.data || []).map(function (row, index) {
    return publicRow(row, index + 1, openid)
  })

  let self = null
  if (openid) {
    const selfRes = await collection.where({ openid }).limit(1).get()
    const selfDoc = selfRes.data && selfRes.data[0]
    if (selfDoc) {
      const rank = await getSelfRank(collection, selfDoc)
      self = publicRow(selfDoc, rank, openid)
    }
  }

  return {
    ok: true,
    rows,
    self,
  }
}
