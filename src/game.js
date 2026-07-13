import { GameEngine } from './utils/game-engine.js'
import { GameStorage } from './utils/storage.js'
import { LEVELS, getNextLevel, LEVEL_MAP } from './utils/levels-data.js'
import { ACCESSORIES, EXPRESSIONS, RewardStorage } from './utils/rewards.js'

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
var activeWorldIndex = 0
var activeRewardTab = 'accessory'

var LEVEL_WORLDS = [
  { id: 'cat-box', label: '\u732b\u7bb1\u5b50', levels: LEVELS, enabled: true },
  { id: 'cat-scratcher', label: '\u732b\u6293\u677f', levels: [], enabled: false },
  { id: 'yarn-ball', label: '\u6bdb\u7ebf\u7403', levels: [], enabled: false },
]
var MODAL_W = 300
var MODAL_COLS = 3
var MODAL_GAP = 8
var MODAL_PAD = 14
var MODAL_TAB_H = 38
var MODAL_TAB_W = 106
var MODAL_TAB_GAP = 8
var MODAL_CELL_H = 54
var MODAL_CELL_W = (MODAL_W - MODAL_GAP * (MODAL_COLS + 1)) / MODAL_COLS
var MODAL_CONTENT_ROWS = Math.ceil(LEVELS.length / MODAL_COLS)
var MODAL_CONTENT_H = MODAL_CONTENT_ROWS * (MODAL_CELL_H + MODAL_GAP) + MODAL_GAP
var MODAL_INNER_H = MODAL_PAD * 2 + MODAL_TAB_H + MODAL_GAP + MODAL_CONTENT_H
var MODAL_H = Math.min(MODAL_INNER_H, H - HEADER_H - 40)
var SCORE_MODAL_W = 320
var SCORE_MODAL_PAD = 14
var SCORE_MODAL_ROW_H = 58
var SCORE_MODAL_GAP = 8
var SCORE_MODAL_HEADER_H = 96
var SCORE_MODAL_H = Math.min(
  SCORE_MODAL_PAD * 2 + SCORE_MODAL_HEADER_H + ACCESSORIES.length * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP),
  H - 40,
)

function isInside(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
}

function getActiveWorld() {
  return LEVEL_WORLDS[activeWorldIndex] || LEVEL_WORLDS[0]
}

function getActiveWorldLevels() {
  return getActiveWorld().levels || []
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
  rewardState = RewardStorage.getState()
  if (engine && engine.setEquippedAccessory) {
    engine.setEquippedAccessory(rewardState.equippedAccessoryId || '')
  }
  if (engine && engine.setEquippedExpression) {
    engine.setEquippedExpression(rewardState.equippedExpressionId || '')
  }
}

function getActiveRewards() {
  var source = activeRewardTab === 'expression' ? EXPRESSIONS : ACCESSORIES
  return source.map(function (item) {
    return {
      id: item.id,
      name: item.name,
      requiredScore: item.requiredScore,
      description: item.description,
      type: activeRewardTab,
    }
  })
}

function isRewardOwned(item) {
  return item.type === 'expression'
    ? rewardState.ownedExpressionIds.indexOf(item.id) !== -1
    : rewardState.ownedAccessoryIds.indexOf(item.id) !== -1
}

function isRewardEquipped(item) {
  return item.type === 'expression'
    ? rewardState.equippedExpressionId === item.id
    : rewardState.equippedAccessoryId === item.id
}

function canUseReward(item) {
  return isRewardOwned(item) || rewardState.totalScore >= item.requiredScore
}

function rewardActionText(item) {
  if (isRewardEquipped(item)) return '\u5378\u4e0b'
  if (isRewardOwned(item)) return '\u88c5\u5907'
  if (rewardState.totalScore >= item.requiredScore) return '\u5151\u6362'
  return '\u672a\u8fbe\u6210'
}

function rewardStatusText(item) {
  if (isRewardEquipped(item)) return '\u5df2\u88c5\u5907'
  if (isRewardOwned(item)) return '\u5df2\u62e5\u6709'
  return item.requiredScore + ' \u79ef\u5206'
}

function useReward(item) {
  if (!canUseReward(item)) return
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
  engine = new GameEngine(canvas, ctx)
  engine.setupCanvas(W, H - HEADER_H)
  engine.canvasLeft = 0
  engine.canvasTop = 0
  engine.loadCurrentLevel()
  refreshRewards()
  currentLevelId = engine.maze.id
  instruction = engine.maze.instruction || ''
  engine.onLevelComplete = function (stats) {
    showNext = true
    GameStorage.markLevelCompleted(engine.maze.id)
    RewardStorage.recordLevelResult(engine.maze.id, stats)
    completedLevels = GameStorage.getCompletedLevels()
    refreshRewards()
  }
  engine.onInstructionChange = function (text) {
    instruction = text
  }
}

function loadLevel(id) {
  engine.loadLevel(id)
  currentLevelId = id
  instruction = engine.maze.instruction || ''
  showLevelSelect = false
  showScoreModal = false
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
      modalTouchId = null
      modalTouchMode = ''
      return
    }
    modalTouchId = t.identifier
    modalTouchStartX = x
    modalTouchStartY = y
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
      var nextId = getNextLevel(engine.maze.id)
      if (nextId) {
        loadLevel(nextId)
      } else {
        completedLevels = GameStorage.getCompletedLevels()
        activeWorldIndex = 0
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
        showNext = false
        instruction = engine.maze.instruction || ''
      }
      return
    }
    if (isInside(x, y, bx + bw + 18, by, bw, bh)) {
      completedLevels = GameStorage.getCompletedLevels()
      activeWorldIndex = 0
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
  if (showScoreModal) return
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
          activeRewardTab = scoreTab
        }
      } else if (modalTouchMode === 'score-list') {
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
    ctx.fillText(instruction, W / 2, SAFE_TOP + TOP_BAR + TEXT_H / 2)
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
    ctx.fillText(instruction, W / 2, SAFE_TOP + TOP_BAR + TEXT_H / 2)
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
  var cy = y + 20
  r.save()
  var grd = r.createLinearGradient(cx, cy - 20, cx, cy + 20)
  grd.addColorStop(0, '#ffe8af')
  grd.addColorStop(1, '#f3b545')
  r.fillStyle = grd
  r.strokeStyle = '#9f6a18'
  r.lineWidth = 2.4
  drawRoundedStar(r, cx, cy, 20, 8, 8)
  r.fill()
  r.stroke()
  r.restore()
}

function drawRoundedStar(r, cx, cy, outerRadius, innerRadius, corner) {
  var points = []
  for (var i = 0; i < 10; i++) {
    var angle = -Math.PI / 2 + i * Math.PI / 5
    var radius = i % 2 === 0 ? outerRadius : innerRadius
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    })
  }
  drawRoundedPolygon(r, points, corner)
}

function drawRoundedPolygon(r, points, corner) {
  r.beginPath()
  for (var i = 0; i < points.length; i++) {
    var prev = points[(i - 1 + points.length) % points.length]
    var point = points[i]
    var next = points[(i + 1) % points.length]
    var from = moveToward(point, prev, corner)
    var to = moveToward(point, next, corner)
    if (i === 0) {
      r.moveTo(from.x, from.y)
    } else {
      r.lineTo(from.x, from.y)
    }
    r.quadraticCurveTo(point.x, point.y, to.x, to.y)
  }
  r.closePath()
}

function moveToward(from, to, distance) {
  var dx = to.x - from.x
  var dy = to.y - from.y
  var length = Math.sqrt(dx * dx + dy * dy) || 1
  return {
    x: from.x + dx / length * distance,
    y: from.y + dy / length * distance,
  }
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
  var rowY = my + SCORE_MODAL_PAD + SCORE_MODAL_HEADER_H + index * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP)
  return {
    x: mx + SCORE_MODAL_W - SCORE_MODAL_PAD - 68,
    y: rowY + 14,
    w: 62,
    h: 30,
  }
}

function getScoreTabRect(type, mx, my) {
  var gap = 8
  var tabW = (SCORE_MODAL_W - SCORE_MODAL_PAD * 2 - gap) / 2
  var tabX = mx + SCORE_MODAL_PAD + (type === 'expression' ? tabW + gap : 0)
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
  return ''
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

  getActiveRewards().forEach(function (item, index) {
    drawScoreAccessoryRow(ctx, item, index, mx, my)
  })
}

function drawScoreTabs(r, mx, my) {
  drawScoreTab(r, getScoreTabRect('accessory', mx, my), '\u9970\u54c1', activeRewardTab === 'accessory')
  drawScoreTab(r, getScoreTabRect('expression', mx, my), '\u8868\u60c5', activeRewardTab === 'expression')
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

function drawScoreAccessoryRow(r, item, index, mx, my) {
  var rowX = mx + SCORE_MODAL_PAD
  var rowY = my + SCORE_MODAL_PAD + SCORE_MODAL_HEADER_H + index * (SCORE_MODAL_ROW_H + SCORE_MODAL_GAP)
  var rowW = SCORE_MODAL_W - SCORE_MODAL_PAD * 2
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
  r.font = 'bold 13px sans-serif'
  r.fillText(item.name, rowX + 54, rowY + 20)
  r.fillStyle = '#aeb0c8'
  r.font = '11px sans-serif'
  r.fillText(rewardStatusText(item), rowX + 54, rowY + 40)

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

function drawRewardPreview(r, item, cx, cy) {
  r.save()
  r.fillStyle = '#222238'
  drawRoundRect(r, cx - 18, cy - 18, 36, 36, 8)
  r.fill()
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
  } else if (id === 'surprised') {
    r.beginPath()
    r.arc(cx - 6, cy - 4, 3.5, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 4, 3.5, 0, Math.PI * 2)
    r.fill()
    r.beginPath()
    r.arc(cx, cy + 6, 4, 0, Math.PI * 2)
    r.fill()
  } else if (id === 'angry') {
    r.lineWidth = 2.4
    r.beginPath()
    r.moveTo(cx - 10, cy - 8)
    r.lineTo(cx - 2, cy - 4)
    r.moveTo(cx + 10, cy - 8)
    r.lineTo(cx + 2, cy - 4)
    r.stroke()
    r.beginPath()
    r.arc(cx - 6, cy - 2, 2.6, 0, Math.PI * 2)
    r.arc(cx + 6, cy - 2, 2.6, 0, Math.PI * 2)
    r.fill()
    r.beginPath()
    r.arc(cx, cy + 8, 5, Math.PI, 0)
    r.stroke()
  } else {
    r.beginPath()
    r.ellipse(cx - 6, cy - 3, 3, 1.8, 0, 0, Math.PI * 2)
    r.ellipse(cx + 6, cy - 3, 3, 1.8, 0, 0, Math.PI * 2)
    r.fill()
    drawPreviewSmile(r, cx, cy + 5)
  }
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
    drawLevelModalCell(ctx, cx, cy, i + 1, completedLevels.includes(lv.id))
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
      r.font = '13px sans-serif'
      r.fillText(world.label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1)
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

function drawLevelModalCell(r, x, y, number, completed) {
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
  r.font = '13px sans-serif'
  r.fillText('\u7b2c ' + number + ' \u5173', x + MODAL_CELL_W / 2, y + 20)
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
