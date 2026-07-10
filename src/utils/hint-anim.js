export class HintAnimation {
  constructor(path) {
    this.path = path || []
    this.progress = 0
    this.duration = 3000
    this.isPlaying = true
    this.startTime = Date.now()
    this.totalDistance = 0

    if (this.path.length > 1) {
      for (var i = 1; i < this.path.length; i++) {
        var dx = this.path[i].x - this.path[i - 1].x
        var dy = this.path[i].y - this.path[i - 1].y
        this.totalDistance += Math.sqrt(dx * dx + dy * dy)
      }
    }
  }

  update() {
    if (!this.isPlaying) return
    var elapsed = Date.now() - this.startTime
    this.progress = Math.min(elapsed / this.duration, 1)
    if (this.progress >= 1) {
      this.isPlaying = false
      this.progress = 1
    }
  }

  render(ctx, mazeCenter, gridSize, angle) {
    if (!this.isPlaying || !this.path || this.path.length < 2) return

    var currentPos = this.getPositionAtProgress(this.progress)

    ctx.save()
    ctx.translate(mazeCenter.x, mazeCenter.y)
    ctx.rotate(angle)

    this.renderTrail(ctx, currentPos, gridSize)
    this.renderGhostBear(ctx, currentPos, gridSize, angle)

    ctx.restore()
  }

  getPositionAtProgress(progress) {
    if (progress <= 0) return { x: this.path[0].x, y: this.path[0].y }
    if (progress >= 1) {
      return {
        x: this.path[this.path.length - 1].x,
        y: this.path[this.path.length - 1].y,
      }
    }

    var targetDist = progress * this.totalDistance
    var accumulated = 0

    for (var i = 1; i < this.path.length; i++) {
      var dx = this.path[i].x - this.path[i - 1].x
      var dy = this.path[i].y - this.path[i - 1].y
      var segDist = Math.sqrt(dx * dx + dy * dy)
      if (accumulated + segDist >= targetDist) {
        var t = (targetDist - accumulated) / segDist
        return {
          x: this.path[i - 1].x + dx * t,
          y: this.path[i - 1].y + dy * t,
        }
      }
      accumulated += segDist
    }

    return { x: this.path[this.path.length - 1].x, y: this.path[this.path.length - 1].y }
  }

  renderTrail(ctx, currentPos, gridSize) {
    ctx.save()
    ctx.setLineDash([gridSize * 0.2, gridSize * 0.2])
    ctx.lineWidth = gridSize * 0.08
    ctx.strokeStyle = 'rgba(204,119,255,0.4)'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    var drawnCount = 0
    for (var i = 0; i < this.path.length; i++) {
      var px = this.path[i].x * gridSize
      var py = this.path[i].y * gridSize
      if (drawnCount === 0) {
        ctx.moveTo(px, py)
      } else {
        ctx.lineTo(px, py)
      }
      drawnCount++
    }

    ctx.stroke()
    ctx.closePath()
    ctx.restore()
  }

  renderGhostBear(ctx, pos, gridSize, angle) {
    var x = pos.x * gridSize
    var y = pos.y * gridSize

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-angle)

    ctx.globalAlpha = 0.5
    ctx.fillStyle = 'rgba(255,82,179,0.6)'

    var drawCircle = function (cx, cy, r) {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.closePath()
    }

    drawCircle(0, 0, gridSize * 0.6)
    drawCircle(gridSize * -0.45, gridSize * -0.35, gridSize * 0.3)
    drawCircle(gridSize * 0.45, gridSize * -0.35, gridSize * 0.3)

    ctx.globalAlpha = 1
    ctx.restore()
  }

  stop() {
    this.isPlaying = false
  }
}
