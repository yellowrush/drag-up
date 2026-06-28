// Game Engine - faithful port of original dragUp game
// Ties together maze, cub, input handling, and rendering

import { Maze } from './maze.js';
import { Cub } from './cub.js';
import { GameStorage } from './storage.js';
import { LEVELS, LEVEL_MAP, getLevelIds, getNextLevel } from './levels-data.js';

var TAU = Math.PI * 2;

export class GameEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    // Game objects
    this.maze = null;
    this.cub = Cub;

    // Canvas dimensions (logical pixels, not physical)
    this.canvasSize = { width: 0, height: 0 };
    this.gridSize = 40;
    this.mazeCenter = { x: 0, y: 0 };

    // Pointer state
    this.pointerBehavior = null;
    this.isCubHovered = false;
    this.isCubDragging = false;
    this.dragAngle = null;
    this.cubDragMove = null;
    this.dragStartPosition = null;
    this.dragStartPegPosition = null;
    this.dragStartAngle = null;
    this.dragStartMazeAngle = null;
    this.moveAngle = null;
    this.rotatePointer = null;

    // Animation
    this.animationId = null;
    this.winAnim = null;

    // Callbacks
    this.onLevelComplete = null;
    this.onLevelLoad = null;
    this.onInstructionChange = null;

    // Canvas offset (will be calculated from canvas element's position)
    this.canvasLeft = 0;
    this.canvasTop = 0;

    // Touch hit-testing Y offset: compensate for finger touching below
    // the visual target (0 for H5 with precise mouse/pointer; set to
    // a negative value for MP where finger imprecision is expected)
    this.touchHitOffsetY = 0;

    // Caller is responsible for setupCanvas, loadCurrentLevel, and the render loop
  }

  // ---- initialization ----

  init() {
    this.setupCanvas();
    this.loadCurrentLevel();
    this.startGameLoop();
  }

  setupCanvas(width, height) {
    // Get actual canvas display size (CSS pixels)
    var w, h;
    if (width != null && height != null) {
      w = width;
      h = height;
    } else {
      w = this.canvas.clientWidth || 375;
      h = this.canvas.clientHeight || 667;
    }

    this.canvasSize.width = w;
    this.canvasSize.height = h;

    // Calculate canvas offset relative to the viewport
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      var rect = this.canvas.getBoundingClientRect();
      this.canvasLeft = rect.left;
      this.canvasTop = rect.top;
    } else {
      this.canvasLeft = 0;
      this.canvasTop = 0;
    }

    // Grid size based on smaller dimension
    this.gridSize = Math.min(40, Math.min(w, h) / 12);

    // Maze center: truly center the game content in the canvas.
    // Use the maze's actual gridMax when available; otherwise fall back to a
    // safe default so the initial layout is still centered before the maze loads.
    var gridMax = (this.maze && this.maze.gridMax) || 6;
    var maxMazeRadius = this.gridSize * (gridMax + 2);
    var centerY = h / 2;
    // Ensure the maze does not visually escape the canvas: the center must be
    // at least maxMazeRadius from the top and at least maxMazeRadius from the bottom.
    var minCenterY = maxMazeRadius;
    var maxCenterY = h - maxMazeRadius;
    if (maxCenterY < minCenterY) {
      // Canvas is too small to fully fit; keep it centered anyway.
      centerY = h / 2;
    } else {
      centerY = Math.max(minCenterY, Math.min(maxCenterY, centerY));
    }

    this.mazeCenter = {
      x: w / 2,
      y: centerY,
    };

    // console.log('[engine] setupCanvas', { width: w, height: h, gridSize: this.gridSize, mazeCenter: this.mazeCenter, canvasLeft: this.canvasLeft, canvasTop: this.canvasTop });
  }

  // ---- level loading ----

  loadCurrentLevel() {
    var currentLevelId = GameStorage.getCurrentLevel();
    // Validate stored level ID against LEVEL_MAP
    if (!currentLevelId || !LEVEL_MAP[currentLevelId]) {
      currentLevelId = LEVELS[0].id;
      GameStorage.saveCurrentLevel(currentLevelId);
    }
    this.loadLevel(currentLevelId);
  }

  loadLevel(levelId) {
    var levelData = LEVEL_MAP[levelId];
    if (!levelData) {
      // console.error('Level not found:', levelId, '- falling back to', LEVELS[0].id)
      levelId = LEVELS[0].id;
      levelData = LEVELS[0];
    }

    this.maze = new Maze();
    this.maze.id = levelId;
    this.maze.loadText(levelData.text);

    // Initialize cub at the maze's start position
    if (this.maze.startPosition) {
      this.cub.setPeg(this.maze.startPosition, this.maze.orientation);
      this.cub.setOffset({ x: 0, y: 0 }, this.maze.orientation);
    } else {
      this.cub.reset();
    }

    // Reset drag state
    this.dragAngle = null;
    this.cubDragMove = null;
    this.isCubDragging = false;
    this.pointerBehavior = null;
    this.winAnim = null;

    // Save current level (only valid IDs)
    GameStorage.saveCurrentLevel(levelId);

    // Notify instruction change
    if (this.onInstructionChange) {
      this.onInstructionChange(this.maze.instruction);
    }

    // Callback
    if (this.onLevelLoad) {
      this.onLevelLoad(levelId);
    }

    // Recalculate centering now that the maze's gridMax is known.
    this.setupCanvas(this.canvasSize.width, this.canvasSize.height);
  }

  // ---- game loop ----

  startGameLoop() {
    var self = this;
    function loop() {
      self.update();
      self.render();
      self.animationId = requestAnimationFrame(loop);
    }
    loop();
  }

  stopGameLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  // ---- update ----

  update() {
    // Drag cub along tracks
    this.dragCub();

    // Rotate grid
    if (this.dragAngle !== null) {
      this.maze.flyWheel.setAngle(this.dragAngle);
    } else {
      this.maze.attractAlignFlyWheel();
    }
    this.maze.update();

    // Win animation
    if (this.winAnim) {
      this.winAnim.update();
    }
  }

  // ---- render ----

  render() {
    if (!this.ctx) return;
    if (!this.maze) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);

    // Render rotate handle (pie slice during rotation drag)
    this.renderRotateHandle();

    // Render maze
    this.maze.render(
      this.ctx,
      this.mazeCenter,
      this.gridSize,
      this.maze.flyWheel.angle,
    );

    // Render win animation
    if (this.winAnim) {
      this.winAnim.render(this.ctx);
    }

    // Render cub
    var isHovered = this.isCubHovered || this.isCubDragging;
    this.cub.render(
      this.ctx,
      this.mazeCenter,
      this.gridSize,
      this.maze.flyWheel.angle,
      isHovered,
    );
  }

  renderRotateHandle() {
    if (!this.rotatePointer) return;

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.gridSize * 0.5;
    var color = '#EEE';
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;

    this.ctx.beginPath();
    var pieRadius = this.maze.gridMax * this.gridSize;
    this.ctx.moveTo(this.mazeCenter.x, this.mazeCenter.y);
    var pieDirection =
      normalizeAngle(
        normalizeAngle(this.moveAngle) - normalizeAngle(this.dragStartAngle),
      ) >
      TAU / 2;
    this.ctx.arc(
      this.mazeCenter.x,
      this.mazeCenter.y,
      pieRadius,
      this.dragStartAngle,
      this.moveAngle,
      pieDirection,
    );
    this.ctx.lineTo(this.mazeCenter.x, this.mazeCenter.y);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();
  }

  // ---- pointer handling ----

  // Convert event to {x, y} viewport coordinates for cross-platform compatibility.
  // Accepts either a raw DOM event or an already-converted pointer object from the component.
  getPointer(event) {
    // Already converted object from game-canvas.vue ({x, y, pointerId})
    if (event.x != null || event.y != null) {
      return { x: event.x || 0, y: event.y || 0 };
    }
    // Native PointerEvent / MouseEvent
    if (event.clientX != null) {
      return { x: event.clientX, y: event.clientY };
    }
    // Raw touch event
    var touch =
      (event.touches && event.touches[0]) ||
      (event.changedTouches && event.changedTouches[0]);
    if (touch && touch.clientX != null) {
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: 0, y: 0 };
  }

  handlePointerDown(event) {
    var pointer = this.getPointer(event);
    // For touch devices, shift the hit-test position upward to compensate
    // for finger imprecision (the actual touch point is typically below
    // where the user is looking). Only applied to hit detection, not to
    // drag/rotate tracking — so movement stays accurate.
    var hitPointer = { x: pointer.x, y: pointer.y + this.touchHitOffsetY };
    var isInsideCub = this.getIsInsideCub(hitPointer);
    this.pointerBehavior = isInsideCub ? 'cubDrag' : 'mazeRotate';

    if (this.pointerBehavior === 'cubDrag') {
      this.cubDragPointerDown(pointer);
    } else {
      this.mazeRotatePointerDown(pointer);
    }
  }

  handlePointerMove(event) {
    var pointer = this.getPointer(event);

    if (this.pointerBehavior === 'cubDrag') {
      this.cubDragPointerMove(pointer);
    } else if (this.pointerBehavior === 'mazeRotate') {
      this.mazeRotatePointerMove(pointer);
    }
  }

  handlePointerUp(event) {
    var pointer = this.getPointer(event);

    if (this.pointerBehavior === 'cubDrag') {
      this.cubDragPointerUp(pointer);
    } else if (this.pointerBehavior === 'mazeRotate') {
      this.mazeRotatePointerUp();
    }

    this.pointerBehavior = null;
  }

  // Hover detection (for mouse, not touch)
  handleHover(event) {
    var pointer = this.getPointer(event);
    var isInsideCub = this.getIsInsideCub(pointer);
    if (isInsideCub !== this.isCubHovered) {
      this.isCubHovered = isInsideCub;
    }
  }

  // ---- hit testing ----

  getIsInsideCub(pointer) {
    if (!this.cub.peg || !this.maze) return false;
    var position = this.getCanvasMazePosition(pointer);
    var orientPeg = this.cub[this.maze.orientation];
    if (!orientPeg) return false;
    var cubDeltaX = Math.abs(position.x - orientPeg.x * this.gridSize);
    var cubDeltaY = Math.abs(position.y - orientPeg.y * this.gridSize);
    var bound = this.gridSize * 2;
    var result = cubDeltaX <= bound && cubDeltaY <= bound;
    console.log('[engine] getIsInsideCub', {
      pointer,
      position,
      orientPeg,
      gridSize: this.gridSize,
      bound,
      result,
    });
    return result;
  }

  getCanvasMazePosition(pointer) {
    // Use live getBoundingClientRect so the offset is correct even after
    // scrolling, resizing, or when the canvas is inside a flex container.
    var left = this.canvasLeft;
    var top = this.canvasTop;
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      try {
        var rect = this.canvas.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
      } catch (err) {
        // fallback to cached values
      }
    }
    var canvasX = pointer.x - left;
    var canvasY = pointer.y - top;
    return {
      x: canvasX - this.mazeCenter.x,
      y: canvasY - this.mazeCenter.y,
    };
  }

  // ---- cub drag ----

  cubDragPointerDown(pointer) {
    var segments = this.getCubConnections();
    if (!segments || !segments.length) {
      return;
    }
    this.isCubDragging = true;
    this.dragStartPosition = { x: pointer.x, y: pointer.y };
    this.dragStartPegPosition = {
      x: this.cub[this.maze.orientation].x * this.gridSize + this.mazeCenter.x,
      y: this.cub[this.maze.orientation].y * this.gridSize + this.mazeCenter.y,
    };
  }

  cubDragPointerMove(pointer) {
    if (!this.isCubDragging) return;
    this.cubDragMove = {
      x: pointer.x - this.dragStartPosition.x,
      y: pointer.y - this.dragStartPosition.y,
    };
    // console.log('[engine] cubDragMove', this.cubDragMove)
  }

  cubDragPointerUp() {
    this.cubDragMove = null;
    this.isCubDragging = false;

    // Set at peg (snap to peg)
    this.cub.setOffset({ x: 0, y: 0 }, this.maze.orientation);

    // Check level complete
    if (
      this.cub.peg.x == this.maze.goalPosition.x &&
      this.cub.peg.y == this.maze.goalPosition.y
    ) {
      this.completeLevel();
    }
  }

  // Core drag logic: constrain cub movement to track segments
  dragCub() {
    if (!this.cubDragMove) return;

    var segments = this.getCubConnections();
    if (!segments || !segments.length) return;

    var dragPosition = {
      x: this.dragStartPegPosition.x + this.cubDragMove.x,
      y: this.dragStartPegPosition.y + this.cubDragMove.y,
    };

    // Set peg position (snap to nearest peg along segments)
    var dragPeg = this.getDragPeg(segments, dragPosition);
    this.cub.setPeg(dragPeg, this.maze.orientation);

    // Set drag offset (visual offset from peg)
    var cubDragPosition = this.getDragPosition(segments, dragPosition);
    var cubPosition = this.getCubPosition();
    var offset = {
      x: cubDragPosition.x - cubPosition.x,
      y: cubDragPosition.y - cubPosition.y,
    };
    this.cub.setOffset(offset, this.maze.orientation);
  }

  getCubPosition() {
    return {
      x: this.cub[this.maze.orientation].x * this.gridSize + this.mazeCenter.x,
      y: this.cub[this.maze.orientation].y * this.gridSize + this.mazeCenter.y,
    };
  }

  getCubConnections() {
    var orientPeg = this.cub[this.maze.orientation];
    var key = this.maze.orientation + ':' + orientPeg.x + ',' + orientPeg.y;
    return this.maze.connections[key];
  }

  getDragPosition(segments, dragPosition) {
    if (segments.length === 1) {
      return this.getSegmentDragPosition(segments[0], dragPosition);
    }

    // Get closest segment positions
    var self = this;
    var dragCandidates = segments.map(function (segment) {
      var position = self.getSegmentDragPosition(segment, dragPosition);
      return {
        position: position,
        distance: getDistance(dragPosition, position),
      };
    });

    dragCandidates.sort(distanceSorter);
    return dragCandidates[0].position;
  }

  getSegmentDragPosition(segment, dragPosition) {
    var line = segment[this.maze.orientation];
    var isHorizontal = line.a.y == line.b.y;
    var x, y;
    if (isHorizontal) {
      x = this.getSegmentDragCoord(line, 'x', dragPosition);
      y = line.a.y * this.gridSize + this.mazeCenter.y;
    } else {
      x = line.a.x * this.gridSize + this.mazeCenter.x;
      y = this.getSegmentDragCoord(line, 'y', dragPosition);
    }
    return { x: x, y: y };
  }

  getSegmentDragCoord(line, axis, dragPosition) {
    var a = line.a[axis];
    var b = line.b[axis];
    var min = a < b ? a : b;
    var max = a > b ? a : b;
    min = min * this.gridSize + this.mazeCenter[axis];
    max = max * this.gridSize + this.mazeCenter[axis];
    return Math.max(min, Math.min(max, dragPosition[axis]));
  }

  getDragPeg(segments, dragPosition) {
    var pegs = [];
    var self = this;
    segments.forEach(function (segment) {
      var line = segment[self.maze.orientation];
      addPegPoint(line.a, pegs);
      addPegPoint(line.b, pegs);
    });

    var pegCandidates = pegs.map(function (pegKey) {
      var parts = pegKey.split(',');
      var peg = {
        x: parseInt(parts[0], 10),
        y: parseInt(parts[1], 10),
      };
      var pegPosition = {
        x: peg.x * self.gridSize + self.mazeCenter.x,
        y: peg.y * self.gridSize + self.mazeCenter.y,
      };
      return {
        peg: peg,
        distance: getDistance(dragPosition, pegPosition),
      };
    });

    pegCandidates.sort(distanceSorter);
    return pegCandidates[0].peg;
  }

  // ---- maze rotation ----

  mazeRotatePointerDown(pointer) {
    this.dragStartAngle = this.moveAngle = this.getDragAngle(pointer);
    this.dragStartMazeAngle = this.maze.flyWheel.angle;
    this.dragAngle = this.dragStartMazeAngle;
    this.rotatePointer = pointer;
  }

  getDragAngle(pointer) {
    var position = this.getCanvasMazePosition(pointer);
    return normalizeAngle(Math.atan2(position.y, position.x));
  }

  mazeRotatePointerMove(pointer) {
    this.rotatePointer = pointer;
    this.moveAngle = this.getDragAngle(pointer);
    var deltaAngle = this.moveAngle - this.dragStartAngle;
    this.dragAngle = normalizeAngle(this.dragStartMazeAngle + deltaAngle);
    // console.log('[engine] rotateMove', { moveAngle: this.moveAngle, dragAngle: this.dragAngle })
  }

  mazeRotatePointerUp() {
    this.dragAngle = null;
    this.rotatePointer = null;
  }

  // ---- level completion ----

  completeLevel() {
    // console.log('Level complete!')
    var cubPosition = this.getCubPosition();
    this.winAnim = new WinAnimation(cubPosition.x, cubPosition.y);

    // Save completion
    GameStorage.markLevelCompleted(this.maze.id);

    if (this.onLevelComplete) {
      this.onLevelComplete();
    }
  }

  // ---- cleanup ----

  destroy() {
    this.stopGameLoop();
    this.maze = null;
    this.cub.reset();
  }
}

// ---- utility functions ----

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function getDistance(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceSorter(a, b) {
  return a.distance - b.distance;
}

function addPegPoint(point, pegs) {
  var key = point.x + ',' + point.y;
  if (pegs.indexOf(key) === -1) {
    pegs.push(key);
  }
}

// ---- win animation ----

var winDuration = 1000;

function WinAnimation(x, y) {
  this.x = x;
  this.y = y;
  this.startTime = new Date();
  this.isPlaying = true;
}

WinAnimation.prototype.update = function () {
  if (!this.isPlaying) return;
  this.t = (new Date() - this.startTime) / winDuration;
  this.isPlaying = this.t <= 1;
};

WinAnimation.prototype.render = function (ctx) {
  if (!this.isPlaying) return;

  ctx.save();
  ctx.translate(this.x, this.y);

  // Big burst
  this.renderBurst(ctx);
  // Small burst
  ctx.save();
  ctx.scale(0.5, -0.5);
  this.renderBurst(ctx);
  ctx.restore();

  ctx.restore();
};

WinAnimation.prototype.renderBurst = function (ctx) {
  var t = this.t;
  var dt = 1 - t;
  var easeT = 1 - dt * dt * dt * dt * dt * dt * dt * dt;
  var dy = easeT * -100;
  var scale = (1 - t * t * t) * 1.5;
  var spin = Math.PI * 1 * t * t * t;

  for (var i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate(((Math.PI * 2) / 5) * i);
    ctx.translate(0, dy);
    ctx.scale(scale, scale);
    ctx.rotate(spin);
    renderStar(ctx);
    ctx.restore();
  }
};

function renderStar(ctx) {
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'hsla(50, 100%, 50%, 1)';
  ctx.strokeStyle = 'hsla(50, 100%, 50%, 1)';
  ctx.beginPath();
  for (var i = 0; i < 11; i++) {
    var theta = (Math.PI * 2 * i) / 10 + Math.PI / 2;
    var radius = i % 2 ? 20 : 10;
    var dx = Math.cos(theta) * radius;
    var dy = Math.sin(theta) * radius;
    ctx[i ? 'lineTo' : 'moveTo'](dx, dy);
  }
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}
