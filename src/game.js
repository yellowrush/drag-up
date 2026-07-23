import { PlayEngine } from './utils/play-engine.js'
import { renderCubAvatar } from './utils/cub.js'
import { GameStorage } from './utils/storage.js'
import { LEVELS, getNextLevel } from './utils/levels-data.js'
import { RUBIK_SCRATCH_LEVELS, getNextRubikScratchLevel } from './utils/rubik-scratch-levels.js'
import { YARN_TIME_LEVELS, getNextYarnTimeLevel } from './utils/yarn-time-levels.js'
import { LeaderboardClient } from './utils/leaderboard.js'
import {
  ACCESSORIES,
  EXPRESSIONS,
  STICKERS,
  RewardStorage,
  getRewardSourceText,
  isScoreReward,
} from './utils/rewards.js'
import {
  isShareMinigameSupported,
  registerShareMinigame,
  shareMinigame,
} from './utils/share-minigame.js'

var sysInfo = wx.getSystemInfoSync()
var canvas = wx.createCanvas()
var ctx = canvas.getContext('2d')
var dpr = sysInfo.pixelRatio

var W = sysInfo.windowWidth
var H = sysInfo.windowHeight
canvas.width = W * dpr
canvas.height = H * dpr
ctx.scale(dpr, dpr)

var safeArea = sysInfo.safeArea || {}
var SAFE_TOP = safeArea.top || sysInfo.statusBarHeight || 20
var menuBtn = wx.getMenuButtonBoundingClientRect()
var RIGHT_SAFE = menuBtn ? menuBtn.left - 8 : W
var TOP_BAR = 52
var TEXT_H = 28
var HEADER_H = SAFE_TOP + TOP_BAR + TEXT_H

var engine = null
var currentLevelId = ''
var completedLevels = []
var rewardState = RewardStorage.getState()
var showLevelSelect = false
var showScoreModal = false
var showNext = false
var instruction = ''
var activePointer = null
var modalScrollY = 0
var modalTouchId = null
var modalTouchMode = ''
var modalTouchStartX = 0
var modalTouchStartY = 0
var modalScrollStartY = 0
var modalTabScrollX = 0
var modalTabScrollStartX = 0
var scoreScrollY = 0
var scoreScrollStartY = 0
var scoreTaskHint = ''
var activeWorldIndex = 0
var activeRewardTab = 'accessory'
var selectedStickerId = ''
var leaderboardState = {
  status: 'idle',
  rows: [],
  self: null,
  error: '',
  profile: LeaderboardClient.getStoredProfile(),
}
var activeLeaderboardScope = 'friend'
var friendLeaderboardDirty = true
var friendLeaderboardLastRectKey = ''
var friendLeaderboardLastSyncKey = ''
var avatarImageCache = {}
var leaderboardAuthButton = null
var leaderboardAuthButtonKey = ''
var LEADERBOARD_NO_USER_TEXT = '\u6ca1\u6709\u7528\u6237'
var LEADERBOARD_LOAD_FAILED_TEXT = '\u6392\u884c\u699c\u52a0\u8f7d\u5931\u8d25'
var LEADERBOARD_INVALID_ENV_TEXT = '\u4e91\u73af\u5883\u672a\u7ed1\u5b9a\u5f53\u524d\u5c0f\u6e38\u620f'
var LEADERBOARD_FUNCTION_MISSING_TEXT = '\u6392\u884c\u699c\u4e91\u51fd\u6570\u672a\u90e8\u7f72'
var LEADERBOARD_IDENTITY_FAILED_TEXT = '\u65e0\u6cd5\u83b7\u53d6\u5fae\u4fe1\u7528\u6237\u8eab\u4efd'
var LEADERBOARD_PRIVACY_UNDECLARED_TEXT = '\u8bf7\u5148\u914d\u7f6e\u9690\u79c1\u4fdd\u62a4\u6307\u5f15'
var LEADERBOARD_SECURITY_INFO_FAILED_TEXT = '\u672c\u5730\u5f00\u53d1\u8005\u5de5\u5177\u6682\u65e0\u6cd5\u83b7\u53d6\u5b89\u5168\u4fe1\u606f'
var LEADERBOARD_WRITE_FAILED_TEXT = '\u79ef\u5206\u540c\u6b65\u5931\u8d25'
var LEADERBOARD_READ_FAILED_TEXT = '\u6392\u884c\u699c\u8bfb\u53d6\u5931\u8d25'
var LEADERBOARD_SYNC_DELAY = 1200
var LEADERBOARD_SYNC_MIN_INTERVAL = 30000
var leaderboardSyncTimer = null
var leaderboardSyncPending = false
var leaderboardSyncInFlight = false
var leaderboardLastSyncAt = 0

var LEVEL_WORLDS = [
  { id: 'cat-box', label: '\u732b\u7bb1\u5b50', levels: LEVELS, enabled: true },
  { id: 'cat-scratcher', label: '\u732b\u6293\u677f', levels: RUBIK_SCRATCH_LEVELS, enabled: true },
  { id: 'yarn-ball', label: '\u6bdb\u7ebf\u7403', levels: YARN_TIME_LEVELS, enabled: true },
]
registerShareMinigame()
var MODAL_W = 300
var MODAL_COLS = 3
var MODAL_GAP = 8
var MODAL_PAD = 14
var MODAL_TAB_H = 42
var MODAL_TAB_GAP = 8
var MODAL_VISIBLE_TABS = Math.min(3, LEVEL_WORLDS.length)
var MODAL_TAB_W = Math.min(
  106,
  Math.floor((MODAL_W - MODAL_PAD * 2 - MODAL_TAB_GAP * (MODAL_VISIBLE_TABS - 1)) / MODAL_VISIBLE_TABS),
)
var MODAL_CELL_H = 54
var MODAL_CELL_W = (MODAL_W - MODAL_GAP * (MODAL_COLS + 1)) / MODAL_COLS
var MODAL_CONTENT_ROWS = Math.max.apply(null, LEVEL_WORLDS.map(function (world) {
  return Math.ceil((world.levels || []).length / MODAL_COLS)
}))
var MODAL_CONTENT_H = MODAL_CONTENT_ROWS * (MODAL_CELL_H + MODAL_GAP) + MODAL_GAP
var MODAL_INNER_H = MODAL_PAD * 2 + MODAL_TAB_H + MODAL_GAP + MODAL_CONTENT_H
var MODAL_H = Math.min(MODAL_INNER_H, H - HEADER_H - 40)
var SCORE_MODAL_W = 320
var SCORE_MODAL_PAD = 14
var SCORE_MODAL_ROW_H = 58
var SCORE_MODAL_GAP = 8
var SCORE_MODAL_HEADER_H = 96
var SCORE_TRYON_H = 82
var SCORE_TRYON_GAP = 8
var LEADERBOARD_ROW_H = 48
var SCORE_MODAL_CONTENT_H =
  SCORE_MODAL_PAD * 2 +
  SCORE_MODAL_HEADER_H +
  SCORE_TRYON_H +
  SCORE_TRYON_GAP +
  ACCESSORIES.length * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP)
var SCORE_MODAL_MAX_H = Math.min(H - 96, Math.floor(H * 0.74))
if (SCORE_MODAL_MAX_H < 320) SCORE_MODAL_MAX_H = Math.max(280, H - 120)
var SCORE_MODAL_H = Math.min(
  SCORE_MODAL_CONTENT_H,
  SCORE_MODAL_MAX_H,
)

function isInside(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
}

function isInsideRect(x, y, rect) {
  return isInside(x, y, rect.x, rect.y, rect.w, rect.h)
}

function getActiveWorld() {
  return LEVEL_WORLDS[activeWorldIndex] || LEVEL_WORLDS[0]
}

function getActiveWorldLevels() {
  return getActiveWorld().levels || []
}

function getWorldIndexForLevel(levelId) {
  for (var i = 0; i < LEVEL_WORLDS.length; i++) {
    var levels = LEVEL_WORLDS[i].levels || []
    for (var j = 0; j < levels.length; j++) {
      if (levels[j].id === levelId) return i
    }
  }
  return 0
}

function getLevelIndexInWorld(world, levelId) {
  if (!world || !levelId) return -1
  var levels = world.levels || []
  for (var i = 0; i < levels.length; i++) {
    if (levels[i].id === levelId) return i
  }
  return -1
}

function getWorldCurrentLevelText(world) {
  var index = getLevelIndexInWorld(world, currentLevelId)
  return index >= 0 ? '\u7b2c ' + (index + 1) + ' \u5173' : ''
}

function syncActiveWorldForLevel(levelId) {
  activeWorldIndex = getWorldIndexForLevel(levelId)
  modalScrollY = 0
}

function getNextPlayableLevel(levelId) {
  var world = LEVEL_WORLDS[getWorldIndexForLevel(levelId)] || LEVEL_WORLDS[0]
  if (world.id === 'cat-scratcher') {
    return getNextRubikScratchLevel(levelId)
  }
  if (world.id === 'yarn-ball') {
    return getNextYarnTimeLevel(levelId)
  }
  return getNextLevel(levelId)
}

function getModalGridHeight() {
  return MODAL_H - MODAL_PAD * 2 - MODAL_TAB_H - MODAL_GAP
}

function getModalContentHeight() {
  var rows = Math.ceil(getActiveWorldLevels().length / MODAL_COLS)
  return rows * (MODAL_CELL_H + MODAL_GAP) + MODAL_GAP
}

function getModalMaxScroll() {
  return Math.max(0, getModalContentHeight() - getModalGridHeight())
}

function getTabStripRect(mx, my) {
  return {
    x: mx + MODAL_PAD,
    y: my + MODAL_PAD,
    w: MODAL_W - MODAL_PAD * 2,
    h: MODAL_TAB_H,
  }
}

function getModalTabMaxScroll() {
  var totalW = LEVEL_WORLDS.length * MODAL_TAB_W + Math.max(0, LEVEL_WORLDS.length - 1) * MODAL_TAB_GAP
  return Math.max(0, totalW - (MODAL_W - MODAL_PAD * 2))
}

function getWorldTabRect(index, mx, my) {
  var strip = getTabStripRect(mx, my)
  return {
    x: strip.x + index * (MODAL_TAB_W + MODAL_TAB_GAP) - modalTabScrollX,
    y: strip.y,
    w: MODAL_TAB_W,
    h: MODAL_TAB_H,
  }
}

function getModalLevelAt(x, y, mx, my) {
  var gridX = mx + MODAL_GAP
  var gridY = my + MODAL_PAD + MODAL_TAB_H + MODAL_GAP
  var gridW = MODAL_W - MODAL_GAP * 2
  var gridH = getModalGridHeight()
  if (!isInside(x, y, gridX, gridY, gridW, gridH)) return null

  var localX = x - gridX
  var localY = y - gridY + modalScrollY
  var col = Math.floor(localX / (MODAL_CELL_W + MODAL_GAP))
  var row = Math.floor(localY / (MODAL_CELL_H + MODAL_GAP))
  var cellX = col * (MODAL_CELL_W + MODAL_GAP)
  var cellY = row * (MODAL_CELL_H + MODAL_GAP)
  if (col < 0 || col >= MODAL_COLS) return null
  if (localX < cellX || localX > cellX + MODAL_CELL_W) return null
  if (localY < cellY || localY > cellY + MODAL_CELL_H) return null

  var index = row * MODAL_COLS + col
  return getActiveWorldLevels()[index] || null
}

function refreshRewards() {
  var autoSticker = RewardStorage.getStateWithAutoStickers
    ? RewardStorage.getStateWithAutoStickers(getRewardTaskContext())
    : null
  rewardState = autoSticker ? autoSticker.state : RewardStorage.getState()
  if (engine && engine.setEquippedAccessory) {
    engine.setEquippedAccessory(rewardState.equippedAccessoryId || '')
  }
  if (engine && engine.setEquippedExpression) {
    engine.setEquippedExpression(rewardState.equippedExpressionId || '')
  }
}

function applySyncedRewardScores(result) {
  var scores = result && (result.syncedScores || result.scores)
  if (!scores) return
  var merged = RewardStorage.mergeLevelScores(scores)
  if (!merged.changed) return
  rewardState = merged.state
  refreshRewards()
}

function getActiveRewards() {
  if (activeRewardTab === 'sticker') {
    return STICKERS.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        worldId: item.worldId,
        worldName: item.worldName,
        requiredCompleted: item.requiredCompleted,
        description: item.description,
        theme: item.theme,
        palette: item.palette,
        type: 'sticker',
      }
    })
  }
  var source = activeRewardTab === 'expression' ? EXPRESSIONS : ACCESSORIES
  return source.map(function (item) {
    return {
      unlockType: item.unlockType,
      unlockTaskId: item.unlockTaskId,
      id: item.id,
      name: item.name,
      requiredScore: item.requiredScore,
      description: item.description,
      type: activeRewardTab,
    }
  })
}

function isRewardTryOnTab() {
  return activeRewardTab === 'accessory' || activeRewardTab === 'expression'
}

function isRewardOwned(item) {
  if (item.type === 'sticker') {
    return rewardState.ownedStickerIds.indexOf(item.id) !== -1
  }
  return item.type === 'expression'
    ? rewardState.ownedExpressionIds.indexOf(item.id) !== -1
    : rewardState.ownedAccessoryIds.indexOf(item.id) !== -1
}

function isRewardEquipped(item) {
  if (item.type === 'sticker') return false
  return item.type === 'expression'
    ? rewardState.equippedExpressionId === item.id
    : rewardState.equippedAccessoryId === item.id
}

function canUseReward(item) {
  if (item.type === 'sticker') return isRewardOwned(item)
  return isRewardOwned(item) || (isScoreReward(item) && rewardState.totalScore >= item.requiredScore)
}

function rewardActionText(item) {
  if (item.type === 'sticker') return isRewardOwned(item) ? '\u67e5\u770b' : '\u672a\u83b7\u5f97'
  if (isRewardEquipped(item)) return '\u5378\u4e0b'
  if (isRewardOwned(item)) return '\u88c5\u5907'
  if (isScoreReward(item) && rewardState.totalScore >= item.requiredScore) return '\u5151\u6362'
  if (!isScoreReward(item)) return '\u672a\u9886\u53d6'
  return '\u672a\u8fbe\u6210'
}

function rewardStatusText(item) {
  if (item.type === 'sticker') return getStickerStatusText(item)
  if (isRewardEquipped(item)) return '\u5df2\u88c5\u5907'
  if (isRewardOwned(item)) return '\u5df2\u62e5\u6709'
  return getRewardSourceText(item)
}

function getEquippedAccessoryName() {
  var id = rewardState.equippedAccessoryId || ''
  for (var i = 0; i < ACCESSORIES.length; i++) {
    if (ACCESSORIES[i].id === id) return ACCESSORIES[i].name
  }
  return '\u672a\u6234\u9970\u54c1'
}

function getEquippedExpressionName() {
  var id = rewardState.equippedExpressionId || ''
  for (var i = 0; i < EXPRESSIONS.length; i++) {
    if (EXPRESSIONS[i].id === id) return EXPRESSIONS[i].name
  }
  return '\u9ed8\u8ba4\u8868\u60c5'
}

function useReward(item) {
  if (!canUseReward(item)) return
  if (item.type === 'sticker') {
    selectedStickerId = item.id
    scoreScrollY = 0
    return
  }
  if (isRewardEquipped(item)) {
    var unequipped = item.type === 'expression'
      ? RewardStorage.equipExpression('')
      : RewardStorage.equipAccessory('')
    rewardState = unequipped.state
    refreshRewards()
    return
  }
  if (!isRewardOwned(item)) {
    var redeemed = item.type === 'expression'
      ? RewardStorage.redeemExpression(item.id)
      : RewardStorage.redeemAccessory(item.id)
    rewardState = redeemed.state
    if (!redeemed.ok) return
  }
  var equipped = item.type === 'expression'
    ? RewardStorage.equipExpression(item.id)
    : RewardStorage.equipAccessory(item.id)
  rewardState = equipped.state
  refreshRewards()
}

function getRewardTaskContext() {
  return {
    completedLevels: completedLevels,
    levelWorlds: LEVEL_WORLDS,
    canShareMinigame: isShareMinigameSupported(),
  }
}

function getWorldCompletedCount(worldId) {
  var world = LEVEL_WORLDS.find(function (item) {
    return item.id === worldId
  })
  var levels = world && Array.isArray(world.levels) ? world.levels : []
  return levels.reduce(function (total, level) {
    return total + (completedLevels.indexOf(level.id) !== -1 ? 1 : 0)
  }, 0)
}

function getStickerStatusText(sticker) {
  if (isRewardOwned(sticker)) return '\u5df2\u83b7\u5f97'
  return Math.min(getWorldCompletedCount(sticker.worldId), sticker.requiredCompleted) + '/' + sticker.requiredCompleted + ' \u5173'
}

function getRewardTasks() {
  return RewardStorage.getTaskStates(getRewardTaskContext())
}

function useRewardTask(task) {
  if (!task || !task.canTap) return
  scoreTaskHint = ''
  if (task.action === 'claim') {
    var claimed = RewardStorage.claimTaskReward(task.id, getRewardTaskContext())
    rewardState = claimed.state
    refreshRewards()
    return
  }
  if (task.action === 'share') {
    if (!isShareMinigameSupported()) {
      scoreTaskHint = '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u5206\u4eab'
      return
    }
    shareMinigame({
      success: function () {
        var result = RewardStorage.completeShareMinigame()
        rewardState = result.state
        scoreTaskHint = '\u5206\u4eab\u5b8c\u6210\uff0c\u5df2\u9886\u53d6\u597d\u53cb\u7231\u5fc3'
        refreshRewards()
      },
      fail: function () {
        scoreTaskHint = '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u5206\u4eab'
      },
    })
  }
}

function syncLeaderboardInBackground() {
  if (!LeaderboardClient.isSupported() && !LeaderboardClient.isFriendLeaderboardSupported()) return
  leaderboardSyncPending = true
  var elapsed = Date.now() - leaderboardLastSyncAt
  var wait = Math.max(LEADERBOARD_SYNC_DELAY, LEADERBOARD_SYNC_MIN_INTERVAL - elapsed)
  if (leaderboardSyncTimer) return
  leaderboardSyncTimer = setTimeout(runQueuedLeaderboardSync, wait)
}

function runQueuedLeaderboardSync() {
  leaderboardSyncTimer = null
  if (!leaderboardSyncPending || leaderboardSyncInFlight) return
  leaderboardSyncPending = false
  leaderboardSyncInFlight = true
  leaderboardLastSyncAt = Date.now()
  LeaderboardClient.syncFriendScore(rewardState.levelScores || {}).catch(function () {
    return null
  }).then(function () {
    friendLeaderboardDirty = true
    if (!LeaderboardClient.isSupported() || !leaderboardState.profile) return null
    return LeaderboardClient.syncScore(
      rewardState.levelScores || {},
      leaderboardState.profile,
    )
  }).then(function (result) {
    applySyncedRewardScores(result)
  }).catch(function () {}).then(function () {
    leaderboardSyncInFlight = false
    if (leaderboardSyncPending) {
      syncLeaderboardInBackground()
    }
  })
}

function logLeaderboardUi(message, detail) {
  if (typeof console === 'undefined' || typeof console.log !== 'function') return
  console.log('[leaderboard-ui] ' + message, detail || '')
}

function getLeaderboardErrorText(reason) {
  if (reason === 'invalid-env') return LEADERBOARD_INVALID_ENV_TEXT
  if (reason === 'function-not-found') return LEADERBOARD_FUNCTION_MISSING_TEXT
  if (reason === 'missing-openid') return LEADERBOARD_IDENTITY_FAILED_TEXT
  if (reason === 'privacy-undeclared' || reason === 'privacy-required') return LEADERBOARD_PRIVACY_UNDECLARED_TEXT
  if (reason === 'security-info-failed') return LEADERBOARD_SECURITY_INFO_FAILED_TEXT
  if (reason === 'db-write-failed') return LEADERBOARD_WRITE_FAILED_TEXT
  if (reason === 'db-read-failed') return LEADERBOARD_READ_FAILED_TEXT
  return LEADERBOARD_LOAD_FAILED_TEXT
}

function renderFriendLeaderboard(rect) {
  if (!rect || !LeaderboardClient.isFriendLeaderboardSupported()) return
  var rectKey = [
    Math.round(rect.w),
    Math.round(rect.h),
    rewardState.totalScore || 0,
    rewardState.levelScores ? Object.keys(rewardState.levelScores).length : 0,
  ].join(':')
  if (
    !friendLeaderboardDirty &&
    friendLeaderboardLastRectKey === rectKey
  ) {
    return
  }
  LeaderboardClient.renderFriendLeaderboard({
    width: rect.w,
    height: rect.h,
    dpr: dpr,
    levelScores: rewardState.levelScores || {},
  })
  friendLeaderboardDirty = false
  friendLeaderboardLastRectKey = rectKey
  if (friendLeaderboardLastSyncKey !== rectKey) {
    friendLeaderboardLastSyncKey = rectKey
    LeaderboardClient.syncFriendScore(rewardState.levelScores || {}).catch(function () {
      return null
    })
  }
}

function hideFriendLeaderboard() {
  friendLeaderboardDirty = true
  friendLeaderboardLastRectKey = ''
  friendLeaderboardLastSyncKey = ''
  if (LeaderboardClient.hideFriendLeaderboard) {
    LeaderboardClient.hideFriendLeaderboard()
  }
}

function loadLeaderboard() {
  refreshRewards()
  if (activeLeaderboardScope === 'friend') {
    friendLeaderboardDirty = true
    return
  }
  logLeaderboardUi('load leaderboard', {
    hasProfile: !!leaderboardState.profile,
    localTotalScore: rewardState.totalScore || 0,
    localLevelCount: rewardState.levelScores ? Object.keys(rewardState.levelScores).length : 0,
  })
  if (!LeaderboardClient.isSupported()) {
    leaderboardState.status = 'unavailable'
    leaderboardState.rows = []
    leaderboardState.self = null
    leaderboardState.error = ''
    return
  }
  leaderboardState.status = 'loading'
  leaderboardState.error = ''
  if (leaderboardSyncTimer) {
    clearTimeout(leaderboardSyncTimer)
    leaderboardSyncTimer = null
  }
  leaderboardSyncPending = false
  LeaderboardClient.refreshProfileFromCache().then(function (profileResult) {
    if (profileResult && profileResult.profile) {
      leaderboardState.profile = profileResult.profile
    }
    return LeaderboardClient.syncAndFetch(rewardState.levelScores || {}, {
      profile: leaderboardState.profile,
      limit: 10,
    })
  }).then(function (result) {
    if (result && result.ok === false) {
      leaderboardState.rows = []
      leaderboardState.self = null
      leaderboardState.error = getLeaderboardErrorText(result.reason)
      leaderboardState.status = 'error'
      scoreScrollY = 0
      return
    }
    applySyncedRewardScores(result)
    leaderboardState.rows = result.rows || []
    leaderboardState.self = result.self || null
    leaderboardState.status = 'ready'
    leaderboardLastSyncAt = Date.now()
    scoreScrollY = 0
  }).catch(function (err) {
    leaderboardState.rows = []
    leaderboardState.self = null
    leaderboardState.error = getLeaderboardErrorText(err && err.reason)
    leaderboardState.status = 'error'
    scoreScrollY = 0
  })
}

function authorizeLeaderboard() {
  if (!LeaderboardClient.isSupported()) return
  logLeaderboardUi('authorize/update tapped', {
    hadProfile: !!leaderboardState.profile,
    localTotalScore: rewardState.totalScore || 0,
  })
  leaderboardState.status = 'loading'
  leaderboardState.error = ''
  LeaderboardClient.requestProfile().then(function (result) {
    if (!result.ok) {
      leaderboardState.profile = LeaderboardClient.getStoredProfile()
      if (result.reason === 'privacy-undeclared' || result.reason === 'privacy-required') {
        leaderboardState.rows = []
        leaderboardState.self = null
        leaderboardState.error = getLeaderboardErrorText(result.reason)
        leaderboardState.status = 'error'
        return
      }
      loadLeaderboard()
      return
    }
    leaderboardState.profile = result.profile
    loadLeaderboard()
  })
}

function setActiveRewardTab(tab) {
  activeRewardTab = tab
  scoreScrollY = 0
  scoreTaskHint = ''
  selectedStickerId = ''
  if (tab !== 'leaderboard') {
    hideFriendLeaderboard()
    destroyLeaderboardAuthButton()
  }
  if (tab === 'leaderboard') {
    activeLeaderboardScope = activeLeaderboardScope || 'friend'
    if (activeLeaderboardScope === 'friend') {
      friendLeaderboardDirty = true
    } else {
      loadLeaderboard()
    }
  }
}

function setActiveLeaderboardScope(scope) {
  activeLeaderboardScope = scope === 'server' ? 'server' : 'friend'
  scoreScrollY = 0
  if (activeLeaderboardScope === 'friend') {
    friendLeaderboardDirty = true
  } else {
    hideFriendLeaderboard()
    loadLeaderboard()
  }
}

function destroyLeaderboardAuthButton() {
  if (leaderboardAuthButton && typeof leaderboardAuthButton.destroy === 'function') {
    leaderboardAuthButton.destroy()
  }
  leaderboardAuthButton = null
  leaderboardAuthButtonKey = ''
}

function syncLeaderboardAuthButton() {
  // Use the canvas tap handler to call wx.getUserProfile directly. Some
  // experience-build runtimes do not return userInfo from createUserInfoButton.
  destroyLeaderboardAuthButton()
}

function getLeaderboardAuthText() {
  return leaderboardState.profile ? '\u66f4\u65b0' : '\u6388\u6743'
}

function getLeaderboardProfileName() {
  return leaderboardState.profile && leaderboardState.profile.nickname
    ? leaderboardState.profile.nickname
    : LEADERBOARD_NO_USER_TEXT
}

function getLeaderboardProfileAvatar() {
  return leaderboardState.profile && leaderboardState.profile.avatarUrl
    ? leaderboardState.profile.avatarUrl
    : ''
}

function drawRoundRect(r, x, y, w, h, radius) {
  r.beginPath()
  r.moveTo(x + radius, y)
  r.lineTo(x + w - radius, y)
  r.arcTo(x + w, y, x + w, y + radius, radius)
  r.lineTo(x + w, y + h - radius)
  r.arcTo(x + w, y + h, x + w - radius, y + h, radius)
  r.lineTo(x + radius, y + h)
  r.arcTo(x, y + h, x, y + h - radius, radius)
  r.lineTo(x, y + radius)
  r.arcTo(x, y, x + radius, y, radius)
  r.closePath()
}

function init() {
  completedLevels = GameStorage.getCompletedLevels()
  rewardState = RewardStorage.getState()
  engine = new PlayEngine(canvas, ctx)
  engine.setupCanvas(W, H - HEADER_H)
  engine.canvasLeft = 0
  engine.canvasTop = 0
  engine.loadCurrentLevel()
  refreshRewards()
  currentLevelId = engine.maze.id
  instruction = engine.maze.instruction || ''
  syncActiveWorldForLevel(currentLevelId)
  engine.onLevelComplete = function (stats) {
    showNext = true
    GameStorage.markLevelCompleted(engine.maze.id)
    var result = RewardStorage.recordLevelResult(engine.maze.id, stats)
    completedLevels = GameStorage.getCompletedLevels()
    refreshRewards()
    if (result.isNewBest) {
      syncLeaderboardInBackground()
    }
  }
  engine.onInstructionChange = function (text) {
    instruction = text
  }
}

function loadLevel(id) {
  engine.loadLevel(id)
  currentLevelId = engine.maze.id
  syncActiveWorldForLevel(currentLevelId)
  instruction = engine.maze.instruction || ''
  showLevelSelect = false
  showScoreModal = false
  hideFriendLeaderboard()
  showNext = false
}

function handleTouchStart(e) {
  var t = e.touches[0]
  var x = t.clientX
  var y = t.clientY

  if (showScoreModal) {
    var smx = (W - SCORE_MODAL_W) / 2
    var smy = (H - SCORE_MODAL_H) / 2
    if (!isInside(x, y, smx, smy, SCORE_MODAL_W, SCORE_MODAL_H)) {
      showScoreModal = false
      hideFriendLeaderboard()
      modalTouchId = null
      modalTouchMode = ''
      return
    }
    modalTouchId = t.identifier
    modalTouchStartX = x
    modalTouchStartY = y
    scoreScrollStartY = scoreScrollY
    modalTouchMode = getScoreTabAt(x, y, smx, smy) ? 'score-tabs' : 'score-list'
    return
  }

  if (showLevelSelect) {
    var mx = (W - MODAL_W) / 2
    var my = (H - MODAL_H) / 2
    if (!isInside(x, y, mx, my, MODAL_W, MODAL_H)) {
      showLevelSelect = false
      return
    }
    modalTouchId = t.identifier
    modalTouchStartX = x
    modalTouchStartY = y
    var tabStrip = getTabStripRect(mx, my)
    if (isInside(x, y, tabStrip.x, tabStrip.y, tabStrip.w, tabStrip.h)) {
      modalTouchMode = 'tabs'
      modalTabScrollStartX = modalTabScrollX
    } else {
      modalTouchMode = 'grid'
      modalScrollStartY = modalScrollY
    }
    return
  }

  if (showNext) {
    var nextW = 160
    var nextH = 48
    var nx = (W - nextW) / 2
    var ny = H - 88
    if (isInside(x, y, nx, ny, nextW, nextH)) {
      var nextId = getNextPlayableLevel(engine.maze.id)
      if (nextId) {
        loadLevel(nextId)
      } else {
        completedLevels = GameStorage.getCompletedLevels()
        syncActiveWorldForLevel(engine.maze.id)
        modalScrollY = 0
        modalTabScrollX = 0
        showLevelSelect = true
      }
      return
    }
  }

  if (y < HEADER_H) {
    var bw = 46
    var bh = 58
    var by = SAFE_TOP + (TOP_BAR - bh) / 2
    var bx = 10
    if (isInside(x, y, bx, by, bw, bh)) {
      if (engine) {
        engine.loadLevel(currentLevelId)
        currentLevelId = engine.maze.id
        syncActiveWorldForLevel(currentLevelId)
        showNext = false
        instruction = engine.maze.instruction || ''
      }
      return
    }
    if (isInside(x, y, bx + bw + 18, by, bw, bh)) {
      completedLevels = GameStorage.getCompletedLevels()
      syncActiveWorldForLevel(currentLevelId)
      modalScrollY = 0
      modalTabScrollX = 0
      showScoreModal = false
      showLevelSelect = true
      return
    }
    if (isInside(x, y, bx + (bw + 18) * 2, by, bw, bh)) {
      refreshRewards()
      showLevelSelect = false
      showScoreModal = true
      if (activeRewardTab === 'leaderboard') {
        if (activeLeaderboardScope === 'friend') {
          friendLeaderboardDirty = true
        } else {
          loadLeaderboard()
        }
      }
      return
    }
    return
  }

  if (activePointer) return
  activePointer = { id: t.identifier }
  engine.handlePointerDown({ x: x, y: y - HEADER_H })
}

wx.onTouchStart(handleTouchStart)

function findTouch(list, id) {
  for (var i = 0; i < list.length; i++) {
    if (list[i].identifier === id) return list[i]
  }
  return null
}

wx.onTouchMove(function (e) {
  if (showScoreModal) {
    var scoreTouch = findTouch(e.touches, modalTouchId)
    if (scoreTouch && modalTouchMode === 'score-list') {
      var smx = (W - SCORE_MODAL_W) / 2
      var smy = (H - SCORE_MODAL_H) / 2
      scoreScrollY = scoreScrollStartY + (modalTouchStartY - scoreTouch.clientY)
      var maxScoreScroll = getScoreMaxScroll(smx, smy)
      if (scoreScrollY < 0) scoreScrollY = 0
      if (scoreScrollY > maxScoreScroll) scoreScrollY = maxScoreScroll
    }
    return
  }
  if (showLevelSelect) {
    var t = findTouch(e.touches, modalTouchId)
    if (t) {
      if (modalTouchMode === 'tabs') {
        modalTabScrollX = modalTabScrollStartX + (modalTouchStartX - t.clientX)
        var maxTabScroll = getModalTabMaxScroll()
        if (modalTabScrollX < 0) modalTabScrollX = 0
        if (modalTabScrollX > maxTabScroll) modalTabScrollX = maxTabScroll
      } else {
        modalScrollY = modalScrollStartY + (modalTouchStartY - t.clientY)
        var maxScroll = getModalMaxScroll()
        if (modalScrollY < 0) modalScrollY = 0
        if (modalScrollY > maxScroll) modalScrollY = maxScroll
      }
    }
    return
  }
  if (showNext) return
  if (!activePointer) return
  var t = e.touches[0]
  engine.handlePointerMove({ x: t.clientX, y: t.clientY - HEADER_H })
})

wx.onTouchEnd(function (e) {
  if (showScoreModal) {
    var st = findTouch(e.changedTouches, modalTouchId)
    if (st && Math.abs(st.clientX - modalTouchStartX) < 8 && Math.abs(st.clientY - modalTouchStartY) < 8) {
      var smx = (W - SCORE_MODAL_W) / 2
      var smy = (H - SCORE_MODAL_H) / 2
      if (modalTouchMode === 'score-tabs') {
        var scoreTab = getScoreTabAt(st.clientX, st.clientY, smx, smy)
        if (scoreTab) {
          setActiveRewardTab(scoreTab)
        }
      } else if (modalTouchMode === 'score-list') {
        if (activeRewardTab === 'leaderboard') {
          var leaderboardScope = getLeaderboardScopeAt(st.clientX, st.clientY, smx, smy)
          if (leaderboardScope) {
            setActiveLeaderboardScope(leaderboardScope)
          } else if (
            activeLeaderboardScope === 'server' &&
            leaderboardState.status === 'error' &&
            isInsideRect(st.clientX, st.clientY, getLeaderboardRetryRect(smx, smy))
          ) {
            loadLeaderboard()
          } else if (
            activeLeaderboardScope === 'server' &&
            !leaderboardAuthButton &&
            isInsideRect(st.clientX, st.clientY, getLeaderboardAuthRect(smx, smy))
          ) {
            authorizeLeaderboard()
          }
          modalTouchId = null
          modalTouchMode = ''
          return
        }
        if (activeRewardTab === 'task') {
          var content = getScoreContentRect(smx, smy)
          var taskTop = content.y + (scoreTaskHint ? 40 : 0)
          var tasks = getRewardTasks()
          for (var ti = 0; ti < tasks.length; ti++) {
            var taskAction = getTaskActionRect(ti, smx, smy, taskTop)
            if (isInside(st.clientX, st.clientY, taskAction.x, taskAction.y, taskAction.w, taskAction.h)) {
              useRewardTask(tasks[ti])
              break
            }
          }
          modalTouchId = null
          modalTouchMode = ''
          return
        }
        if (activeRewardTab === 'sticker' && selectedStickerId) {
          if (isInsideRect(st.clientX, st.clientY, getStickerDetailBackRect(smx, smy))) {
            selectedStickerId = ''
          }
          modalTouchId = null
          modalTouchMode = ''
          return
        }
        var rewards = getActiveRewards()
        for (var ai = 0; ai < rewards.length; ai++) {
          var action = getScoreActionRect(ai, smx, smy)
          if (isInside(st.clientX, st.clientY, action.x, action.y, action.w, action.h)) {
            useReward(rewards[ai])
            break
          }
        }
      }
    }
    modalTouchId = null
    modalTouchMode = ''
    return
  }

  if (showLevelSelect) {
    var t = findTouch(e.changedTouches, modalTouchId)
    if (t && Math.abs(t.clientX - modalTouchStartX) < 8 && Math.abs(t.clientY - modalTouchStartY) < 8) {
      var mx = (W - MODAL_W) / 2
      var my = (H - MODAL_H) / 2
      if (modalTouchMode === 'tabs') {
        for (var i = 0; i < LEVEL_WORLDS.length; i++) {
          var tab = getWorldTabRect(i, mx, my)
          if (isInside(t.clientX, t.clientY, tab.x, tab.y, tab.w, tab.h) && LEVEL_WORLDS[i].enabled !== false) {
            activeWorldIndex = i
            modalScrollY = 0
            break
          }
        }
      } else if (modalTouchMode === 'grid') {
        var level = getModalLevelAt(t.clientX, t.clientY, mx, my)
        if (level) {
          loadLevel(level.id)
        }
      }
    }
    modalTouchId = null
    modalTouchMode = ''
    return
  }
  if (showNext) return
  if (!activePointer) return
  var t = e.changedTouches[0]
  if (t) {
    engine.handlePointerUp({ x: t.clientX, y: t.clientY - HEADER_H })
  } else {
    engine.handlePointerUp({ x: 0, y: 0 })
  }
  activePointer = null
})

function render() {
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.translate(0, HEADER_H)
  engine.update()
  engine.render()
  ctx.restore()
  drawUI()
  syncLeaderboardAuthButton()
}

function drawUI() {
  drawModernUI()
  return;

  ctx.fillStyle = '#2a2a4a'
  ctx.fillRect(0, 0, W, SAFE_TOP)
  ctx.fillStyle = 'rgba(42,42,74,0.95)'
  ctx.fillRect(0, SAFE_TOP, W, TOP_BAR)

  var bw = 76
  var bh = 26
  var by = SAFE_TOP + (TOP_BAR - bh) / 2
  var bx = 10

  ctx.strokeStyle = '#778'
  ctx.lineWidth = 1
  ctx.fillStyle = 'transparent'
  drawRoundRect(ctx, bx, by, bw, bh, 5)
  ctx.stroke()
  ctx.fillStyle = '#eee'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('重置', bx + bw / 2, by + bh / 2)
  ctx.strokeStyle = '#778'
  drawRoundRect(ctx, bx + bw + 6, by, bw, bh, 5)
  ctx.stroke()
  ctx.fillStyle = '#eee'
  ctx.fillText('关卡选择', bx + bw + 6 + bw / 2, by + bh / 2)
  if (instruction) {
    ctx.fillStyle = 'rgba(42,42,74,0.95)'
    ctx.fillRect(0, SAFE_TOP + TOP_BAR, W, TEXT_H)
    ctx.fillStyle = '#dde'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawTopInstructionText(ctx, instruction)
  }
  if (showNext) {
    ctx.fillStyle = '#5c2'
    var nx = (W - 180) / 2
    var ny = H - 80
    drawRoundRect(ctx, nx, ny, 180, 48, 24)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('下一关', W / 2, ny + 24)
  }
  if (showLevelSelect) {
    drawModal()
  }
}

function drawModernUI() {
  ctx.fillStyle = '#2a2a4a'
  ctx.fillRect(0, 0, W, SAFE_TOP)
  ctx.fillStyle = 'rgba(42,42,74,0.95)'
  ctx.fillRect(0, SAFE_TOP, W, TOP_BAR)

  var bw = 46
  var bh = 58
  var by = SAFE_TOP + (TOP_BAR - bh) / 2
  var bx = 10
  drawRetryButton(ctx, bx, by)
  drawLevelButton(ctx, bx + bw + 18, by)
  drawScoreButton(ctx, bx + (bw + 18) * 2, by)

  if (instruction) {
    ctx.fillStyle = 'rgba(42,42,74,0.95)'
    ctx.fillRect(0, SAFE_TOP + TOP_BAR, W, TEXT_H)
    ctx.fillStyle = '#dde'
    ctx.font = '13px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    drawTopInstructionText(ctx, instruction)
  }
  if (showNext) {
    drawNextButton(ctx)
  }
  if (showLevelSelect) {
    drawModal()
  }
  if (showScoreModal) {
    drawScoreModal()
  }
}

function drawTopInstructionText(r, text) {
  var maxW = Math.max(80, W - 32)
  var source = String(text || '')
  if (!source) return
  var y = SAFE_TOP + TOP_BAR + TEXT_H / 2
  var fontSize = getCanvasInstructionFontSize(r, source, maxW)
  r.font = fontSize + 'px sans-serif'
  var width = r.measureText ? r.measureText(source).width : maxW
  if (width > maxW && r.save && r.scale) {
    var scale = Math.max(0.42, maxW / width)
    r.save()
    r.translate(W / 2, y)
    r.scale(scale, 1)
    r.fillText(source, 0, 0)
    r.restore()
    return
  }
  r.fillText(source, W / 2, y)
}

function getCanvasInstructionFontSize(r, text, maxW) {
  var size = 13
  if (!r.measureText) return size
  while (size > 8) {
    r.font = size + 'px sans-serif'
    if (r.measureText(text).width <= maxW) return size
    size -= 1
  }
  return size
}

function drawToolLabel(r, x, y, text) {
  r.fillStyle = '#f2f2f2'
  r.font = '12px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(text, x + 23, y + 51)
}

function drawRetryButton(r, x, y) {
  var ix = x + 4
  var iy = y
  var size = 38

  r.save()
  r.translate(ix + size / 2 + 1.5, iy + size / 2 + 1.5)
  r.strokeStyle = '#f0f0f0'
  r.lineWidth = 5.2
  r.lineCap = 'round'
  r.lineJoin = 'round'
  r.beginPath()
  r.arc(-1, 2, 11.5, 0.36, 5.15, false)
  r.lineTo(15.4, -3.4)
  r.stroke()
  r.beginPath()
  r.moveTo(10.4, -11.4)
  r.lineTo(15.4, -3.4)
  r.lineTo(6.4, -1.9)
  r.stroke()
  r.restore()
}

function drawLevelButton(r, x, y) {
  var cx = x + 23
  var cy = y + 21
  r.save()
  r.fillStyle = '#333'

  r.beginPath()
  r.ellipse(cx - 11.5, cy - 3, 5, 6.2, -0.35, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx - 4.5, cy - 9.5, 5, 7.2, -0.05, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx + 4.5, cy - 9.5, 5, 7.2, 0.05, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx + 11.5, cy - 3, 5, 6.2, 0.35, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.moveTo(cx - 13, cy + 11)
  r.bezierCurveTo(cx - 13, cy + 5, cx - 8.8, cy + 1.5, cx - 4.5, cy - 1)
  r.bezierCurveTo(cx - 1.8, cy - 2.8, cx + 1.8, cy - 2.8, cx + 4.5, cy - 1)
  r.bezierCurveTo(cx + 8.8, cy + 1.5, cx + 13, cy + 5, cx + 13, cy + 11)
  r.bezierCurveTo(cx + 13, cy + 17, cx + 7, cy + 18.5, cx + 1.8, cy + 16)
  r.bezierCurveTo(cx + 0.5, cy + 15.4, cx - 0.5, cy + 15.4, cx - 1.8, cy + 16)
  r.bezierCurveTo(cx - 7, cy + 18.5, cx - 13, cy + 17, cx - 13, cy + 11)
  r.closePath()
  r.fill()

  r.fillStyle = '#f0f0f0'

  r.beginPath()
  r.ellipse(cx - 11.5, cy - 3, 3.1, 4.2, -0.35, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx - 4.5, cy - 9.5, 3.1, 5, -0.05, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx + 4.5, cy - 9.5, 3.1, 5, 0.05, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.ellipse(cx + 11.5, cy - 3, 3.1, 4.2, 0.35, 0, Math.PI * 2)
  r.fill()

  r.beginPath()
  r.moveTo(cx - 9, cy + 11)
  r.bezierCurveTo(cx - 9, cy + 6.8, cx - 6, cy + 3.7, cx - 3.2, cy + 2.1)
  r.bezierCurveTo(cx - 1.2, cy + 1, cx + 1.2, cy + 1, cx + 3.2, cy + 2.1)
  r.bezierCurveTo(cx + 6, cy + 3.7, cx + 9, cy + 6.8, cx + 9, cy + 11)
  r.bezierCurveTo(cx + 9, cy + 14.3, cx + 5.6, cy + 15.3, cx + 1.9, cy + 13.7)
  r.bezierCurveTo(cx + 0.6, cy + 13.1, cx - 0.6, cy + 13.1, cx - 1.9, cy + 13.7)
  r.bezierCurveTo(cx - 5.6, cy + 15.3, cx - 9, cy + 14.3, cx - 9, cy + 11)
  r.closePath()
  r.fill()

  r.restore()
}

function drawScoreButton(r, x, y) {
  var cx = x + 23
  var cy = y + 21
  r.save()
  r.translate(cx, cy)
  r.scale(0.36, 0.36)
  r.translate(-64, -64)

  var grd = r.createLinearGradient(38, 22, 94, 108)
  grd.addColorStop(0, '#fff27a')
  grd.addColorStop(1, '#ffb928')

  r.shadowColor = 'rgba(216,133,21,0.35)'
  r.shadowBlur = 3
  r.shadowOffsetY = 3
  r.fillStyle = grd
  r.strokeStyle = '#e89117'
  r.lineWidth = 6
  r.lineJoin = 'round'
  traceScoreStar(r)
  r.fill()
  r.stroke()

  r.shadowColor = 'transparent'
  r.shadowBlur = 0
  r.shadowOffsetY = 0
  r.strokeStyle = 'rgba(255,249,191,0.75)'
  r.lineWidth = 7
  r.lineCap = 'round'
  r.beginPath()
  r.moveTo(39, 55)
  r.bezierCurveTo(46, 40, 57, 31, 70, 28)
  r.stroke()
  r.restore()
}

function traceScoreStar(r) {
  r.beginPath()
  r.moveTo(64, 15)
  r.bezierCurveTo(67, 15, 69.5, 17, 71, 20)
  r.lineTo(82.5, 43.5)
  r.lineTo(108.5, 47.2)
  r.bezierCurveTo(112, 47.7, 114.2, 50, 114.8, 53)
  r.bezierCurveTo(115.3, 56, 114, 58.5, 111.5, 61)
  r.lineTo(92.7, 79.3)
  r.lineTo(97.2, 105.2)
  r.bezierCurveTo(97.8, 108.8, 96.3, 111.7, 93.7, 113.3)
  r.bezierCurveTo(91, 115, 88.2, 114.7, 85.2, 113.1)
  r.lineTo(64, 101.8)
  r.lineTo(40.8, 113.9)
  r.bezierCurveTo(37.8, 115.4, 34.7, 115.1, 32.3, 113.3)
  r.bezierCurveTo(29.8, 111.5, 28.8, 108.7, 29.3, 105.5)
  r.lineTo(33.8, 79.5)
  r.lineTo(15, 61.1)
  r.bezierCurveTo(12.6, 58.8, 11.6, 55.8, 12.5, 52.8)
  r.bezierCurveTo(13.4, 49.8, 15.7, 47.8, 19, 47.3)
  r.lineTo(45, 43.5)
  r.lineTo(56.6, 20)
  r.bezierCurveTo(58, 17, 61, 15, 64, 15)
  r.closePath()
}

function drawNextButton(r) {
  var w = 160
  var h = 48
  var x = (W - w) / 2
  var y = H - 88
  var grd = r.createLinearGradient(x, y, x, y + h)
  grd.addColorStop(0, '#ffe8af')
  grd.addColorStop(1, '#ffc75d')
  r.fillStyle = grd
  drawRoundRect(r, x, y, w, h, 14)
  r.fill()
  r.strokeStyle = '#a96d24'
  r.lineWidth = 3
  r.stroke()
  r.fillStyle = '#6b4518'
  r.font = '20px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText('\u4e0b\u4e00\u5173', W / 2, y + h / 2 + 1)
}

function getScoreActionRect(index, mx, my) {
  var row = getRewardRowRect(index, mx, my)
  return {
    x: mx + SCORE_MODAL_W - SCORE_MODAL_PAD - 84,
    y: row.y + 14,
    w: 78,
    h: 30,
  }
}

function getScoreTabRect(type, mx, my) {
  var gap = 6
  var types = ['accessory', 'expression', 'sticker', 'task', 'leaderboard']
  var index = types.indexOf(type)
  if (index < 0) index = 0
  var tabW = (SCORE_MODAL_W - SCORE_MODAL_PAD * 2 - gap * (types.length - 1)) / types.length
  var tabX = mx + SCORE_MODAL_PAD + index * (tabW + gap)
  return {
    x: tabX,
    y: my + 56,
    w: tabW,
    h: 32,
  }
}

function getScoreTabAt(x, y, mx, my) {
  var accessory = getScoreTabRect('accessory', mx, my)
  if (isInside(x, y, accessory.x, accessory.y, accessory.w, accessory.h)) {
    return 'accessory'
  }
  var expression = getScoreTabRect('expression', mx, my)
  if (isInside(x, y, expression.x, expression.y, expression.w, expression.h)) {
    return 'expression'
  }
  var sticker = getScoreTabRect('sticker', mx, my)
  if (isInside(x, y, sticker.x, sticker.y, sticker.w, sticker.h)) {
    return 'sticker'
  }
  var task = getScoreTabRect('task', mx, my)
  if (isInside(x, y, task.x, task.y, task.w, task.h)) {
    return 'task'
  }
  var leaderboard = getScoreTabRect('leaderboard', mx, my)
  if (isInside(x, y, leaderboard.x, leaderboard.y, leaderboard.w, leaderboard.h)) {
    return 'leaderboard'
  }
  return ''
}

function getScoreContentRect(mx, my) {
  var y = my + SCORE_MODAL_PAD + SCORE_MODAL_HEADER_H
  return {
    x: mx + SCORE_MODAL_PAD,
    y: y,
    w: SCORE_MODAL_W - SCORE_MODAL_PAD * 2,
    h: my + SCORE_MODAL_H - SCORE_MODAL_PAD - y,
  }
}

function getRewardListRect(mx, my) {
  var content = getScoreContentRect(mx, my)
  if (activeRewardTab === 'sticker') {
    return {
      x: content.x,
      y: content.y,
      w: content.w,
      h: content.h,
    }
  }
  return {
    x: content.x,
    y: content.y + SCORE_TRYON_H + SCORE_TRYON_GAP,
    w: content.w,
    h: Math.max(0, content.h - SCORE_TRYON_H - SCORE_TRYON_GAP),
  }
}

function getStickerDetailBackRect(mx, my) {
  var content = getScoreContentRect(mx, my)
  return {
    x: content.x,
    y: content.y,
    w: 62,
    h: 30,
  }
}

function getRewardRowRect(index, mx, my) {
  var list = getRewardListRect(mx, my)
  return {
    x: list.x,
    y: list.y + index * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP) - scoreScrollY,
    w: list.w,
    h: SCORE_MODAL_ROW_H,
  }
}

function getLeaderboardAuthRect(mx, my) {
  var content = getScoreContentRect(mx, my)
  return {
    x: content.x + content.w - 88,
    y: content.y + 47,
    w: 82,
    h: 32,
  }
}

function getLeaderboardRetryRect(mx, my) {
  var list = getLeaderboardListRect(mx, my)
  var y = list.y + list.h / 2 + 16
  y = Math.min(list.y + list.h - 30, Math.max(list.y + 44, y))
  return {
    x: list.x + list.w / 2 - 38,
    y: y,
    w: 76,
    h: 30,
  }
}

function getLeaderboardListRect(mx, my) {
  var content = getScoreContentRect(mx, my)
  return {
    x: content.x,
    y: content.y + 100,
    w: content.w,
    h: content.h - 100,
  }
}

function getLeaderboardScopeRect(scope, mx, my) {
  var content = getScoreContentRect(mx, my)
  var gap = 8
  var w = (content.w - gap) / 2
  var index = scope === 'server' ? 1 : 0
  return {
    x: content.x + index * (w + gap),
    y: content.y + 4,
    w: w,
    h: 32,
  }
}

function getLeaderboardScopeAt(x, y, mx, my) {
  var friend = getLeaderboardScopeRect('friend', mx, my)
  if (isInsideRect(x, y, friend)) return 'friend'
  var server = getLeaderboardScopeRect('server', mx, my)
  if (isInsideRect(x, y, server)) return 'server'
  return ''
}

function getFriendLeaderboardRect(mx, my) {
  var content = getScoreContentRect(mx, my)
  return {
    x: content.x,
    y: content.y + 44,
    w: content.w,
    h: content.h - 44,
  }
}

function getScoreMaxScroll(mx, my) {
  if (activeRewardTab === 'leaderboard') {
    if (activeLeaderboardScope === 'friend') return 0
    var list = getLeaderboardListRect(mx, my)
    var contentH = leaderboardState.rows.length * (LEADERBOARD_ROW_H + SCORE_MODAL_GAP)
    return Math.max(0, contentH - list.h)
  }
  if (activeRewardTab === 'task') {
    var content = getScoreContentRect(mx, my)
    var taskTop = content.y + (scoreTaskHint ? 40 : 0)
    var taskH = content.y + content.h - taskTop
    var tasks = getRewardTasks()
    return Math.max(0, tasks.length * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP) - taskH)
  }
  if (activeRewardTab === 'sticker' && selectedStickerId) return 0
  var rewardContent = getRewardListRect(mx, my)
  return Math.max(0, getActiveRewards().length * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP) - rewardContent.h)
}

function drawScoreModal() {
  ctx.fillStyle = 'rgba(0,0,0,0.66)'
  ctx.fillRect(0, 0, W, H)
  var mx = (W - SCORE_MODAL_W) / 2
  var my = (H - SCORE_MODAL_H) / 2

  ctx.fillStyle = '#2f2f50'
  drawRoundRect(ctx, mx, my, SCORE_MODAL_W, SCORE_MODAL_H, 8)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('\u603b\u79ef\u5206', mx + SCORE_MODAL_PAD, my + 31)

  ctx.fillStyle = '#ffe8af'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(String(rewardState.totalScore), mx + SCORE_MODAL_W - SCORE_MODAL_PAD, my + 31)

  drawScoreTabs(ctx, mx, my)

  if (activeRewardTab === 'leaderboard') {
    drawLeaderboardPanel(ctx, mx, my)
  } else if (activeRewardTab === 'task') {
    drawRewardTaskPanel(ctx, mx, my)
  } else if (activeRewardTab === 'sticker' && selectedStickerId) {
    drawStickerDetailPanel(ctx, mx, my)
  } else {
    var content = getRewardListRect(mx, my)
    if (isRewardTryOnTab()) {
      drawRewardTryOnPanel(ctx, mx, my)
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(content.x, content.y, content.w, content.h)
    ctx.clip()
    getActiveRewards().forEach(function (item, index) {
      drawScoreAccessoryRow(ctx, item, index, mx, my)
    })
    ctx.restore()
  }
}

function drawScoreTabs(r, mx, my) {
  drawScoreTab(r, getScoreTabRect('accessory', mx, my), '\u9970\u54c1', activeRewardTab === 'accessory')
  drawScoreTab(r, getScoreTabRect('expression', mx, my), '\u8868\u60c5', activeRewardTab === 'expression')
  drawScoreTab(r, getScoreTabRect('sticker', mx, my), '\u8d34\u56fe', activeRewardTab === 'sticker')
  drawScoreTab(r, getScoreTabRect('task', mx, my), '\u4efb\u52a1', activeRewardTab === 'task')
  drawScoreTab(r, getScoreTabRect('leaderboard', mx, my), '\u6392\u884c\u699c', activeRewardTab === 'leaderboard')
  r.strokeStyle = 'rgba(255,255,255,0.16)'
  r.lineWidth = 1
  r.beginPath()
  r.moveTo(mx + SCORE_MODAL_PAD, my + 92)
  r.lineTo(mx + SCORE_MODAL_W - SCORE_MODAL_PAD, my + 92)
  r.stroke()
}

function drawScoreTab(r, rect, label, active) {
  r.fillStyle = '#2f2f50'
  r.lineWidth = 1.4
  drawRoundRect(r, rect.x, rect.y + 2, rect.w, rect.h - 4, 13)
  r.fill()
  if (active) {
    r.strokeStyle = '#ffe8af'
    r.lineWidth = 2
    r.beginPath()
    r.moveTo(rect.x + 14, rect.y + rect.h - 5)
    r.lineTo(rect.x + rect.w - 14, rect.y + rect.h - 5)
    r.stroke()
  }
  r.fillStyle = active ? '#ffe8af' : '#d9daec'
  r.font = 'bold 13px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
}

function drawRewardTryOnPanel(r, mx, my) {
  var content = getScoreContentRect(mx, my)
  var panel = {
    x: content.x,
    y: content.y,
    w: content.w,
    h: SCORE_TRYON_H,
  }
  r.fillStyle = '#23233a'
  r.strokeStyle = '#565873'
  r.lineWidth = 1.3
  drawRoundRect(r, panel.x, panel.y, panel.w, panel.h, 8)
  r.fill()
  r.stroke()

  var avatar = {
    x: panel.x + 10,
    y: panel.y + 9,
    w: 92,
    h: panel.h - 18,
  }
  var bg = r.createLinearGradient(avatar.x, avatar.y, avatar.x, avatar.y + avatar.h)
  bg.addColorStop(0, '#303052')
  bg.addColorStop(1, '#222238')
  r.fillStyle = bg
  drawRoundRect(r, avatar.x, avatar.y, avatar.w, avatar.h, 8)
  r.fill()
  r.fillStyle = 'rgba(255,232,175,0.16)'
  r.beginPath()
  r.ellipse(avatar.x + avatar.w / 2, avatar.y + avatar.h - 10, avatar.w * 0.3, 6, 0, 0, Math.PI * 2)
  r.fill()
  r.save()
  r.translate(avatar.x + avatar.w / 2, avatar.y + avatar.h / 2 + 6)
  renderCubAvatar(r, 40, {
    accessoryId: rewardState.equippedAccessoryId || '',
    expressionId: rewardState.equippedExpressionId || '',
    isHovered: true,
    lookOffset: { x: 0, y: 0 },
    time: Date.now() / 1000,
  })
  r.restore()

  var textX = avatar.x + avatar.w + 12
  r.textAlign = 'left'
  r.textBaseline = 'middle'
  r.fillStyle = '#aeb0c8'
  r.font = 'bold 11px sans-serif'
  r.fillText('\u5f53\u524d\u642d\u914d', textX, panel.y + 20)
  r.fillStyle = '#f2f2f7'
  r.font = 'bold 15px sans-serif'
  r.fillText(truncateText(getEquippedExpressionName() + ' / ' + getEquippedAccessoryName(), 10), textX, panel.y + 42)
  r.fillStyle = '#ffe8af'
  r.font = 'bold 12px sans-serif'
  r.fillText('\u5f53\u524d\u751f\u6548', textX, panel.y + 62)
}

function drawScoreAccessoryRow(r, item, index, mx, my) {
  var row = getRewardRowRect(index, mx, my)
  var rowX = row.x
  var rowY = row.y
  var rowW = row.w
  var owned = isRewardOwned(item)
  var equipped = isRewardEquipped(item)

  r.fillStyle = equipped ? '#3d3f51' : '#34344f'
  r.strokeStyle = equipped ? '#7dc88a' : owned ? '#d5a544' : '#565873'
  r.lineWidth = 1.4
  drawRoundRect(r, rowX, rowY, rowW, SCORE_MODAL_ROW_H, 8)
  r.fill()
  r.stroke()

  drawRewardPreview(r, item, rowX + 28, rowY + SCORE_MODAL_ROW_H / 2)

  r.textAlign = 'left'
  r.textBaseline = 'middle'
  r.fillStyle = '#f2f2f7'
  r.font = 'bold 11px sans-serif'
  r.fillText(truncateText(item.name, 9), rowX + 54, rowY + 20)
  r.fillStyle = '#aeb0c8'
  r.font = '11px sans-serif'
  r.fillText(truncateText(rewardStatusText(item), 12), rowX + 54, rowY + 40)

  var action = getScoreActionRect(index, mx, my)
  var enabled = canUseReward(item)
  if (enabled) {
    var grd = r.createLinearGradient(action.x, action.y, action.x, action.y + action.h)
    grd.addColorStop(0, '#ffe1a2')
    grd.addColorStop(1, '#f2b653')
    r.fillStyle = grd
    r.strokeStyle = '#98621f'
  } else {
    r.fillStyle = '#3a3b50'
    r.strokeStyle = '#565873'
  }
  r.lineWidth = 2
  drawRoundRect(r, action.x, action.y, action.w, action.h, 8)
  r.fill()
  r.stroke()
  r.fillStyle = enabled ? '#5f3713' : '#82869d'
  r.font = 'bold 11px sans-serif'
  r.textAlign = 'center'
  r.fillText(rewardActionText(item), action.x + action.w / 2, action.y + action.h / 2 + 1)
}

function drawStickerDetailPanel(r, mx, my) {
  var content = getScoreContentRect(mx, my)
  var sticker = getStickerById(selectedStickerId)
  if (!sticker) {
    selectedStickerId = ''
    return
  }
  var snapshot = rewardState.stickerSnapshots && rewardState.stickerSnapshots[sticker.id]
    ? rewardState.stickerSnapshots[sticker.id]
    : null
  var back = getStickerDetailBackRect(mx, my)
  drawLeaderboardButton(r, back, '\u8fd4\u56de')

  var cardW = content.w
  var cardH = Math.min(content.h - 42, Math.floor(cardW * 1.18))
  var cardX = content.x
  var cardY = content.y + 42
  drawStickerShareCard(r, sticker, snapshot, cardX, cardY, cardW, cardH, false)

  r.fillStyle = '#aeb0c8'
  r.font = '11px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText('\u5df2\u751f\u6210\u9002\u5408\u5206\u4eab\u7684\u8d34\u56fe\u753b\u9762', content.x + content.w / 2, cardY + cardH + 17)
}

function drawRewardTaskPanel(r, mx, my) {
  var content = getScoreContentRect(mx, my)
  var top = content.y
  if (scoreTaskHint) {
    r.fillStyle = '#34344f'
    r.strokeStyle = '#565873'
    r.lineWidth = 1.2
    drawRoundRect(r, content.x, top, content.w, 32, 8)
    r.fill()
    r.stroke()
    r.fillStyle = '#ffe8af'
    r.font = 'bold 11px sans-serif'
    r.textAlign = 'center'
    r.textBaseline = 'middle'
    r.fillText(truncateText(scoreTaskHint, 18), content.x + content.w / 2, top + 16)
    top += 40
  }

  var tasks = getRewardTasks()
  r.save()
  r.beginPath()
  r.rect(content.x, top, content.w, content.y + content.h - top)
  r.clip()
  tasks.forEach(function (task, index) {
    var rowY = top + index * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP) - scoreScrollY
    if (rowY > content.y + content.h || rowY + SCORE_MODAL_ROW_H < top) return
    drawRewardTaskRow(r, task, index, content.x, rowY, content.w, mx, my, top)
  })
  r.restore()
}

function drawRewardTaskRow(r, task, index, rowX, rowY, rowW, mx, my, top) {
  r.fillStyle = task.claimed ? '#3d3f51' : '#34344f'
  r.strokeStyle = task.claimed ? '#7dc88a' : task.ready ? '#d5a544' : '#565873'
  r.lineWidth = 1.4
  drawRoundRect(r, rowX, rowY, rowW, SCORE_MODAL_ROW_H, 8)
  r.fill()
  r.stroke()

  r.fillStyle = '#222238'
  drawRoundRect(r, rowX + 10, rowY + 11, 36, 36, 8)
  r.fill()
  r.fillStyle = '#ffe8af'
  r.font = 'bold 16px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(String(task.rewardText || '?').slice(0, 1), rowX + 28, rowY + SCORE_MODAL_ROW_H / 2 + 1)

  r.textAlign = 'left'
  r.fillStyle = '#f2f2f7'
  r.font = 'bold 11px sans-serif'
  r.fillText(truncateText(task.name, 9), rowX + 54, rowY + 20)
  r.fillStyle = '#aeb0c8'
  r.font = '11px sans-serif'
  r.fillText(truncateText(task.statusText + ' / ' + task.description, 13), rowX + 54, rowY + 40)

  var action = getTaskActionRect(index, mx, my, top)
  drawTaskActionButton(r, action, task.actionText, task.canTap)
}

function getTaskActionRect(index, mx, my, top) {
  var rowY = top + index * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP) - scoreScrollY
  return {
    x: mx + SCORE_MODAL_W - SCORE_MODAL_PAD - 84,
    y: rowY + 14,
    w: 78,
    h: 30,
  }
}

function drawTaskActionButton(r, rect, label, enabled) {
  if (enabled) {
    var grd = r.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
    grd.addColorStop(0, '#ffe1a2')
    grd.addColorStop(1, '#f2b653')
    r.fillStyle = grd
    r.strokeStyle = '#98621f'
  } else {
    r.fillStyle = '#3a3b50'
    r.strokeStyle = '#565873'
  }
  r.lineWidth = 2
  drawRoundRect(r, rect.x, rect.y, rect.w, rect.h, 8)
  r.fill()
  r.stroke()
  r.fillStyle = enabled ? '#5f3713' : '#82869d'
  r.font = 'bold 10px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(truncateText(label, 6), rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
}

function drawLeaderboardPanel(r, mx, my) {
  var content = getScoreContentRect(mx, my)
  drawLeaderboardScopeTabs(r, mx, my)
  if (activeLeaderboardScope === 'friend') {
    drawFriendLeaderboardPanel(r, mx, my)
    return
  }
  if (leaderboardState.status === 'unavailable') {
    drawLeaderboardMessage(r, getLeaderboardListRect(mx, my), '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u67e5\u770b\u5168\u670d\u6392\u884c\u699c')
    return
  }

  drawLeaderboardSummary(r, mx, my)

  if (leaderboardState.status === 'loading') {
    drawLeaderboardMessage(r, getLeaderboardListRect(mx, my), '\u6392\u884c\u699c\u52a0\u8f7d\u4e2d...')
    return
  }

  if (leaderboardState.status === 'error') {
    drawLeaderboardError(r, mx, my, leaderboardState.error || LEADERBOARD_LOAD_FAILED_TEXT)
    return
  }

  if (!leaderboardState.rows.length) {
    drawLeaderboardMessage(
      r,
      getLeaderboardListRect(mx, my),
      leaderboardState.profile
        ? '\u6682\u65e0\u6392\u540d\u6570\u636e'
        : '\u8bf7\u70b9\u51fb\u6388\u6743\u540c\u6b65\u6392\u540d',
    )
    return
  }

  drawLeaderboardRows(r, mx, my)
}

function drawLeaderboardScopeTabs(r, mx, my) {
  drawLeaderboardScopeTab(r, getLeaderboardScopeRect('friend', mx, my), '\u597d\u53cb', activeLeaderboardScope === 'friend')
  drawLeaderboardScopeTab(r, getLeaderboardScopeRect('server', mx, my), '\u5168\u670d', activeLeaderboardScope === 'server')
}

function drawLeaderboardScopeTab(r, rect, label, active) {
  r.fillStyle = active ? '#3d3f51' : '#2f2f50'
  r.strokeStyle = active ? '#ffe8af' : '#565873'
  r.lineWidth = active ? 2 : 1.2
  drawRoundRect(r, rect.x, rect.y, rect.w, rect.h, 8)
  r.fill()
  r.stroke()
  r.fillStyle = active ? '#ffe8af' : '#d9daec'
  r.font = 'bold 12px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
}

function drawFriendLeaderboardPanel(r, mx, my) {
  var rect = getFriendLeaderboardRect(mx, my)
  r.fillStyle = '#23233a'
  drawRoundRect(r, rect.x, rect.y, rect.w, rect.h, 8)
  r.fill()
  if (!LeaderboardClient.isFriendLeaderboardSupported()) {
    drawLeaderboardMessage(r, rect, '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u67e5\u770b\u597d\u53cb\u6392\u884c\u699c')
    return
  }
  renderFriendLeaderboard(rect)
  var sharedCanvas = LeaderboardClient.getFriendLeaderboardCanvas
    ? LeaderboardClient.getFriendLeaderboardCanvas()
    : null
  if (sharedCanvas) {
    r.drawImage(sharedCanvas, rect.x, rect.y, rect.w, rect.h)
  } else {
    drawLeaderboardMessage(r, rect, '\u597d\u53cb\u699c\u52a0\u8f7d\u4e2d...')
  }
}

function drawLeaderboardSummary(r, mx, my) {
  var content = getScoreContentRect(mx, my)
  var authRect = getLeaderboardAuthRect(mx, my)
  var avatar = getLeaderboardProfileAvatar()
  r.fillStyle = '#34344f'
  drawRoundRect(r, content.x, content.y + 46, content.w - 96, 38, 8)
  r.fill()
  drawLeaderboardAvatar(r, avatar, content.x + 8, content.y + 50, 30)
  r.fillStyle = '#aeb0c8'
  r.font = 'bold 13px sans-serif'
  r.textAlign = 'left'
  r.textBaseline = 'middle'
  r.fillText(truncateText(getLeaderboardProfileName(), 9), content.x + 46, content.y + 57)
  r.fillStyle = '#ffe8af'
  r.font = 'bold 14px sans-serif'
  var selfText = leaderboardState.self
    ? '#' + leaderboardState.self.rank + ' / ' + leaderboardState.self.totalScore
    : '--'
  r.fillText(selfText, content.x + 46, content.y + 74)

  drawLeaderboardButton(
    r,
    authRect,
    getLeaderboardAuthText(),
  )
}

function drawLeaderboardRows(r, mx, my) {
  var list = getLeaderboardListRect(mx, my)
  r.save()
  r.beginPath()
  r.rect(list.x, list.y, list.w, list.h)
  r.clip()
  leaderboardState.rows.forEach(function (row, index) {
    var y = list.y + index * (LEADERBOARD_ROW_H + SCORE_MODAL_GAP) - scoreScrollY
    if (y > list.y + list.h || y + LEADERBOARD_ROW_H < list.y) return
    drawLeaderboardRow(r, row, list.x, y, list.w)
  })
  r.restore()
}

function drawLeaderboardRow(r, row, x, y, w) {
  r.fillStyle = row.isSelf ? '#3d3f51' : '#34344f'
  r.strokeStyle = row.isSelf ? '#d5a544' : '#565873'
  r.lineWidth = 1.3
  drawRoundRect(r, x, y, w, LEADERBOARD_ROW_H, 8)
  r.fill()
  r.stroke()

  r.fillStyle = '#ffe8af'
  r.font = 'bold 12px sans-serif'
  r.textAlign = 'left'
  r.textBaseline = 'middle'
  r.fillText('#' + row.rank, x + 9, y + LEADERBOARD_ROW_H / 2 + 1)

  drawLeaderboardAvatar(r, row.avatarUrl, x + 45, y + 9, 30)

  r.fillStyle = '#f2f2f7'
  r.font = 'bold 12px sans-serif'
  r.fillText(truncateText(row.nickname || '\u533f\u540d\u73a9\u5bb6', 9), x + 84, y + LEADERBOARD_ROW_H / 2 + 1)

  r.fillStyle = '#ffe8af'
  r.font = 'bold 15px sans-serif'
  r.textAlign = 'right'
  r.fillText(String(row.totalScore || 0), x + w - 10, y + LEADERBOARD_ROW_H / 2 + 1)
}

function drawLeaderboardAvatar(r, url, x, y, size) {
  var cached = getAvatarImage(url)
  if (cached && cached.ready) {
    r.drawImage(cached.image, x, y, size, size)
    return
  }
  r.fillStyle = '#222238'
  drawRoundRect(r, x, y, size, size, 8)
  r.fill()
  r.strokeStyle = '#5c5f77'
  r.lineWidth = 2
  r.stroke()
}

function getAvatarImage(url) {
  if (!url || typeof wx.createImage !== 'function') return null
  if (avatarImageCache[url]) return avatarImageCache[url]
  var image = wx.createImage()
  var cached = {
    image: image,
    ready: false,
  }
  image.onload = function () {
    cached.ready = true
  }
  image.onerror = function () {
    cached.ready = false
  }
  image.src = url
  avatarImageCache[url] = cached
  return cached
}

function drawLeaderboardMessage(r, rect, text) {
  r.fillStyle = '#aeb0c8'
  r.font = '13px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(text, rect.x + rect.w / 2, rect.y + rect.h / 2)
}

function drawLeaderboardError(r, mx, my, text) {
  var retry = getLeaderboardRetryRect(mx, my)
  r.fillStyle = '#aeb0c8'
  r.font = '13px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(text, retry.x + retry.w / 2, retry.y - 18)
  drawLeaderboardButton(r, retry, '\u91cd\u8bd5')
}

function drawLeaderboardButton(r, rect, label) {
  var grd = r.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
  grd.addColorStop(0, '#ffe1a2')
  grd.addColorStop(1, '#f2b653')
  r.fillStyle = grd
  r.strokeStyle = '#98621f'
  r.lineWidth = 2
  drawRoundRect(r, rect.x, rect.y, rect.w, rect.h, 8)
  r.fill()
  r.stroke()
  r.fillStyle = '#5f3713'
  r.font = 'bold 11px sans-serif'
  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
}

function truncateText(text, maxLength) {
  var value = String(text || '')
  return value.length > maxLength ? value.slice(0, maxLength - 1) + '...' : value
}

function getStickerById(id) {
  for (var i = 0; i < STICKERS.length; i++) {
    if (STICKERS[i].id === id) return STICKERS[i]
  }
  return null
}

function getStickerPalette(sticker) {
  var palettes = {
    peach: ['#fff0d8', '#ffd2b8', '#ff8ca6'],
    mint: ['#e8fff5', '#bcebd2', '#5cb68f'],
    sky: ['#e8f6ff', '#b9ddff', '#4aa3ff'],
    lemon: ['#fff8cc', '#ffe28a', '#f3b545'],
    rose: ['#ffe8ef', '#ffc1d1', '#e84b5f'],
    violet: ['#f0ecff', '#d6c8ff', '#8f7aff'],
  }
  return palettes[sticker && sticker.palette] || palettes.peach
}

function drawStickerThumbnail(r, sticker, snapshot, cx, cy, owned) {
  r.save()
  if (!owned) {
    r.fillStyle = '#222238'
    drawRoundRect(r, cx - 18, cy - 18, 36, 36, 8)
    r.fill()
    r.fillStyle = '#8589a1'
    r.font = 'bold 22px sans-serif'
    r.textAlign = 'center'
    r.textBaseline = 'middle'
    r.fillText('?', cx, cy + 1)
    r.restore()
    return
  }
  drawStickerShareCard(r, sticker, snapshot, cx - 18, cy - 18, 36, 36, true)
  r.restore()
}

function drawStickerShareCard(r, sticker, snapshot, x, y, w, h, compact) {
  var colors = getStickerPalette(sticker)
  var bg = r.createLinearGradient(x, y, x, y + h)
  bg.addColorStop(0, colors[0])
  bg.addColorStop(1, colors[1])
  r.fillStyle = bg
  drawRoundRect(r, x, y, w, h, compact ? 8 : 14)
  r.fill()
  r.strokeStyle = compact ? 'rgba(255,255,255,0.75)' : '#ffffff'
  r.lineWidth = compact ? 1.5 : 3
  r.stroke()

  r.save()
  r.beginPath()
  drawRoundRect(r, x, y, w, h, compact ? 8 : 14)
  r.clip()
  drawStickerTheme(r, sticker, x, y, w, h, compact)
  r.restore()

  var catSize = compact ? 21 : Math.min(84, w * 0.31)
  r.save()
  r.translate(x + w / 2, y + h * (compact ? 0.52 : 0.48))
  renderCubAvatar(r, catSize, {
    accessoryId: snapshot && snapshot.accessoryId ? snapshot.accessoryId : '',
    expressionId: snapshot && snapshot.expressionId ? snapshot.expressionId : 'joy',
    isHovered: true,
    lookOffset: { x: 0, y: 0 },
    time: Date.now() / 1000,
  })
  r.restore()

  if (!compact) {
    r.fillStyle = '#ffffff'
    r.strokeStyle = colors[2]
    r.lineWidth = 5
    r.font = 'bold 18px sans-serif'
    r.textAlign = 'center'
    r.textBaseline = 'middle'
    r.strokeText(sticker.name, x + w / 2, y + 28)
    r.fillText(sticker.name, x + w / 2, y + 28)
    r.fillStyle = '#5f3713'
    r.font = 'bold 13px sans-serif'
    r.fillText(sticker.worldName + ' ' + sticker.requiredCompleted + '\u5173\u7eaa\u5ff5', x + w / 2, y + h - 25)
  }
}

function drawStickerTheme(r, sticker, x, y, w, h, compact) {
  var accent = getStickerPalette(sticker)[2]
  r.fillStyle = 'rgba(255,255,255,0.42)'
  r.beginPath()
  r.ellipse(x + w * 0.5, y + h * 0.72, w * 0.29, h * 0.07, 0, 0, Math.PI * 2)
  r.fill()
  if (sticker.theme === 'scratch') {
    r.strokeStyle = accent
    r.lineWidth = compact ? 1.6 : 5
    r.lineCap = 'round'
    for (var si = 0; si < 3; si++) {
      r.beginPath()
      r.moveTo(x + w * (0.2 + si * 0.17), y + h * 0.2)
      r.quadraticCurveTo(x + w * (0.3 + si * 0.15), y + h * 0.46, x + w * (0.22 + si * 0.18), y + h * 0.72)
      r.stroke()
    }
  } else if (sticker.theme === 'yarn') {
    r.strokeStyle = accent
    r.lineWidth = compact ? 1.8 : 5
    r.beginPath()
    r.arc(x + w * 0.24, y + h * 0.27, w * 0.1, 0, Math.PI * 2)
    r.stroke()
    r.beginPath()
    r.moveTo(x + w * 0.3, y + h * 0.3)
    r.bezierCurveTo(x + w * 0.52, y + h * 0.1, x + w * 0.73, y + h * 0.55, x + w * 0.86, y + h * 0.34)
    r.stroke()
  } else {
    r.fillStyle = accent
    drawRoundRect(r, x + w * 0.15, y + h * 0.2, w * 0.25, h * 0.18, compact ? 3 : 8)
    r.fill()
    drawRoundRect(r, x + w * 0.63, y + h * 0.62, w * 0.23, h * 0.16, compact ? 3 : 8)
    r.fill()
  }
  r.strokeStyle = '#ffffff'
  r.lineWidth = compact ? 1.2 : 3
  drawPreviewSpark(r, x + w * 0.8, y + h * 0.22, compact ? 3 : 8)
  drawPreviewSpark(r, x + w * 0.2, y + h * 0.76, compact ? 2.5 : 7)
}

function drawRewardPreview(r, item, cx, cy) {
  r.save()
  r.fillStyle = '#222238'
  drawRoundRect(r, cx - 18, cy - 18, 36, 36, 8)
  r.fill()
  if (item.type === 'sticker') {
    r.restore()
    drawStickerThumbnail(
      r,
      item,
      rewardState.stickerSnapshots && rewardState.stickerSnapshots[item.id],
      cx,
      cy,
      isRewardOwned(item),
    )
    return
  }
  if (item.type === 'expression') {
    drawExpressionPreview(r, item.id, cx, cy)
    r.restore()
    return
  }
  var id = item.id
  if (id === 'red-bow') {
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.fillStyle = '#e84b5f'
    r.beginPath()
    r.ellipse(cx - 7, cy, 10, 7, -0.25, 0, Math.PI * 2)
    r.ellipse(cx + 7, cy, 10, 7, 0.25, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.strokeStyle = '#b82f46'
    r.lineWidth = 1.4
    r.beginPath()
    r.moveTo(cx - 13, cy + 1)
    r.quadraticCurveTo(cx - 9, cy + 4, cx - 5, cy + 3)
    r.moveTo(cx + 13, cy + 1)
    r.quadraticCurveTo(cx + 9, cy + 4, cx + 5, cy + 3)
    r.stroke()
    r.fillStyle = '#ffcad1'
    r.beginPath()
    r.arc(cx, cy, 5, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'gold-bell') {
    r.strokeStyle = '#f25d6a'
    r.lineWidth = 3
    r.beginPath()
    r.moveTo(cx - 13, cy - 9)
    r.quadraticCurveTo(cx, cy - 3, cx + 13, cy - 9)
    r.stroke()
    r.fillStyle = '#f7c84b'
    r.strokeStyle = '#8c5b12'
    r.lineWidth = 2
    r.beginPath()
    r.arc(cx, cy, 11, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.fillStyle = 'rgba(255,255,255,0.58)'
    r.beginPath()
    r.ellipse(cx - 4, cy - 4, 3, 2, -0.5, 0, Math.PI * 2)
    r.fill()
    r.beginPath()
    r.moveTo(cx - 7, cy - 2)
    r.lineTo(cx + 7, cy - 2)
    r.stroke()
    r.beginPath()
    r.moveTo(cx - 8, cy + 3)
    r.quadraticCurveTo(cx, cy + 6, cx + 8, cy + 3)
    r.stroke()
    r.fillStyle = '#8c5b12'
    r.beginPath()
    r.arc(cx, cy + 8, 2.4, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'pixel-gamepad-pin') {
    r.save()
    r.translate(cx, cy)
    r.rotate(-0.32)
    r.fillStyle = '#5865ff'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    drawRoundRect(r, -16, -7, 32, 14, 5)
    r.fill()
    r.stroke()
    r.fillStyle = '#7ef0b4'
    drawRoundRect(r, -12, -3, 9, 6, 2)
    r.fill()
    r.fillStyle = '#ffe46e'
    r.fillRect(-10, -5, 2.5, 10)
    r.fillRect(-14, -1.4, 10, 2.5)
    r.fillStyle = '#ff7fa0'
    r.beginPath()
    r.arc(7, -2.5, 2.8, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#7ee8ff'
    r.beginPath()
    r.arc(12, 2.5, 2.8, 0, Math.PI * 2)
    r.fill()
    r.restore()
  } else if (id === 'blue-collar-bell') {
    r.strokeStyle = '#ffffff'
    r.lineWidth = 3
    r.beginPath()
    r.moveTo(cx - 15, cy - 10)
    r.quadraticCurveTo(cx, cy - 3, cx + 15, cy - 10)
    r.stroke()
    r.strokeStyle = '#2d7cff'
    r.lineWidth = 3.8
    r.beginPath()
    r.moveTo(cx - 14, cy - 10)
    r.quadraticCurveTo(cx, cy - 4, cx + 14, cy - 10)
    r.stroke()
    r.fillStyle = '#f7c84b'
    r.strokeStyle = '#8c5b12'
    r.lineWidth = 2
    r.beginPath()
    r.arc(cx, cy, 11, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.beginPath()
    r.moveTo(cx - 8, cy - 2)
    r.lineTo(cx + 8, cy - 2)
    r.moveTo(cx - 8, cy + 3)
    r.quadraticCurveTo(cx, cy + 6, cx + 8, cy + 3)
    r.stroke()
    r.fillStyle = '#8c5b12'
    r.beginPath()
    r.arc(cx, cy + 8, 2.4, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'blue-cap') {
    r.save()
    r.translate(cx, cy)
    r.rotate(-0.32)
    r.fillStyle = '#8ec5ff'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    drawRoundRect(r, -15, -6, 30, 12, 7)
    r.fill()
    r.stroke()
    r.fillStyle = '#d9f0ff'
    r.beginPath()
    r.ellipse(-5, -2, 7, 2, -0.1, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#ffd6df'
    r.strokeStyle = '#7f4f64'
    r.lineWidth = 1.3
    r.beginPath()
    r.arc(4, 1, 4, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    ;[
      { x: -1, y: -3, r: 1.8 },
      { x: 3, y: -5, r: 1.9 },
      { x: 7, y: -3, r: 1.8 },
      { x: 9, y: 1, r: 1.7 },
    ].forEach(function (pad) {
      r.beginPath()
      r.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2)
      r.fill()
      r.stroke()
    })
    r.restore()
  } else if (id === 'star-crown') {
    r.fillStyle = '#ffd95c'
    r.strokeStyle = '#8d6418'
    r.lineWidth = 1.8
    r.beginPath()
    r.moveTo(cx - 15, cy + 9)
    r.lineTo(cx - 10, cy - 9)
    r.lineTo(cx - 3, cy + 5)
    r.lineTo(cx, cy - 12)
    r.lineTo(cx + 3, cy + 5)
    r.lineTo(cx + 10, cy - 9)
    r.lineTo(cx + 15, cy + 9)
    r.closePath()
    r.fill()
    r.stroke()
    r.fillStyle = '#ff7fa0'
    ;[
      { x: cx - 10, y: cy - 8 },
      { x: cx, y: cy - 12 },
      { x: cx + 10, y: cy - 8 },
    ].forEach(function (gem) {
      r.beginPath()
      r.arc(gem.x, gem.y, 2.4, 0, Math.PI * 2)
      r.fill()
    })
    r.fillStyle = '#fff1a5'
    r.beginPath()
    r.ellipse(cx, cy + 6, 10, 2, 0, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'patrol-cap') {
    r.save()
    r.translate(cx, cy)
    r.rotate(-0.08)
    r.fillStyle = '#315aa6'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    r.moveTo(-16, 3)
    r.quadraticCurveTo(-10, -12, 0, -13)
    r.quadraticCurveTo(11, -12, 16, 3)
    r.quadraticCurveTo(2, 8, -16, 3)
    r.closePath()
    r.fill()
    r.stroke()
    r.fillStyle = '#23447d'
    r.beginPath()
    r.ellipse(2, 5, 15, 4, 0, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.strokeStyle = '#ffd95c'
    r.lineWidth = 1.8
    drawPreviewSpark(r, 0, -4, 4)
    r.restore()
  } else if (id === 'magic-hat') {
    r.fillStyle = '#fff8f8'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    r.moveTo(cx - 15, cy + 5)
    r.quadraticCurveTo(cx - 9, cy - 14, cx, cy - 10)
    r.quadraticCurveTo(cx + 9, cy - 14, cx + 15, cy + 5)
    r.quadraticCurveTo(cx, cy + 12, cx - 15, cy + 5)
    r.closePath()
    r.fill()
    r.stroke()
    r.fillStyle = '#ffdfe6'
    r.strokeStyle = '#e6a3b0'
    r.lineWidth = 1.4
    r.beginPath()
    r.ellipse(cx, cy + 5, 14, 4, 0, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.fillStyle = '#e4474e'
    drawRoundRect(r, cx - 2, cy - 7, 4, 12, 1.5)
    r.fill()
    drawRoundRect(r, cx - 6, cy - 3, 12, 4, 1.5)
    r.fill()
  } else if (id === 'lucky-scarf') {
    r.fillStyle = '#78c7a2'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    r.ellipse(cx - 1, cy, 15, 6, 0, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.fillStyle = '#5cb68f'
    r.beginPath()
    r.moveTo(cx + 8, cy + 2)
    r.quadraticCurveTo(cx + 18, cy + 10, cx + 12, cy + 17)
    r.quadraticCurveTo(cx + 7, cy + 12, cx + 5, cy + 4)
    r.closePath()
    r.fill()
    r.stroke()
  } else if (id === 'box-medal') {
    r.fillStyle = '#e84b5f'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 1.8
    r.beginPath()
    r.moveTo(cx - 7, cy - 14)
    r.lineTo(cx, cy + 1)
    r.lineTo(cx + 7, cy - 14)
    r.closePath()
    r.fill()
    r.stroke()
    r.fillStyle = '#ffd95c'
    r.strokeStyle = '#8d6418'
    r.lineWidth = 1.8
    r.beginPath()
    r.arc(cx, cy + 5, 9, 0, Math.PI * 2)
    r.fill()
    r.stroke()
  } else if (id === 'yarn-pompom') {
    r.fillStyle = '#ff9fc2'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 2
    r.beginPath()
    r.arc(cx, cy, 12, 0, Math.PI * 2)
    r.fill()
    r.stroke()
    r.lineWidth = 1.3
    for (var yi = 0; yi < 4; yi++) {
      r.beginPath()
      r.ellipse(cx, cy, 11, 4, (Math.PI * yi) / 4, 0, Math.PI * 2)
      r.stroke()
    }
  }
  r.restore()
}

function drawExpressionPreview(r, id, cx, cy) {
  r.fillStyle = '#1b1b1b'
  r.strokeStyle = '#ffffff'
  r.lineWidth = 2
  r.beginPath()
  r.arc(cx, cy, 14, 0, Math.PI * 2)
  r.fill()
  r.stroke()

  r.strokeStyle = '#ffffff'
  r.fillStyle = '#ffffff'
  r.lineCap = 'round'
  if (id === 'sleepy') {
    r.lineWidth = 2
    r.beginPath()
    r.moveTo(cx - 9, cy - 2)
    r.quadraticCurveTo(cx - 5, cy + 2, cx - 1, cy - 2)
    r.moveTo(cx + 1, cy - 2)
    r.quadraticCurveTo(cx + 5, cy + 2, cx + 9, cy - 2)
    r.stroke()
    drawPreviewSmile(r, cx, cy + 5)
  } else if (id === 'joy') {
    r.beginPath()
    r.arc(cx - 6, cy - 3, 3, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 3, 3, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
  } else if (id === 'night-spark') {
    r.beginPath()
    r.arc(cx - 6, cy - 4, 3.4, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 4, 3.4, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#111111'
    r.beginPath()
    r.arc(cx - 5, cy - 3, 1.5, 0, Math.PI * 2)
    r.arc(cx + 7, cy - 3, 1.5, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
    r.strokeStyle = '#7ee8ff'
    r.lineWidth = 1.8
    drawPreviewSpark(r, cx - 14, cy - 10, 3)
    drawPreviewSpark(r, cx + 14, cy - 10, 3)
    r.fillStyle = 'rgba(126,232,255,0.28)'
    r.beginPath()
    r.arc(cx + 16, cy + 7, 4, -0.8, 1.6)
    r.arc(cx + 19, cy + 6, 4, 1.7, -0.55, true)
    r.fill()
  } else if (id === 'surprised') {
    r.beginPath()
    r.arc(cx - 6, cy - 4, 3.5, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 4, 3.5, 0, Math.PI * 2)
    r.fill()
    r.beginPath()
    r.arc(cx, cy + 6, 4, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'angry') {
    r.fillStyle = '#ffffff'
    r.beginPath()
    r.ellipse(cx - 6, cy - 4, 5.4, 6.1, -0.08, 0, Math.PI * 2)
    r.ellipse(cx + 6, cy - 4, 5.4, 6.1, 0.08, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#111111'
    r.beginPath()
    r.arc(cx - 2.4, cy - 3.2, 2.5, 0, Math.PI * 2)
    r.arc(cx + 2.4, cy - 3.2, 2.5, 0, Math.PI * 2)
    r.fill()
    r.strokeStyle = '#ee8b73'
    r.lineWidth = 2.2
    r.lineCap = 'round'
    r.beginPath()
    r.moveTo(cx - 9, cy - 12)
    r.lineTo(cx - 2.5, cy - 8.5)
    r.moveTo(cx - 0.5, cy - 12)
    r.lineTo(cx - 0.1, cy - 8.5)
    r.moveTo(cx + 9, cy - 12)
    r.lineTo(cx + 2.5, cy - 8.5)
    r.moveTo(cx + 0.5, cy - 12)
    r.lineTo(cx + 0.1, cy - 8.5)
    r.stroke()
    r.fillStyle = '#ee9a8f'
    r.beginPath()
    r.ellipse(cx, cy + 1, 3.5, 2, 0, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#5a1c16'
    r.strokeStyle = '#ffffff'
    r.lineWidth = 1.6
    r.beginPath()
    r.moveTo(cx - 8, cy + 10)
    r.quadraticCurveTo(cx, cy + 2.5, cx + 8, cy + 10)
    r.quadraticCurveTo(cx, cy + 6.5, cx - 8, cy + 10)
    r.closePath()
    r.fill()
    r.stroke()
    r.strokeStyle = '#2b0907'
    r.lineWidth = 1
    r.beginPath()
    r.moveTo(cx - 5.8, cy + 8.6)
    r.quadraticCurveTo(cx, cy + 4.2, cx + 5.8, cy + 8.6)
    r.stroke()
    drawPreviewAngerIcon(r, cx + 20, cy - 8, 10)
  } else if (id === 'round-blue-smile') {
    r.fillStyle = '#4aa3ff'
    r.beginPath()
    r.arc(cx, cy, 13, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#ffffff'
    r.beginPath()
    r.ellipse(cx, cy + 2, 10, 10.5, 0, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#111111'
    r.beginPath()
    r.arc(cx - 5, cy - 4, 2.4, 0, Math.PI * 2)
    r.arc(cx + 5, cy - 4, 2.4, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#ff7f8e'
    r.beginPath()
    r.ellipse(cx, cy + 7, 5, 4, 0, 0, Math.PI * 2)
    r.fill()
    r.strokeStyle = '#8ed6ff'
    r.lineWidth = 1.6
    r.beginPath()
    r.arc(cx - 15, cy - 9, 3, 0, Math.PI * 2)
    r.arc(cx + 15, cy + 7, 2.5, 0, Math.PI * 2)
    r.stroke()
  } else if (id === 'proud') {
    r.fillStyle = '#ffffff'
    r.beginPath()
    r.arc(cx - 6, cy - 4, 3.6, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 4, 3.6, 0, Math.PI * 2)
    r.fill()
    r.fillStyle = '#111111'
    r.beginPath()
    r.arc(cx - 5, cy - 3, 1.6, 0, Math.PI * 2)
    r.arc(cx + 7, cy - 3, 1.6, 0, Math.PI * 2)
    r.fill()
    r.strokeStyle = '#ffffff'
    r.lineWidth = 1.8
    r.beginPath()
    r.moveTo(cx, cy + 1)
    r.lineTo(cx, cy + 5)
    r.moveTo(cx, cy + 5)
    r.quadraticCurveTo(cx - 5, cy + 10, cx - 10, cy + 5)
    r.moveTo(cx, cy + 5)
    r.quadraticCurveTo(cx + 5, cy + 10, cx + 10, cy + 5)
    r.stroke()
    r.fillStyle = '#ff7f8e'
    r.beginPath()
    r.ellipse(cx, cy + 11, 4, 4.6, 0, 0, Math.PI * 2)
    r.fill()
    r.strokeStyle = '#ffd95c'
    r.lineWidth = 1.7
    drawPreviewSpark(r, cx - 14, cy - 10, 3)
    drawPreviewSpark(r, cx + 14, cy - 11, 3.5)
    drawPreviewSpark(r, cx + 14, cy + 7, 2.5)
    drawPreviewSpark(r, cx - 15, cy + 8, 2.3)
  } else if (id === 'wink') {
    r.beginPath()
    r.arc(cx - 6, cy - 3, 3, 0, Math.PI * 2)
    r.fill()
    r.lineWidth = 2
    r.beginPath()
    r.moveTo(cx + 2, cy - 4)
    r.quadraticCurveTo(cx + 6, cy - 1, cx + 10, cy - 4)
    r.stroke()
    drawPreviewSmile(r, cx, cy + 5)
  } else if (id === 'sparkle-eyes') {
    r.beginPath()
    r.arc(cx - 6, cy - 3, 3.2, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 3, 3.2, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
    r.strokeStyle = '#ffd95c'
    r.lineWidth = 1.8
    drawPreviewSpark(r, cx - 14, cy - 10, 3)
    drawPreviewSpark(r, cx + 14, cy - 10, 3)
  } else if (id === 'friend-heart') {
    r.beginPath()
    r.arc(cx - 6, cy - 3, 3, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 3, 3, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
    r.fillStyle = '#ff8ca6'
    r.beginPath()
    r.moveTo(cx + 13, cy - 3)
    r.bezierCurveTo(cx + 7, cy - 8, cx + 11, cy - 13, cx + 14, cy - 9)
    r.bezierCurveTo(cx + 18, cy - 13, cx + 22, cy - 8, cx + 13, cy - 3)
    r.fill()
  } else {
    r.beginPath()
    r.ellipse(cx - 6, cy - 3, 3, 1.8, 0, 0, Math.PI * 2)
    r.ellipse(cx + 6, cy - 3, 3, 1.8, 0, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
  }
}

function drawPreviewSpark(r, x, y, size) {
  r.beginPath()
  r.moveTo(x, y - size)
  r.lineTo(x, y + size)
  r.moveTo(x - size, y)
  r.lineTo(x + size, y)
  r.stroke()
}

function drawPreviewAngerIcon(r, x, y, size) {
  r.save()
  r.lineCap = 'round'
  r.lineJoin = 'round'
  drawPreviewAngerIconStroke(r, x, y, size, '#7b2c2f', size * 0.34)
  drawPreviewAngerIconStroke(r, x, y, size, '#e4474e', size * 0.24)
  r.restore()
}

function drawPreviewAngerIconStroke(r, x, y, size, color, lineWidth) {
  r.strokeStyle = color
  r.lineWidth = lineWidth
  r.beginPath()
  r.moveTo(x - size * 0.28, y - size * 0.62)
  r.quadraticCurveTo(x - size * 0.12, y - size * 0.05, x - size * 0.6, y + size * 0.12)
  r.moveTo(x + size * 0.32, y - size * 0.58)
  r.quadraticCurveTo(x + size * 0.12, y - size * 0.02, x + size * 0.58, y + size * 0.16)
  r.moveTo(x - size * 0.46, y + size * 0.68)
  r.quadraticCurveTo(x, y + size * 0.32, x + size * 0.46, y + size * 0.68)
  r.stroke()
}

function drawPreviewSmile(r, cx, cy) {
  r.save()
  r.strokeStyle = '#ffffff'
  r.lineWidth = 2
  r.lineCap = 'round'
  r.beginPath()
  r.moveTo(cx - 6, cy)
  r.quadraticCurveTo(cx, cy + 5, cx + 6, cy)
  r.stroke()
  r.restore()
}

function drawModal() {
  ctx.fillStyle = 'rgba(0,0,0,0.66)'
  ctx.fillRect(0, 0, W, H)
  var mx = (W - MODAL_W) / 2
  var my = (H - MODAL_H) / 2
  ctx.fillStyle = '#2f2f50'
  drawRoundRect(ctx, mx, my, MODAL_W, MODAL_H, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  drawWorldTabs(ctx, mx, my)

  var levels = getActiveWorldLevels()
  var startX = mx + MODAL_GAP
  var startY = my + MODAL_PAD + MODAL_TAB_H + MODAL_GAP
  var gridH = getModalGridHeight()

  ctx.save()
  ctx.beginPath()
  ctx.rect(mx + MODAL_GAP, startY, MODAL_W - MODAL_GAP * 2, gridH)
  ctx.clip()

  levels.forEach(function (lv, i) {
    var col = i % MODAL_COLS
    var row = Math.floor(i / MODAL_COLS)
    var cx = startX + col * (MODAL_CELL_W + MODAL_GAP)
    var cy = startY + row * (MODAL_CELL_H + MODAL_GAP) - modalScrollY
    if (cy > startY + gridH || cy + MODAL_CELL_H < startY) return
    drawLevelModalCell(ctx, cx, cy, i + 1, completedLevels.includes(lv.id), lv)
  })

  ctx.restore()
  ctx.textBaseline = 'alphabetic'
}

function drawWorldTabs(r, mx, my) {
  var strip = getTabStripRect(mx, my)
  r.save()
  r.beginPath()
  r.rect(strip.x, strip.y - 2, strip.w, strip.h + 4)
  r.clip()

  for (var i = 0; i < LEVEL_WORLDS.length; i++) {
    var world = LEVEL_WORLDS[i]
    var rect = getWorldTabRect(i, mx, my)
    if (rect.x > strip.x + strip.w || rect.x + rect.w < strip.x) continue
    var active = i === activeWorldIndex
    var enabled = world.enabled !== false
    r.fillStyle = '#2f2f50'
    r.strokeStyle = enabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.16)'
    r.lineWidth = 1.4
    drawRoundRect(r, rect.x, rect.y + 2, rect.w, rect.h - 4, 13)
    r.fill()
    if (!active) {
      if (!enabled && typeof r.setLineDash === 'function') r.setLineDash([5, 4])
      r.stroke()
      if (typeof r.setLineDash === 'function') r.setLineDash([])
    }

    if (active) {
      r.strokeStyle = '#ffe8af'
      r.lineWidth = 2
      r.beginPath()
      r.moveTo(rect.x + 14, rect.y + rect.h - 5)
      r.lineTo(rect.x + rect.w - 14, rect.y + rect.h - 5)
      r.stroke()
    }

    r.fillStyle = active ? '#ffe8af' : enabled ? '#d9daec' : '#7d8099'
    r.textAlign = 'center'
    r.textBaseline = 'middle'
    if (enabled) {
      var currentText = getWorldCurrentLevelText(world)
      if (currentText) {
        r.font = '13px sans-serif'
        r.fillText(world.label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 6)
        r.fillStyle = active ? '#fff2c4' : '#aeb1ca'
        r.font = '9px sans-serif'
        r.fillText(currentText, rect.x + rect.w / 2, rect.y + rect.h / 2 + 10)
      } else {
        r.font = '13px sans-serif'
        r.fillText(world.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
      }
    } else {
      r.font = '12px sans-serif'
      r.fillText(world.label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 5)
      r.fillStyle = '#656980'
      r.font = '9px sans-serif'
      r.fillText('\u5373\u5c06\u5f00\u653e', rect.x + rect.w / 2, rect.y + rect.h / 2 + 10)
    }
  }

  r.restore()
  r.strokeStyle = 'rgba(255,255,255,0.16)'
  r.lineWidth = 1
  r.beginPath()
  r.moveTo(strip.x, strip.y + strip.h + 4)
  r.lineTo(strip.x + strip.w, strip.y + strip.h + 4)
  r.stroke()
}

function drawLevelModalCell(r, x, y, number, completed, level) {
  if (completed) {
    var grd = r.createLinearGradient(x, y, x, y + MODAL_CELL_H)
    grd.addColorStop(0, '#ffe8af')
    grd.addColorStop(1, '#ffc75d')
    r.fillStyle = grd
    r.strokeStyle = '#a96d24'
  } else {
    r.fillStyle = '#3c3c61'
    r.strokeStyle = '#62627f'
  }
  r.lineWidth = 1.5
  drawRoundRect(r, x, y, MODAL_CELL_W, MODAL_CELL_H, 10)
  r.fill()
  r.stroke()

  r.textAlign = 'center'
  r.textBaseline = 'middle'
  r.fillStyle = completed ? '#6b4518' : '#d9daec'
  var title = '\u7b2c ' + number + ' \u5173'
  r.font = '14px sans-serif'
  r.fillText(title, x + MODAL_CELL_W / 2, y + 20)
  r.fillStyle = completed ? '#7a4d16' : '#9093ad'
  r.font = '10px sans-serif'
  r.fillText(completed ? '\u5df2\u5b8c\u6210' : '\u672a\u5b8c\u6210', x + MODAL_CELL_W / 2, y + 38)
}

function loop() {
  render()
  if (typeof canvas.requestAnimationFrame === 'function') {
    canvas.requestAnimationFrame(loop)
  } else {
    setTimeout(loop, 16)
  }
}

init()
loop()
