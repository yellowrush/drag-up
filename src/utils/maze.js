// Maze class - manages the grid, tracks, and level parsing
// Faithful port of original game's Maze

import { FreeSegment } from './track-segments.js'
import { FixedSegment } from './track-segments.js'
import { PivotSegment } from './track-segments.js'
import { RotateSegment } from './track-segments.js'
import { FlyWheel } from './flywheel.js'
import { Cub } from './cub.js'
import { renderGoalIcon } from './goal-visuals.js'

var TAU = Math.PI * 2

var orientationAngles = {
  noon: 0,
  three: TAU / 4,
  six: TAU / 2,
  nine: TAU * 3 / 4
}

var orientations = ['noon', 'three', 'six', 'nine']

export class Maze {
  constructor() {
    this.freeSegments = []
    this.fixedSegments = []
    this.pivotSegments = []
    this.rotateSegments = []
    this.flyWheel = new FlyWheel({ friction: 0.8 })
    this.connections = {}
    this.orientation = 'noon'
    this.gridCount = 0
    this.gridMax = 0
    this.startPosition = null
    this.goalPosition = null
    this.goalIcon = 'box'
    this.id = null
    this.instruction = ''
  }

  // Load level from text definition
  loadText(text) {
    // Reset state
    this.freeSegments = []
    this.fixedSegments = []
    this.pivotSegments = []
    this.rotateSegments = []
    this.connections = {}
    this.flyWheel.reset()
    this.orientation = 'noon'
    this.startPosition = null
    this.goalPosition = null
    this.goalIcon = 'box'

    var sections = text.split('---\n')
    var frontMatter = {}
    if (sections.length > 1) {
      frontMatter = getFrontMatter(sections[0])
    }
    this.instruction = frontMatter.instruction || ''
    this.goalIcon = frontMatter.goal || 'box'

    var mazeSrc = sections[sections.length - 1]
    var lines = mazeSrc.split('\n')
    this.gridCount = lines[0].length
    this.gridMax = (this.gridCount - 1) / 2

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]
      var chars = line.split('')
      for (var j = 0; j < chars.length; j++) {
        var character = chars[j]
        var pegX = j - this.gridMax
        var pegY = i - this.gridMax
        var parseMethod = 'parse' + character
        if (this[parseMethod]) {
          this[parseMethod](pegX, pegY)
        }
      }
    }
  }

  connectSegment(segment) {
    var self = this
    orientations.forEach(function(orientation) {
      var line = segment[orientation]
      if (self.getIsPegOut(line.a) || self.getIsPegOut(line.b)) {
        return
      }
      self.connectPeg(segment, orientation, line.a)
      self.connectPeg(segment, orientation, line.b)
    })
  }

  getIsPegOut(peg) {
    return Math.abs(peg.x) > this.gridMax || Math.abs(peg.y) > this.gridMax
  }

  connectPeg(segment, orientation, peg) {
    var key = orientation + ':' + peg.x + ',' + peg.y
    var connection = this.connections[key]
    if (!connection) {
      connection = this.connections[key] = []
    }
    if (connection.indexOf(segment) == -1) {
      connection.push(segment)
    }
  }

  update() {
    this.flyWheel.integrate()
    var angle = this.flyWheel.angle
    if (angle < TAU / 8) {
      this.orientation = 'noon'
    } else if (angle < TAU * 3 / 8) {
      this.orientation = 'three'
    } else if (angle < TAU * 5 / 8) {
      this.orientation = 'six'
    } else if (angle < TAU * 7 / 8) {
      this.orientation = 'nine'
    } else {
      this.orientation = 'noon'
    }
  }

  attractAlignFlyWheel() {
    var angle = this.flyWheel.angle
    var target
    if (angle < TAU / 8) {
      target = 0
    } else if (angle < TAU * 3 / 8) {
      target = TAU / 4
    } else if (angle < TAU * 5 / 8) {
      target = TAU / 2
    } else if (angle < TAU * 7 / 8) {
      target = TAU * 3 / 4
    } else {
      target = TAU
    }
    var attraction = (target - angle) * 0.03
    this.flyWheel.applyForce(attraction)
  }

  render(ctx, center, gridSize, angle, options) {
    var orientationAngle = orientationAngles[angle]
    var gridMax = this.gridMax
    angle = orientationAngle !== undefined ? orientationAngle : angle || 0

    ctx.save()
    ctx.translate(center.x, center.y)

    // fixed segments (don't rotate with grid)
    this.fixedSegments.forEach(function(segment) {
      segment.render(ctx, center, gridSize)
    })

    // rotate segments (rotate around their axis)
    this.rotateSegments.forEach(function(segment) {
      segment.render(ctx, center, gridSize, angle)
    })

    // rotate entire maze
    ctx.rotate(angle)

    ctx.lineWidth = gridSize * 0.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // axle
    ctx.lineWidth = gridSize * 0.2
    ctx.strokeStyle = 'rgba(153,153,153,0.25)'
    ctx.save()
    ctx.rotate(Math.PI / 4)
    ctx.strokeRect(-gridSize / 5, -gridSize / 5, gridSize * 2 / 5, gridSize * 2 / 5)
    ctx.restore()

    // start position
    if (this.startPosition) {
      ctx.strokeStyle = 'rgba(255,51,153,0.4)'
      ctx.lineWidth = gridSize * 0.15
      var startX = this.startPosition.x * gridSize
      var startY = this.startPosition.y * gridSize
      strokeCircle(ctx, startX, startY, gridSize * 0.5)
    }

    // pegs
    for (var pegY = -gridMax; pegY <= gridMax; pegY += 2) {
      for (var pegX = -gridMax; pegX <= gridMax; pegX += 2) {
        var pegXX = pegX * gridSize
        var pegYY = pegY * gridSize
        ctx.fillStyle = 'rgba(166,166,166,0.7)'
        fillCircle(ctx, pegXX, pegYY, gridSize * 0.15)
      }
    }

    // free segments
    this.freeSegments.forEach(function(segment) {
      segment.render(ctx, center, gridSize)
    })

    // pivot segments
    this.pivotSegments.forEach(function(segment) {
      segment.render(ctx, center, gridSize, angle)
    })

    // goal position
    if (this.goalPosition && !options?.hideGoal) {
      var goalX = this.goalPosition.x * gridSize
      var goalY = this.goalPosition.y * gridSize
      renderGoalIcon(ctx, goalX, goalY, angle, gridSize, this.goalIcon)
    }

    ctx.restore()
  }

  reset() {
    this.freeSegments = []
    this.fixedSegments = []
    this.pivotSegments = []
    this.rotateSegments = []
    this.flyWheel.reset()
    this.connections = {}
    this.orientation = 'noon'
    this.startPosition = null
    this.goalPosition = null
    this.goalIcon = 'box'
  }
}

// ---- parse methods (dynamic dispatch: 'parse' + character) ----

// horizontal free segment (-)
Maze.prototype['parse-'] = Maze.prototype.addFreeHorizSegment = function(pegX, pegY) {
  var segment = getHorizSegment(pegX, pegY, FreeSegment)
  this.connectSegment(segment)
  this.freeSegments.push(segment)
}

// vertical free segment (|)
Maze.prototype['parse|'] = Maze.prototype.addFreeVertSegment = function(pegX, pegY) {
  var segment = getVertSegment(pegX, pegY, FreeSegment)
  this.connectSegment(segment)
  this.freeSegments.push(segment)
}

// horizontal fixed segment (=)
Maze.prototype['parse='] = Maze.prototype.addFixedHorizSegment = function(pegX, pegY) {
  var segment = getHorizSegment(pegX, pegY, FixedSegment)
  this.connectSegment(segment)
  this.fixedSegments.push(segment)
}

// vertical fixed segment (!)
Maze.prototype['parse!'] = Maze.prototype.addFixedVertSegment = function(pegX, pegY) {
  var segment = getVertSegment(pegX, pegY, FixedSegment)
  this.connectSegment(segment)
  this.fixedSegments.push(segment)
}

// ---- pivot segments ----

// pivot up (^)
Maze.prototype['parse^'] = Maze.prototype.addPivotUpSegment = function(pegX, pegY) {
  var a = { x: pegX, y: pegY + 1 }
  var b = { x: pegX, y: pegY - 1 }
  var segment = new PivotSegment(a, b)
  this.connectSegment(segment)
  this.pivotSegments.push(segment)
}

// pivot down (v)
Maze.prototype['parsev'] = Maze.prototype.addPivotDownSegment = function(pegX, pegY) {
  var a = { x: pegX, y: pegY - 1 }
  var b = { x: pegX, y: pegY + 1 }
  var segment = new PivotSegment(a, b)
  this.connectSegment(segment)
  this.pivotSegments.push(segment)
}

// pivot left (<)
Maze.prototype['parse<'] = Maze.prototype.addPivotLeftSegment = function(pegX, pegY) {
  var a = { x: pegX + 1, y: pegY }
  var b = { x: pegX - 1, y: pegY }
  var segment = new PivotSegment(a, b)
  this.connectSegment(segment)
  this.pivotSegments.push(segment)
}

// pivot right (>)
Maze.prototype['parse>'] = Maze.prototype.addPivotRightSegment = function(pegX, pegY) {
  var a = { x: pegX - 1, y: pegY }
  var b = { x: pegX + 1, y: pegY }
  var segment = new PivotSegment(a, b)
  this.connectSegment(segment)
  this.pivotSegments.push(segment)
}

// ---- rotate segments ----

Maze.prototype['parse8'] = Maze.prototype.addRotateUpSegment = function(pegX, pegY) {
  var a = { x: pegX, y: pegY + 1 }
  var b = { x: pegX, y: pegY - 1 }
  var segment = new RotateSegment(a, b)
  this.connectSegment(segment)
  this.rotateSegments.push(segment)
}

Maze.prototype['parse4'] = Maze.prototype.addRotateLeftSegment = function(pegX, pegY) {
  var a = { x: pegX + 1, y: pegY }
  var b = { x: pegX - 1, y: pegY }
  var segment = new RotateSegment(a, b)
  this.connectSegment(segment)
  this.rotateSegments.push(segment)
}

Maze.prototype['parse5'] = Maze.prototype.addRotateUpSegment5 = function(pegX, pegY) {
  var a = { x: pegX, y: pegY - 1 }
  var b = { x: pegX, y: pegY + 1 }
  var segment = new RotateSegment(a, b)
  this.connectSegment(segment)
  this.rotateSegments.push(segment)
}

Maze.prototype['parse6'] = Maze.prototype.addRotateRightSegment = function(pegX, pegY) {
  var a = { x: pegX - 1, y: pegY }
  var b = { x: pegX + 1, y: pegY }
  var segment = new RotateSegment(a, b)
  this.connectSegment(segment)
  this.rotateSegments.push(segment)
}

// ---- combo segments ----

// free & fixed horizontal (#)
Maze.prototype['parse#'] = function(pegX, pegY) {
  this.addFreeHorizSegment(pegX, pegY)
  this.addFixedHorizSegment(pegX, pegY)
}

// free & fixed vertical ($)
Maze.prototype['parse$'] = function(pegX, pegY) {
  this.addFreeVertSegment(pegX, pegY)
  this.addFixedVertSegment(pegX, pegY)
}

// pivot up + fixed vertical (I)
Maze.prototype['parseI'] = function(pegX, pegY) {
  this.addPivotUpSegment(pegX, pegY)
  this.addFixedVertSegment(pegX, pegY)
}

// pivot left + fixed horizontal (J)
Maze.prototype['parseJ'] = function(pegX, pegY) {
  this.addPivotLeftSegment(pegX, pegY)
  this.addFixedHorizSegment(pegX, pegY)
}

// pivot down + fixed vertical (K)
Maze.prototype['parseK'] = function(pegX, pegY) {
  this.addPivotDownSegment(pegX, pegY)
  this.addFixedVertSegment(pegX, pegY)
}

// pivot right + fixed horizontal (L)
Maze.prototype['parseL'] = function(pegX, pegY) {
  this.addPivotRightSegment(pegX, pegY)
  this.addFixedHorizSegment(pegX, pegY)
}

// pivot up + free vertical (W)
Maze.prototype['parseW'] = function(pegX, pegY) {
  this.addPivotUpSegment(pegX, pegY)
  this.addFreeVertSegment(pegX, pegY)
}

// pivot left + free horizontal (A)
Maze.prototype['parseA'] = function(pegX, pegY) {
  this.addPivotLeftSegment(pegX, pegY)
  this.addFreeHorizSegment(pegX, pegY)
}

// pivot down + free vertical (S)
Maze.prototype['parseS'] = function(pegX, pegY) {
  this.addPivotDownSegment(pegX, pegY)
  this.addFreeVertSegment(pegX, pegY)
}

// pivot right + free horizontal (D)
Maze.prototype['parseD'] = function(pegX, pegY) {
  this.addPivotRightSegment(pegX, pegY)
  this.addFreeHorizSegment(pegX, pegY)
}

// ---- start & goal ----

// start position (@)
Maze.prototype['parse@'] = function(pegX, pegY) {
  this.startPosition = { x: pegX, y: pegY }
  Cub.setPeg(this.startPosition, 'noon')
}

// goal position (*)
Maze.prototype['parse*'] = function(pegX, pegY) {
  this.goalPosition = { x: pegX, y: pegY }
}

// ---- helper functions ----

function getHorizSegment(pegX, pegY, Segment) {
  var a = { x: pegX + 1, y: pegY }
  var b = { x: pegX - 1, y: pegY }
  return new Segment(a, b)
}

function getVertSegment(pegX, pegY, Segment) {
  var a = { x: pegX, y: pegY + 1 }
  var b = { x: pegX, y: pegY - 1 }
  return new Segment(a, b)
}

function fillCircle(ctx, x, y, radius) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.closePath()
}

function strokeCircle(ctx, x, y, radius) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.closePath()
}

function getFrontMatter(text) {
  if (!text) return {}
  var frontMatter = {}
  text.split('\n').forEach(function(line) {
    if (!line) return
    var parts = line.split(':')
    var key = parts[0].trim()
    var value = parts[1] ? parts[1].trim() : ''
    if (value === 'true') {
      value = true
    } else if (value === 'false') {
      value = false
    }
    frontMatter[key] = value
  })
  return frontMatter
}
