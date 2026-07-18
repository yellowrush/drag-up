import { renderCubAvatar } from './cub.js'
import { renderRewardSuccessBurst } from './reward-effects.js'

var successAnimationIndex = 0

export function renderGoalIcon(ctx, x, y, mazeAngle, gridSize, icon) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-mazeAngle)

  if (icon === 'box' || !icon) {
    renderCenteredBoxGoal(ctx, gridSize / 200)
  }

  ctx.restore()
}

export function createGoalSuccessAnimation(x, y, icon, gridSize, options) {
  var variant = successAnimationIndex % 3
  successAnimationIndex += 1
  return new GoalSuccessAnimation(x, y, icon || 'box', variant, gridSize, options || {})
}

function renderBoxGoal(ctx) {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(93,58,35,0.23)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 7

  renderSvgBox(ctx)

  ctx.restore()
}

function renderCenteredBoxGoal(ctx, scale) {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(-203, -160)
  renderBoxGoal(ctx)
  ctx.restore()
}

function renderSvgBox(ctx) {
  var frontGradient = ctx.createLinearGradient(65, 121, 211, 277)
  frontGradient.addColorStop(0, '#f4bc74')
  frontGradient.addColorStop(1, '#da9447')

  var sideGradient = ctx.createLinearGradient(211, 142, 340, 142)
  sideGradient.addColorStop(0, '#ca8a49')
  sideGradient.addColorStop(1, '#ae7039')

  var leftFlapGradient = ctx.createLinearGradient(0, 40, 0, 146)
  leftFlapGradient.addColorStop(0, '#f3bd78')
  leftFlapGradient.addColorStop(1, '#e2a156')

  var rightFlapGradient = ctx.createLinearGradient(0, 60, 0, 145)
  rightFlapGradient.addColorStop(0, '#dea25c')
  rightFlapGradient.addColorStop(1, '#c98946')

  renderBackLeftFlap(ctx)
  renderBackRightFlap(ctx, leftFlapGradient)
  renderBoxBody(ctx, frontGradient, sideGradient)
  renderFrontLeftFlap(ctx, leftFlapGradient)
  renderFrontRightFlap(ctx, rightFlapGradient)
  renderCenterJoint(ctx)
  renderPawPrint(ctx)
}

function fillAndStroke(ctx, fillStyle, strokeWidth) {
  ctx.fillStyle = fillStyle
  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = strokeWidth || 5
  ctx.fill()
  ctx.stroke()
}

function renderBackLeftFlap(ctx) {
  ctx.beginPath()
  ctx.moveTo(76, 65)
  ctx.lineTo(172, 43)
  ctx.quadraticCurveTo(181, 41, 184, 50)
  ctx.lineTo(193, 86)
  ctx.lineTo(78, 74)
  ctx.closePath()
  fillAndStroke(ctx, '#ebb069', 5)
}

function renderBackRightFlap(ctx, fillStyle) {
  ctx.beginPath()
  ctx.moveTo(193, 86)
  ctx.lineTo(216, 47)
  ctx.quadraticCurveTo(220, 40, 229, 42)
  ctx.lineTo(329, 60)
  ctx.quadraticCurveTo(338, 62, 342, 70)
  ctx.lineTo(370, 116)
  ctx.quadraticCurveTo(375, 124, 365, 126)
  ctx.lineTo(240, 145)
  ctx.lineTo(213, 93)
  ctx.closePath()
  fillAndStroke(ctx, fillStyle, 5)
}

function renderBoxBody(ctx, frontGradient, sideGradient) {
  ctx.beginPath()
  ctx.moveTo(65, 121)
  ctx.lineTo(211, 142)
  ctx.lineTo(211, 277)
  ctx.lineTo(79, 257)
  ctx.quadraticCurveTo(65, 255, 65, 242)
  ctx.closePath()
  fillAndStroke(ctx, frontGradient, 5)

  ctx.beginPath()
  ctx.moveTo(211, 142)
  ctx.lineTo(340, 121)
  ctx.lineTo(340, 237)
  ctx.quadraticCurveTo(339, 247, 328, 251)
  ctx.lineTo(211, 277)
  ctx.closePath()
  fillAndStroke(ctx, sideGradient, 5)

  ctx.beginPath()
  ctx.moveTo(211, 142)
  ctx.lineTo(211, 277)
  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 4
  ctx.stroke()
}

function renderFrontLeftFlap(ctx, fillStyle) {
  ctx.beginPath()
  ctx.moveTo(77, 65)
  ctx.lineTo(193, 86)
  ctx.lineTo(158, 146)
  ctx.lineTo(40, 128)
  ctx.quadraticCurveTo(32, 127, 36, 119)
  ctx.lineTo(65, 72)
  ctx.quadraticCurveTo(69, 64, 77, 65)
  ctx.closePath()
  fillAndStroke(ctx, fillStyle, 5)
}

function renderFrontRightFlap(ctx, fillStyle) {
  ctx.beginPath()
  ctx.moveTo(193, 86)
  ctx.lineTo(213, 91)
  ctx.lineTo(241, 145)
  ctx.lineTo(365, 126)
  ctx.quadraticCurveTo(373, 124, 369, 116)
  ctx.lineTo(341, 69)
  ctx.closePath()
  fillAndStroke(ctx, fillStyle, 5)
}

function renderCenterJoint(ctx) {
  ctx.beginPath()
  ctx.moveTo(193, 86)
  ctx.lineTo(213, 91)
  ctx.lineTo(211, 142)
  ctx.lineTo(158, 146)
  ctx.closePath()
  fillAndStroke(ctx, '#d8974e', 5)

  ctx.beginPath()
  ctx.moveTo(193, 86)
  ctx.lineTo(213, 91)
  ctx.lineTo(211, 142)
  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 4
  ctx.stroke()
}

function renderPawPrint(ctx) {
  ctx.save()
  ctx.translate(101, 164)
  ctx.fillStyle = '#74400f'

  fillEllipse(ctx, 8, 26, 9, 13, -28)
  fillEllipse(ctx, 29, 11, 9, 13, -8)
  fillEllipse(ctx, 53, 11, 9, 13, 8)
  fillEllipse(ctx, 74, 26, 9, 13, 28)

  ctx.beginPath()
  ctx.moveTo(20, 61)
  ctx.bezierCurveTo(17, 49, 22, 38, 32, 32)
  ctx.bezierCurveTo(38, 28, 45, 28, 51, 32)
  ctx.bezierCurveTo(61, 38, 66, 49, 63, 61)
  ctx.bezierCurveTo(61, 68, 56, 72, 50, 72)
  ctx.bezierCurveTo(46, 72, 44, 69, 41, 69)
  ctx.bezierCurveTo(37, 69, 35, 72, 31, 72)
  ctx.bezierCurveTo(25, 72, 21, 68, 20, 61)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function GoalSuccessAnimation(x, y, icon, variant, gridSize, options) {
  this.x = x
  this.y = y
  this.icon = icon
  this.variant = variant
  this.gridSize = gridSize || 40
  this.accessoryId = options.accessoryId || ''
  this.expressionId = options.expressionId || ''
  this.startTime = new Date()
  this.duration = 900
  this.isPlaying = true
}

GoalSuccessAnimation.prototype.update = function() {
  this.t = (new Date() - this.startTime) / this.duration
  if (this.t > 1) {
    this.t = 1
  }
}

GoalSuccessAnimation.prototype.render = function(ctx) {
  ctx.save()
  ctx.translate(this.x, this.y)

  renderCatInBox(ctx, this.gridSize, this.t, {
    accessoryId: this.accessoryId,
    expressionId: this.expressionId || 'joy',
  })

  if (this.t < 1 && this.variant === 0) {
    renderPawBurst(ctx, this.t)
  } else if (this.t < 1 && this.variant === 1) {
    renderBoxPopLines(ctx, this.t)
  } else if (this.t < 1) {
    renderRibbonBurst(ctx, this.t)
  }

  if (this.t < 1) {
    renderRewardSuccessBurst(ctx, { x: 0, y: -this.gridSize * 0.2 }, this.gridSize * 2.2, this.t, {
      accessoryId: this.accessoryId,
      expressionId: this.expressionId,
    })
  }

  ctx.restore()
}

function renderCatInBox(ctx, gridSize, t, options) {
  var pop = 0.86 + 0.14 * easeOutBack(Math.min(1, t * 1.2))

  ctx.save()
  ctx.scale((gridSize / 175) * pop, (gridSize / 175) * pop)
  ctx.translate(-203, -162)
  renderCatBoxComposite(ctx, options || {})

  ctx.restore()
}

function renderCatBoxComposite(ctx, options) {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  ctx.shadowColor = 'rgba(70,42,22,0.18)'
  ctx.shadowBlur = 7
  ctx.shadowOffsetY = 7

  ctx.save()
  ctx.translate(-30, 0)
  renderCompositeBackFlaps(ctx)
  renderCompositeRightBody(ctx)
  ctx.restore()

  renderPeekingCat(ctx, options)

  ctx.save()
  ctx.translate(-30, 0)
  renderCompositeFrontBody(ctx)
  renderCompositeLeftFrontFlap(ctx)
  ctx.restore()

  ctx.restore()
}

function renderCompositeBackFlaps(ctx) {
  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 5

  ctx.fillStyle = '#e9b66c'
  ctx.beginPath()
  ctx.moveTo(62, 110)
  ctx.lineTo(102, 62)
  ctx.lineTo(177, 54)
  ctx.lineTo(192, 124)
  ctx.lineTo(78, 133)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#e1a45e'
  ctx.beginPath()
  ctx.moveTo(196, 124)
  ctx.lineTo(224, 58)
  ctx.lineTo(326, 72)
  ctx.quadraticCurveTo(336, 74, 341, 84)
  ctx.lineTo(363, 146)
  ctx.quadraticCurveTo(366, 154, 356, 156)
  ctx.lineTo(243, 168)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderCompositeRightBody(ctx) {
  var sideGradient = createHorizontalGradient(ctx, 205, 340, '#c98a49', '#ac6f39')

  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 5

  ctx.fillStyle = sideGradient
  ctx.beginPath()
  ctx.moveTo(205, 145)
  ctx.lineTo(337, 125)
  ctx.lineTo(337, 239)
  ctx.quadraticCurveTo(335, 249, 324, 253)
  ctx.lineTo(205, 279)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderCompositeFrontBody(ctx) {
  var frontGradient = createDiagonalGradient(ctx, 60, 112, 207, 274, '#f4bc74', '#dd984c')

  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 5

  ctx.fillStyle = frontGradient
  ctx.beginPath()
  ctx.moveTo(61, 112)
  ctx.lineTo(196, 87)
  ctx.lineTo(207, 279)
  ctx.lineTo(78, 253)
  ctx.quadraticCurveTo(63, 250, 63, 237)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(196, 87)
  ctx.lineTo(207, 279)
  ctx.stroke()

  ctx.fillStyle = '#74400f'
  ctx.save()
  ctx.translate(96, 167)
  fillEllipse(ctx, 10, 24, 8, 11, -28)
  fillEllipse(ctx, 28, 10, 8, 11, -8)
  fillEllipse(ctx, 49, 10, 8, 11, 8)
  fillEllipse(ctx, 67, 24, 8, 11, 28)
  ctx.beginPath()
  ctx.moveTo(23, 58)
  ctx.bezierCurveTo(20, 46, 25, 37, 34, 32)
  ctx.bezierCurveTo(40, 28, 47, 28, 53, 32)
  ctx.bezierCurveTo(62, 37, 67, 46, 64, 58)
  ctx.bezierCurveTo(62, 66, 56, 70, 50, 70)
  ctx.bezierCurveTo(46, 70, 44, 67, 41, 67)
  ctx.bezierCurveTo(37, 67, 35, 70, 31, 70)
  ctx.bezierCurveTo(26, 70, 24, 65, 23, 58)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function renderCompositeLeftFrontFlap(ctx) {
  ctx.strokeStyle = '#70441f'
  ctx.lineWidth = 5

  ctx.fillStyle = createVerticalGradient(ctx, 72, 160, '#f3bd78', '#e2a156')
  ctx.beginPath()
  ctx.moveTo(76, 67)
  ctx.lineTo(196, 87)
  ctx.lineTo(157, 151)
  ctx.lineTo(38, 132)
  ctx.quadraticCurveTo(31, 131, 35, 123)
  ctx.lineTo(64, 75)
  ctx.quadraticCurveTo(68, 67, 76, 67)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function renderPeekingCat(ctx, options) {
  ctx.save()
  ctx.translate(252, 157)
  renderCubAvatar(ctx, 96, {
    accessoryId: options.accessoryId,
    expressionId: options.expressionId || 'joy',
    isHovered: true,
    lookOffset: { x: 0, y: 0 },
    time: Date.now() / 1000,
  })
  ctx.restore()
}

function renderPeekingEars(ctx) {
  ctx.save()
  ctx.fillStyle = '#1b1b1b'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 7

  tracePeekingLeftEar(ctx)
  ctx.stroke()
  tracePeekingRightEar(ctx)
  ctx.stroke()
  tracePeekingLeftEar(ctx)
  ctx.fill()
  tracePeekingRightEar(ctx)
  ctx.fill()

  ctx.fillStyle = '#f4b0b7'
  ctx.beginPath()
  ctx.moveTo(-33, -29)
  ctx.quadraticCurveTo(-30, -47, -25, -56)
  ctx.quadraticCurveTo(-18, -46, -17, -29)
  ctx.lineTo(-33, -29)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(33, -29)
  ctx.quadraticCurveTo(30, -47, 25, -56)
  ctx.quadraticCurveTo(18, -46, 17, -29)
  ctx.lineTo(33, -29)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function tracePeekingLeftEar(ctx) {
  ctx.beginPath()
  ctx.moveTo(-40, -23)
  ctx.quadraticCurveTo(-35, -53, -26, -66)
  ctx.quadraticCurveTo(-13, -58, -11, -27)
  ctx.lineTo(-40, -23)
  ctx.closePath()
}

function tracePeekingRightEar(ctx) {
  ctx.beginPath()
  ctx.moveTo(40, -23)
  ctx.quadraticCurveTo(35, -53, 26, -66)
  ctx.quadraticCurveTo(13, -58, 11, -27)
  ctx.lineTo(40, -23)
  ctx.closePath()
}

function tracePeekingCatHead(ctx) {
  ctx.beginPath()
  ctx.moveTo(0, -38)
  ctx.bezierCurveTo(28, -38, 44, -17, 47, 1)
  ctx.quadraticCurveTo(49, 4, 48, 7)
  ctx.lineTo(59, 4)
  ctx.lineTo(50, 12)
  ctx.lineTo(62, 14)
  ctx.lineTo(50, 19)
  ctx.lineTo(59, 26)
  ctx.lineTo(46, 25)
  ctx.bezierCurveTo(41, 40, 24, 47, 0, 47)
  ctx.bezierCurveTo(-24, 47, -41, 40, -46, 25)
  ctx.lineTo(-59, 26)
  ctx.lineTo(-50, 19)
  ctx.lineTo(-62, 14)
  ctx.lineTo(-50, 12)
  ctx.lineTo(-59, 4)
  ctx.lineTo(-48, 7)
  ctx.quadraticCurveTo(-49, 4, -47, 1)
  ctx.bezierCurveTo(-44, -17, -28, -38, 0, -38)
  ctx.closePath()
}

function drawSmilingEye(ctx, x, y) {
  ctx.save()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 12, y + 7)
  ctx.quadraticCurveTo(x, y - 5, x + 12, y + 7)
  ctx.stroke()
  ctx.restore()
}

function createDiagonalGradient(ctx, x1, y1, x2, y2, from, to) {
  var gradient = ctx.createLinearGradient(x1, y1, x2, y2)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  return gradient
}

function createHorizontalGradient(ctx, x1, x2, from, to) {
  var gradient = ctx.createLinearGradient(x1, 142, x2, 142)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  return gradient
}

function createVerticalGradient(ctx, y1, y2, from, to) {
  var gradient = ctx.createLinearGradient(0, y1, 0, y2)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  return gradient
}

function renderPawBurst(ctx, t) {
  var ease = easeOutCubic(t)
  var alpha = 1 - t
  ctx.globalAlpha = alpha

  for (var i = 0; i < 8; i++) {
    var angle = (Math.PI * 2 * i) / 8 - Math.PI / 2
    var distance = 18 + ease * 42
    ctx.save()
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance)
    ctx.rotate(angle + Math.PI / 2)
    ctx.scale(0.45 + 0.35 * (1 - t), 0.45 + 0.35 * (1 - t))
    renderPaw(ctx)
    ctx.restore()
  }
}

function renderBoxPopLines(ctx, t) {
  ctx.globalAlpha = 1 - t
  ctx.strokeStyle = '#f0bd72'
  ctx.lineWidth = 4
  for (var i = 0; i < 5; i++) {
    var angle = -Math.PI * 0.85 + i * Math.PI * 0.42
    var r0 = 20 + t * 10
    var r1 = 34 + t * 30
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * r0, Math.sin(angle) * r0)
    ctx.lineTo(Math.cos(angle) * r1, Math.sin(angle) * r1)
    ctx.stroke()
  }
}

function renderRibbonBurst(ctx, t) {
  var ease = easeOutCubic(t)
  ctx.globalAlpha = 1 - t * 0.8
  ctx.lineWidth = 4
  ctx.lineCap = 'round'

  var colors = ['#f0bd72', '#d5964b', '#6b3b13', '#ffffff']
  for (var i = 0; i < 10; i++) {
    var angle = (Math.PI * 2 * i) / 10
    var distance = 14 + ease * 54
    ctx.save()
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance)
    ctx.rotate(angle + t * Math.PI * 2)
    ctx.strokeStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.moveTo(-6, 0)
    ctx.quadraticCurveTo(0, -7, 6, 0)
    ctx.stroke()
    ctx.restore()
  }
}

function renderPaw(ctx) {
  ctx.fillStyle = '#6b3b13'
  fillEllipse(ctx, 0, 4, 5, 5.5)
  fillEllipse(ctx, -7, -3, 3, 3.8)
  fillEllipse(ctx, -2, -7, 3, 4)
  fillEllipse(ctx, 4, -7, 3, 4)
  fillEllipse(ctx, 9, -3, 3, 3.8)
}

function fillEllipse(ctx, x, y, radiusX, radiusY, rotateDegrees) {
  ctx.beginPath()
  ctx.ellipse(
    x,
    y,
    radiusX,
    radiusY,
    ((rotateDegrees || 0) * Math.PI) / 180,
    0,
    Math.PI * 2,
  )
  ctx.fill()
}

function easeOutCubic(t) {
  var d = 1 - t
  return 1 - d * d * d
}

function easeOutBack(t) {
  var c1 = 1.70158
  var c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
