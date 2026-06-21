// Track segment classes
// Migrated from original game's segment functions

export class FreeSegment {
  constructor(a, b) {
    this.type = 'FreeSegment'
    this.a = a
    this.b = b
    
    // Pre-calculate positions for each orientation
    this.noon = { a: { ...a }, b: { ...b } }
    this.three = { 
      a: { x: -a.y, y: a.x }, 
      b: { x: -b.y, y: b.x } 
    }
    this.six = { 
      a: { x: -a.x, y: -a.y }, 
      b: { x: -b.x, y: -b.y } 
    }
    this.nine = { 
      a: { x: a.y, y: -a.x }, 
      b: { x: b.y, y: -b.x } 
    }
  }

  // Render segment on canvas
  render(ctx, center, gridSize) {
    const ax = this.a.x * gridSize
    const ay = this.a.y * gridSize
    const bx = this.b.x * gridSize
    const by = this.b.y * gridSize
    
    ctx.strokeStyle = 'hsla(200, 80%, 50%, 0.7)'
    ctx.lineWidth = gridSize * 0.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.closePath()
  }
}

export class FixedSegment {
  constructor(a, b) {
    this.type = 'FixedSegment'
    this.a = a
    this.b = b
    
    // Fixed segments don't change with rotation
    this.noon = { a: { ...a }, b: { ...b } }
    this.three = { a: { ...a }, b: { ...b } }
    this.six = { a: { ...a }, b: { ...b } }
    this.nine = { a: { ...a }, b: { ...b } }
  }

  render(ctx, center, gridSize) {
    const ax = this.a.x * gridSize
    const ay = this.a.y * gridSize
    const bx = this.b.x * gridSize
    const by = this.b.y * gridSize
    
    ctx.strokeStyle = 'hsla(30, 100%, 40%, 0.6)'
    ctx.lineWidth = gridSize * 0.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.closePath()
  }
}

export class PivotSegment {
  constructor(a, b) {
    this.type = 'PivotSegment'
    this.a = a
    this.b = b
    this.delta = { x: b.x - a.x, y: b.y - a.y }
    
    // Pivot segments rotate around point a
    this.noon = { a: { ...a }, b: { ...b } }
    this.three = { 
      a: { x: -a.y, y: a.x }, 
      b: { x: -a.y + (b.x - a.x), y: a.x + (b.y - a.y) } 
    }
    this.six = { 
      a: { x: -a.x, y: -a.y }, 
      b: { x: -a.x + (b.x - a.x), y: -a.y + (b.y - a.y) } 
    }
    this.nine = { 
      a: { x: a.y, y: -a.x }, 
      b: { x: a.y + (b.x - a.x), y: -a.x + (b.y - a.y) } 
    }
  }

  render(ctx, center, gridSize, mazeAngle) {
    const ax = this.a.x * gridSize
    const ay = this.a.y * gridSize
    const bx = this.delta.x * gridSize
    const by = this.delta.y * gridSize
    
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate(-mazeAngle)
    
    const color = 'hsla(150, 100%, 35%, 0.7)'
    ctx.strokeStyle = color
    ctx.lineWidth = gridSize * 0.4
    ctx.lineCap = 'round'
    
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(bx, by)
    ctx.stroke()
    ctx.closePath()
    
    // Draw pivot point
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, gridSize * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.closePath()
    
    ctx.restore()
  }
}

export class RotateSegment {
  constructor(a, b) {
    this.type = 'RotateSegment'
    this.a = a
    this.b = b
    this.delta = { x: b.x - a.x, y: b.y - a.y }
    this.theta = Math.atan2(b.y - a.y, b.x - a.x)
    
    // Rotate segments have a fixed point a, and b rotates around it
    this.noon = { a: { ...a }, b: { ...b } }
    this.three = { a: { ...a }, b: this.getB(Math.PI / 2) }
    this.six = { a: { ...a }, b: this.getB(Math.PI) }
    this.nine = { a: { ...a }, b: this.getB(Math.PI * 3 / 2) }
  }

  getB(angle) {
    return {
      x: Math.round(this.a.x + Math.cos(this.theta + angle) * 2),
      y: Math.round(this.a.y + Math.sin(this.theta + angle) * 2)
    }
  }

  render(ctx, center, gridSize, mazeAngle) {
    const ax = this.a.x * gridSize
    const ay = this.a.y * gridSize
    
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate(mazeAngle)
    
    const color = 'hsla(0, 100%, 50%, 0.6)'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = gridSize * 0.8
    ctx.lineJoin = 'round'
    
    // Draw axle (square)
    ctx.rotate(Math.PI / 8)
    ctx.strokeRect(-gridSize * 0.2, -gridSize * 0.2, gridSize * 0.4, gridSize * 0.4)
    ctx.rotate(-Math.PI / 8)
    
    // Draw connecting line
    ctx.lineWidth = gridSize * 0.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(this.delta.x * gridSize, this.delta.y * gridSize)
    ctx.stroke()
    ctx.closePath()
    
    ctx.restore()
  }
}
