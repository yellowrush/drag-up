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
var modalTouchStartY = 0
var modalScrollStartY = 0

var MODAL_W = 300
var MODAL_COLS = 3
var MODAL_GAP = 8
var MODAL_CELL_H = 48
var MODAL_CELL_W = (MODAL_W - MODAL_GAP * (MODAL_COLS + 1)) / MODAL_COLS
var MODAL_TITLE_H = 44
var MODAL_CONTENT_ROWS = Math.ceil(LEVELS.length / MODAL_COLS)
var MODAL_CONTENT_H = MODAL_CONTENT_ROWS * (MODAL_CELL_H + MODAL_GAP)
var MODAL_INNER_H = MODAL_TITLE_H + MODAL_CONTENT_H
var MODAL_H = Math.min(MODAL_INNER_H + 20, H - HEADER_H - 40)

function isInside(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh
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
    modalTouchStartY = y
    modalScrollStartY = modalScrollY
    return
  }

  if (showNext) {
    var nx = (W - 180) / 2
    var ny = H - 80
    if (isInside(x, y, nx, ny, 180, 48)) {
      var nextId = getNextLevel(engine.maze.id)
      if (nextId) {
        loadLevel(nextId)
      } else {
        completedLevels = GameStorage.getCompletedLevels()
        modalScrollY = 0
        showLevelSelect = true
      }
      return
    }
  }

  if (y < HEADER_H) {
    var bw = 76
    var bh = 26
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
    if (isInside(x, y, bx + bw + 6, by, bw, bh)) {
      completedLevels = GameStorage.getCompletedLevels()
      modalScrollY = 0
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
      modalScrollY = modalScrollStartY + (modalTouchStartY - t.clientY)
      var maxScroll = Math.max(0, MODAL_INNER_H - (MODAL_H - MODAL_TITLE_H - 10))
      if (modalScrollY < 0) modalScrollY = 0
      if (modalScrollY > maxScroll) modalScrollY = maxScroll
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
    if (t && Math.abs(t.clientY - modalTouchStartY) < 8) {
      var mx = (W - MODAL_W) / 2
      var my = (H - MODAL_H) / 2
      var startX = mx + MODAL_GAP
      var startY = my + MODAL_TITLE_H
      for (var i = 0; i < LEVELS.length; i++) {
        var lv = LEVELS[i]
        var col = i % MODAL_COLS
        var row = Math.floor(i / MODAL_COLS)
        var cx = startX + col * (MODAL_CELL_W + MODAL_GAP)
        var cy = startY + row * (MODAL_CELL_H + MODAL_GAP) - modalScrollY
        if (isInside(t.clientX, t.clientY, cx, cy, MODAL_CELL_W, MODAL_CELL_H)) {
          loadLevel(lv.id)
          break
        }
      }
    }
    modalTouchId = null
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

function drawModal() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(0, 0, W, H)
  var mx = (W - MODAL_W) / 2
  var my = (H - MODAL_H) / 2
  ctx.fillStyle = '#3a3a60'
  drawRoundRect(ctx, mx, my, MODAL_W, MODAL_H, 12)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.rect(mx, my, MODAL_W, MODAL_H)
  ctx.clip()

  var startX = mx + MODAL_GAP
  var startY = my + MODAL_TITLE_H
  ctx.fillStyle = '#fff'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('选择关卡', W / 2, my + MODAL_TITLE_H / 2)

  LEVELS.forEach(function (lv, i) {
    var col = i % MODAL_COLS
    var row = Math.floor(i / MODAL_COLS)
    var cx = startX + col * (MODAL_CELL_W + MODAL_GAP)
    var cy = startY + row * (MODAL_CELL_H + MODAL_GAP) - modalScrollY
    if (completedLevels.includes(lv.id)) {
      ctx.fillStyle = '#4a8a3a'
    } else {
      ctx.fillStyle = '#4a4a75'
    }
    drawRoundRect(ctx, cx, cy, MODAL_CELL_W, MODAL_CELL_H, 8)
    ctx.fill()
    ctx.fillStyle = completedLevels.includes(lv.id) ? '#fff' : '#ddd'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(lv.label, cx + MODAL_CELL_W / 2, cy + MODAL_CELL_H / 2)
  })

  ctx.restore()
  ctx.textBaseline = 'alphabetic'
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
