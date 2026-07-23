// Game Engine - faithful port of original dragUp game
// Ties together maze, cub, input handling, and rendering

import { Maze } from './maze.js';
import { Cub } from './cub.js';
import { GameStorage } from './storage.js';
import { LEVELS, LEVEL_MAP } from './levels-data.js';
import { createGoalSuccessAnimation } from './goal-visuals.js';
import { calculateLevelScore } from './rewards.js';

var TAU = Math.PI * 2;
var DRAG_COUNT_THRESHOLD = 6;
var ROTATE_COUNT_THRESHOLD = Math.PI / 36;
var STICKER_CAMERA_CAPTURE_DURATION = 980;

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
    this.dragStartPeg = null;
    this.dragMaxDistance = 0;
    this.dragStartAngle = null;
    this.dragStartMazeAngle = null;
    this.cubLookTarget = null;
    this.moveAngle = null;
    this.rotatePointer = null;
    this.rotateMaxDelta = 0;
    this.equippedAccessoryId = '';
    this.equippedExpressionId = '';
    this.levelStats = this.createLevelStats('');
    this.stickerCameras = [];
    this.cameraCaptureAnim = null;
    this.capturedStickerCameraIds = {};

    // Win animation
    this.winAnim = null;

    // Callbacks
    this.onLevelComplete = null;
    this.onLevelLoad = null;
    this.onInstructionChange = null;
    this.onStickerCameraCapture = null;

    // Canvas offset (will be calculated from canvas element's position)
    this.canvasLeft = 0;
    this.canvasTop = 0;

    // Touch hit-testing Y offset: compensate for finger touching below
    // the visual target (0 for H5 with precise mouse/pointer; set to
    // a negative value for MP where finger imprecision is expected)
    this.touchHitOffsetY = 0;

    // Caller is responsible for setupCanvas, loadCurrentLevel, and the render loop
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

    // Calculate canvas offset relative to the viewport.
    // H5 canvas is a real DOM element and has getBoundingClientRect.
    // MP canvas does not, so we keep the values previously set by initUni().
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      var rect = this.canvas.getBoundingClientRect();
      this.canvasLeft = rect.left;
      this.canvasTop = rect.top;
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
    this.resetLevelStats(levelId);

    // Initialize cub at the maze's start position
    if (this.maze.startPosition) {
      this.cub.setPeg(this.maze.startPosition, this.maze.orientation);
      this.cub.setOffset({ x: 0, y: 0 }, this.maze.orientation);
    } else {
      this.cub.reset();
    }

    // Reset pointer/drag state
    this.resetPointerState();
    this.winAnim = null;
    this.cameraCaptureAnim = null;
    this.capturedStickerCameraIds = {};

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

  createLevelStats(levelId) {
    return {
      levelId: levelId || '',
      dragCount: 0,
      rotateCount: 0,
    };
  }

  resetLevelStats(levelId) {
    this.levelStats = this.createLevelStats(levelId);
  }

  getAttemptStats() {
    var stats = {
      levelId: (this.maze && this.maze.id) || this.levelStats.levelId || '',
      dragCount: this.levelStats.dragCount,
      rotateCount: this.levelStats.rotateCount,
    };
    stats.score = calculateLevelScore(stats);
    return stats;
  }

  setEquippedAccessory(accessoryId) {
    this.equippedAccessoryId = accessoryId || '';
  }

  setEquippedExpression(expressionId) {
    this.equippedExpressionId = expressionId || '';
  }

  setStickerCameras(cameras) {
    var currentLevelId = this.maze && this.maze.id ? this.maze.id : '';
    this.stickerCameras = (Array.isArray(cameras) ? cameras : []).filter(function (camera) {
      return camera && (!currentLevelId || camera.levelId === currentLevelId);
    });
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
    if (
      this.cameraCaptureAnim &&
      Date.now() - this.cameraCaptureAnim.startedAt >= this.cameraCaptureAnim.duration
    ) {
      this.cameraCaptureAnim = null;
    }
  }

  // ---- render ----

  render() {
    if (!this.ctx) return;
    if (!this.maze) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);

    // Render rotate handle (pie slice during rotation drag)
    if (!this.winAnim) {
      this.renderRotateHandle();
    }

    // Render maze
    this.maze.render(
      this.ctx,
      this.mazeCenter,
      this.gridSize,
      this.maze.flyWheel.angle,
      {
        hideGoal: !!this.winAnim,
      },
    );

    if (!this.winAnim) {
      this.renderStickerCameras();
    }

    // Render win animation
    if (this.winAnim) {
      this.winAnim.render(this.ctx);
    }

    // Render cub
    if (!this.winAnim) {
      var isHovered = this.isCubHovered || this.isCubDragging;
      this.cub.render(
        this.ctx,
        this.mazeCenter,
        this.gridSize,
        this.maze.flyWheel.angle,
        isHovered,
        {
          isDragging: this.isCubDragging,
          lookTarget: this.cubLookTarget,
          accessoryId: this.equippedAccessoryId,
          expressionId: this.equippedExpressionId,
        },
      );
    }
    this.renderStickerCameraFlash();
  }

  renderStickerCameras() {
    if (!this.stickerCameras.length) return;
    var self = this;
    this.stickerCameras.forEach(function (camera) {
      if (!camera || !camera.target || self.capturedStickerCameraIds[camera.stickerId]) return;
      var point = self.getStickerCameraScreenPoint(camera);
      drawFloatingStickerCamera(self.ctx, point.x, point.y, self.gridSize, Date.now(), 1);
    });
  }

  renderStickerCameraFlash() {
    if (!this.cameraCaptureAnim) return;
    var elapsed = Date.now() - this.cameraCaptureAnim.startedAt;
    var t = Math.max(0, Math.min(1, elapsed / this.cameraCaptureAnim.duration));
    var alpha = Math.max(0, 1 - t * 1.35);
    var burst = easeOutCubic(Math.min(1, t * 1.4));
    var r = this.ctx;
    drawFloatingStickerCamera(
      r,
      this.cameraCaptureAnim.x,
      this.cameraCaptureAnim.y - burst * this.gridSize * 0.5,
      this.gridSize,
      Date.now(),
      1 - t * 0.25,
    );
    r.save();
    r.globalAlpha = alpha * 0.42;
    r.fillStyle = '#ffffff';
    r.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    r.globalAlpha = alpha;
    r.strokeStyle = '#ffffff';
    r.lineWidth = Math.max(2, this.gridSize * 0.08);
    r.beginPath();
    r.arc(this.cameraCaptureAnim.x, this.cameraCaptureAnim.y, this.gridSize * (0.8 + burst * 1.8), 0, TAU);
    r.stroke();
    r.restore();
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

  // Note: The component always normalizes raw DOM events into {x, y} viewport
  // CSS pixel objects before calling these handlers, so the "event" parameter
  // is always a pre-normalized pointer object (not a raw DOM event).

  handlePointerDown(pointer) {
    if (this.winAnim || this.cameraCaptureAnim) {
      this.resetPointerState();
      return;
    }

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

  handlePointerMove(pointer) {
    if (this.winAnim || this.cameraCaptureAnim) return;

    if (this.pointerBehavior === 'cubDrag') {
      this.cubDragPointerMove(pointer);
    } else if (this.pointerBehavior === 'mazeRotate') {
      this.mazeRotatePointerMove(pointer);
    }
  }

  handlePointerUp(pointer) {
    if (this.winAnim || this.cameraCaptureAnim) {
      this.resetPointerState();
      return;
    }

    if (this.pointerBehavior === 'cubDrag') {
      this.cubDragPointerUp(pointer);
    } else if (this.pointerBehavior === 'mazeRotate') {
      this.mazeRotatePointerUp();
    }

    this.pointerBehavior = null;
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
    return cubDeltaX <= bound && cubDeltaY <= bound;
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
    var canvasPoint = this.getCanvasPoint(pointer, left, top);
    return {
      x: canvasPoint.x - this.mazeCenter.x,
      y: canvasPoint.y - this.mazeCenter.y,
    };
  }

  getCanvasPoint(pointer, cachedLeft, cachedTop) {
    var left = cachedLeft != null ? cachedLeft : this.canvasLeft;
    var top = cachedTop != null ? cachedTop : this.canvasTop;
    if (
      (cachedLeft == null || cachedTop == null) &&
      typeof this.canvas.getBoundingClientRect === 'function'
    ) {
      try {
        var rect = this.canvas.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
      } catch (err) {
        // fallback to cached values
      }
    }
    return {
      x: pointer.x - left,
      y: pointer.y - top,
    };
  }

  // ---- cub drag ----

  resetPointerState() {
    this.pointerBehavior = null;
    this.isCubDragging = false;
    this.dragAngle = null;
    this.cubDragMove = null;
    this.dragStartPosition = null;
    this.dragStartPegPosition = null;
    this.dragStartPeg = null;
    this.dragMaxDistance = 0;
    this.dragStartAngle = null;
    this.dragStartMazeAngle = null;
    this.cubLookTarget = null;
    this.moveAngle = null;
    this.rotatePointer = null;
    this.rotateMaxDelta = 0;
  }

  cubDragPointerDown(pointer) {
    var segments = this.getCubConnections();
    if (!segments || !segments.length) {
      return;
    }
    this.isCubDragging = true;
    this.cubLookTarget = this.getCanvasPoint(pointer);
    this.dragStartPosition = { x: pointer.x, y: pointer.y };
    this.dragStartPeg = {
      x: this.cub.peg.x,
      y: this.cub.peg.y,
    };
    this.dragMaxDistance = 0;
    this.dragStartPegPosition = {
      x: this.cub[this.maze.orientation].x * this.gridSize + this.mazeCenter.x,
      y: this.cub[this.maze.orientation].y * this.gridSize + this.mazeCenter.y,
    };
  }

  cubDragPointerMove(pointer) {
    if (!this.isCubDragging) return;
    this.cubLookTarget = this.getCanvasPoint(pointer);
    this.cubDragMove = {
      x: pointer.x - this.dragStartPosition.x,
      y: pointer.y - this.dragStartPosition.y,
    };
    this.dragMaxDistance = Math.max(
      this.dragMaxDistance,
      getDistance(pointer, this.dragStartPosition),
    );
    // console.log('[engine] cubDragMove', this.cubDragMove)
  }

  cubDragPointerUp() {
    var movedPeg =
      this.dragStartPeg &&
      this.cub.peg &&
      (this.dragStartPeg.x !== this.cub.peg.x ||
        this.dragStartPeg.y !== this.cub.peg.y);
    if (
      this.isCubDragging &&
      (movedPeg || this.dragMaxDistance >= DRAG_COUNT_THRESHOLD)
    ) {
      this.levelStats.dragCount += 1;
    }

    this.cubDragMove = null;
    this.isCubDragging = false;
    this.cubLookTarget = null;

    // Set at peg (snap to peg)
    this.cub.setOffset({ x: 0, y: 0 }, this.maze.orientation);

    this.checkStickerCameraCapture();

    // Check level complete
    if (
      this.cub.peg.x == this.maze.goalPosition.x &&
      this.cub.peg.y == this.maze.goalPosition.y
    ) {
      this.completeLevel();
    }
  }

  checkStickerCameraCapture() {
    if (!this.maze || !this.cub || !this.cub.peg || this.cameraCaptureAnim) return false;
    for (var i = 0; i < this.stickerCameras.length; i++) {
      var camera = this.stickerCameras[i];
      if (!camera || !camera.target || this.capturedStickerCameraIds[camera.stickerId]) continue;
      if (
        Number(camera.target.x) === Number(this.cub.peg.x) &&
        Number(camera.target.y) === Number(this.cub.peg.y)
      ) {
        this.captureStickerCamera(camera);
        return true;
      }
    }
    return false;
  }

  captureStickerCamera(camera) {
    this.capturedStickerCameraIds[camera.stickerId] = true;
    var point = this.getStickerCameraScreenPoint(camera);
    this.cameraCaptureAnim = {
      stickerId: camera.stickerId,
      startedAt: Date.now(),
      duration: STICKER_CAMERA_CAPTURE_DURATION,
      x: point.x,
      y: point.y,
    };
    this.resetPointerState();
    if (this.onStickerCameraCapture) {
      this.onStickerCameraCapture({
        stickerId: camera.stickerId,
        levelId: this.maze.id,
        worldId: camera.worldId || 'cat-box',
        target: camera.target,
      });
    }
  }

  getStickerCameraScreenPoint(camera) {
    var target = camera && camera.target ? camera.target : { x: 0, y: 0 };
    var x = Number(target.x) * this.gridSize;
    var y = Number(target.y) * this.gridSize;
    var angle = this.maze && this.maze.flyWheel ? this.maze.flyWheel.angle : 0;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return {
      x: this.mazeCenter.x + x * cos - y * sin,
      y: this.mazeCenter.y + x * sin + y * cos,
    };
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
    this.rotateMaxDelta = 0;
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
    this.rotateMaxDelta = Math.max(
      this.rotateMaxDelta,
      getAngleDistance(this.moveAngle, this.dragStartAngle),
    );
    // console.log('[engine] rotateMove', { moveAngle: this.moveAngle, dragAngle: this.dragAngle })
  }

  mazeRotatePointerUp() {
    if (this.rotateMaxDelta >= ROTATE_COUNT_THRESHOLD) {
      this.levelStats.rotateCount += 1;
    }
    this.dragAngle = null;
    this.rotatePointer = null;
  }

  // ---- level completion ----

  completeLevel() {
    // console.log('Level complete!')
    var stats = this.getAttemptStats();
    this.resetPointerState();
    var cubPosition = this.getCubPosition();
    this.winAnim = createGoalSuccessAnimation(
      cubPosition.x,
      cubPosition.y,
      this.maze.goalIcon,
      this.gridSize,
      {
        accessoryId: this.equippedAccessoryId,
        expressionId: this.equippedExpressionId || 'joy',
      },
    );

    // Save completion
    GameStorage.markLevelCompleted(this.maze.id);

    if (this.onLevelComplete) {
      this.onLevelComplete(stats);
    }
  }

  // ---- cleanup ----

  destroy() {
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

function getAngleDistance(a, b) {
  var diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, TAU - diff);
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

function easeOutCubic(t) {
  t = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - t, 3);
}

function drawFloatingStickerCamera(ctx, x, y, unit, now, alpha) {
  if (!ctx) return;
  var bob = Math.sin((now || Date.now()) / 320) * unit * 0.08;
  var w = unit * 0.72;
  var h = unit * 0.48;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : Math.max(0, alpha);
  ctx.translate(x, y - unit * 0.72 + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, unit * 0.62, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, unit * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#f7c65d';
  drawCameraRoundRect(ctx, -w / 2, -h / 2, w, h, unit * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#7b4f20';
  ctx.lineWidth = Math.max(1.4, unit * 0.045);
  ctx.stroke();
  ctx.fillStyle = '#fff3c7';
  drawCameraRoundRect(ctx, -w * 0.28, -h * 0.68, w * 0.3, h * 0.28, unit * 0.06);
  ctx.fill();
  ctx.fillStyle = '#3a4461';
  ctx.beginPath();
  ctx.arc(w * 0.1, 0, h * 0.26, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#dff5ff';
  ctx.beginPath();
  ctx.arc(w * 0.1, 0, h * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(w * 0.28, -h * 0.16, h * 0.08, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawCameraRoundRect(ctx, x, y, w, h, radius) {
  var r = Math.min(radius || 0, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

