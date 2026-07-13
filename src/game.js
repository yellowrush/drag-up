import { GameEngine } from './utils/game-engine.js'
import { GameStorage } from './utils/storage.js'
import { LEVELS, getNextLevel, LEVEL_MAP } from './utils/levels-data.js'

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
var showLevelSelect = false
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
  engine = new GameEngine(canvas, ctx)
  engine.setupCanvas(W, H - HEADER_H)
  engine.canvasLeft = 0
  engine.canvasTop = 0
  engine.loadCurrentLevel()
  currentLevelId = engine.maze.id
  instruction = engine.maze.instruction || ''
  engine.onLevelComplete = function () {
    showNext = true
    GameStorage.markLevelCompleted(engine.maze.id)
    completedLevels = GameStorage.getCompletedLevels()
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
  showNext = false
}

function handleTouchStart(e) {
  var t = e.touches[0]
  var x = t.clientX
  var y = t.clientY

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
      showLevelSelect = true
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
  if (showLevelSelect) {
    var t = findTouch(e.changedTouches, modalTouchId)
    if (t && modalTouchMode === 'tabs' && Math.abs(t.clientX - modalTouchStartX) < 8 && Math.abs(t.clientY - modalTouchStartY) < 8) {
      var mx = (W - MODAL_W) / 2
      var my = (H - MODAL_H) / 2
      for (var i = 0; i < LEVEL_WORLDS.length; i++) {
        var tab = getWorldTabRect(i, mx, my)
        if (isInside(t.clientX, t.clientY, tab.x, tab.y, tab.w, tab.h) && LEVEL_WORLDS[i].enabled !== false) {
          activeWorldIndex = i
          modalScrollY = 0
          break
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
