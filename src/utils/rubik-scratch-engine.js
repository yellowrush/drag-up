import { GameStorage } from './storage.js';
import { calculateLevelScore } from './rewards.js';
import {
  RUBIK_SCRATCH_LEVELS,
  RUBIK_SCRATCH_LEVEL_MAP,
} from './rubik-scratch-levels.js';
import {
  getRubikFaceNormals,
  getRubikStickerCenterScreen,
  getRubikStickerHit,
  createRubikScratchSuccessAnimation,
  renderRubikScratch,
  rotateRubikQuarter,
  sameVector,
} from './rubik-scratch-renderer.js';

var TURN_DRAG_THRESHOLD = 12;
var TURN_DIRECTION_MIN_SCORE = 0.58;
var TURN_DIRECTION_MARGIN = 0.1;
var TURN_DURATION = 330;

export class RubikScratchEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.canvasSize = { width: 0, height: 0 };
    this.canvasLeft = 0;
    this.canvasTop = 0;
    this.touchHitOffsetY = 0;

    this.level = null;
    this.maze = {
      id: '',
      instruction: '',
      goalIcon: 'scratchpad',
    };
    this.rubik = null;
    this.pointer = null;
    this.levelStats = this.createLevelStats('');
    this.completed = false;
    this.winAnim = null;
    this.lastUpdateAt = Date.now();
    this.equippedAccessoryId = '';
    this.equippedExpressionId = '';

    this.onLevelComplete = null;
    this.onLevelLoad = null;
    this.onInstructionChange = null;
  }

  setupCanvas(width, height) {
    var w = width != null ? width : this.canvas && this.canvas.clientWidth ? this.canvas.clientWidth : 375;
    var h = height != null ? height : this.canvas && this.canvas.clientHeight ? this.canvas.clientHeight : 667;
    this.canvasSize.width = w;
    this.canvasSize.height = h;
    if (this.canvas && typeof this.canvas.getBoundingClientRect === 'function') {
      try {
        var rect = this.canvas.getBoundingClientRect();
        this.canvasLeft = rect.left;
        this.canvasTop = rect.top;
      } catch (err) {
        // Keep cached offsets.
      }
    }
  }

  loadCurrentLevel() {
    var currentLevelId = GameStorage.getCurrentLevel();
    if (!currentLevelId || !RUBIK_SCRATCH_LEVEL_MAP[currentLevelId]) {
      currentLevelId = RUBIK_SCRATCH_LEVELS[0].id;
      GameStorage.saveCurrentLevel(currentLevelId);
    }
    this.loadLevel(currentLevelId);
  }

  loadLevel(levelId) {
    var level = RUBIK_SCRATCH_LEVEL_MAP[levelId] || RUBIK_SCRATCH_LEVELS[0];
    this.level = level;
    this.maze = {
      id: level.id,
      instruction: level.instruction || '',
      goalIcon: 'scratchpad',
    };
    this.rubik = createRubikState(level);
    this.pointer = null;
    this.completed = false;
    this.winAnim = null;
    this.lastUpdateAt = Date.now();
    this.resetLevelStats(level.id);
    GameStorage.saveCurrentLevel(level.id);

    if (this.onInstructionChange) {
      this.onInstructionChange(this.maze.instruction);
    }
    if (this.onLevelLoad) {
      this.onLevelLoad(level.id);
    }
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

  update() {
    if (!this.rubik) return;
    var now = Date.now();
    var dt = Math.min(64, now - this.lastUpdateAt);
    this.lastUpdateAt = now;
    if (this.winAnim) {
      this.winAnim.update();
    }
    if (!this.rubik.turn) return;

    this.rubik.turn.elapsed += dt;
    this.rubik.turn.progress = Math.min(1, this.rubik.turn.elapsed / this.rubik.turn.duration);
    if (this.rubik.turn.progress >= 1) {
      this.commitTurn();
    }
  }

  render() {
    if (!this.ctx || !this.rubik) return;
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    renderRubikScratch(this.ctx, this.rubik, this.canvasSize, {
      completed: this.completed,
      hideCat: !!this.winAnim,
      hideGoal: !!this.winAnim,
      successAnimation: this.winAnim,
      accessoryId: this.equippedAccessoryId,
      expressionId: this.equippedExpressionId,
    });
  }

  handlePointerDown(pointer) {
    if (!this.rubik || this.completed || this.rubik.turn) {
      this.pointer = null;
      return;
    }
    var point = this.getCanvasPoint(pointer);
    var hit = getRubikStickerHit(this.rubik, point, this.canvasSize);
    if (!hit) {
      this.pointer = null;
      return;
    }
    this.pointer = {
      start: point,
      current: point,
      hit: hit,
    };
  }

  handlePointerMove(pointer) {
    if (!this.pointer) return;
    this.pointer.current = this.getCanvasPoint(pointer);
    var turn = this.getTurnFromDrag(this.pointer.hit, this.pointer.start, this.pointer.current);
    if (turn) {
      this.pointer = null;
      this.startTurn(turn);
    }
  }

  handlePointerUp(pointer) {
    if (!this.pointer || !this.rubik || this.rubik.turn) {
      this.pointer = null;
      return;
    }
    var end = this.getCanvasPoint(pointer);
    var turn = this.getTurnFromDrag(this.pointer.hit, this.pointer.start, end);
    this.pointer = null;
    if (turn) {
      this.startTurn(turn);
    }
  }

  getCanvasPoint(pointer) {
    var left = this.canvasLeft;
    var top = this.canvasTop;
    if (this.canvas && typeof this.canvas.getBoundingClientRect === 'function') {
      try {
        var rect = this.canvas.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
      } catch (err) {
        // Keep cached offsets.
      }
    }
    return {
      x: pointer.x - left,
      y: pointer.y - top,
    };
  }

  getTurnFromDrag(hit, start, end) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var threshold = this.getTurnDragThreshold(hit);
    if (distance < threshold) return null;

    var drag = {
      x: dx / distance,
      y: dy / distance,
    };
    var candidates = this.getTurnCandidatesForHit(hit);
    var scored = candidates
      .map(function (candidate) {
        var length = Math.sqrt(
          candidate.vector.x * candidate.vector.x +
          candidate.vector.y * candidate.vector.y,
        );
        if (length <= 0) return null;
        return {
          axis: candidate.axis,
          layer: candidate.layer,
          dir: candidate.dir,
          score: (candidate.vector.x / length) * drag.x + (candidate.vector.y / length) * drag.y,
        };
      })
      .filter(Boolean)
      .filter(function (candidate) {
        return candidate.score > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    if (!scored.length || scored[0].score < TURN_DIRECTION_MIN_SCORE) {
      return null;
    }
    if (
      scored[1] &&
      scored[0].score - scored[1].score < TURN_DIRECTION_MARGIN &&
      distance < threshold * 1.75
    ) {
      return null;
    }

    return {
      axis: scored[0].axis,
      layer: scored[0].layer,
      dir: scored[0].dir,
    };
  }

  getTurnDragThreshold(hit) {
    return Math.max(TURN_DRAG_THRESHOLD, (hit && hit.unit ? hit.unit : 40) * 0.34);
  }

  getTurnCandidatesForHit(hit) {
    if (!hit || !hit.cubie || !hit.cubie.position || !hit.sticker) {
      return [];
    }
    var baseCenter = getRubikStickerCenterScreen(
      hit.cubie,
      hit.sticker.normal,
      null,
      this.canvasSize,
      this.rubik.size,
    );
    var self = this;
    var candidates = [];
    ['x', 'y', 'z'].forEach(function (axis) {
      var layer = hit.cubie.position[axis];
      [-1, 1].forEach(function (dir) {
        var nextCenter = getRubikStickerCenterScreen(
          hit.cubie,
          hit.sticker.normal,
          {
            axis: axis,
            layer: layer,
            dir: dir,
            progress: 1,
          },
          self.canvasSize,
          self.rubik.size,
        );
        var vector = {
          x: nextCenter.x - baseCenter.x,
          y: nextCenter.y - baseCenter.y,
        };
        var length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (length < self.getTurnDragThreshold(hit) * 0.35) {
          return;
        }
        candidates.push({
          axis: axis,
          layer: layer,
          dir: dir,
          vector: vector,
        });
      });
    });
    return candidates;
  }

  startTurn(turn) {
    if (!this.rubik || this.rubik.turn) return;
    this.rubik.turn = {
      axis: turn.axis,
      layer: turn.layer,
      dir: turn.dir,
      elapsed: 0,
      duration: TURN_DURATION,
      progress: 0,
    };
  }

  commitTurn() {
    var turn = this.rubik.turn;
    if (!turn) return;
    this.rubik.cubies.forEach(function (cubie) {
      if (cubie.position[turn.axis] !== turn.layer) return;
      cubie.position = rotateRubikQuarter(cubie.position, turn.axis, turn.dir);
      cubie.stickers.forEach(function (sticker) {
        sticker.normal = rotateRubikQuarter(sticker.normal, turn.axis, turn.dir);
      });
    });
    this.rubik.turn = null;
    this.levelStats.rotateCount += 1;
    this.checkLevelComplete();
  }

  checkLevelComplete() {
    if (this.completed || !this.rubik) return;
    var cat = findCatSticker(this.rubik);
    if (
      cat &&
      sameVector(cat.cubie.position, this.rubik.goal.position) &&
      sameVector(cat.sticker.normal, this.rubik.goal.normal)
    ) {
      this.completeLevel();
    }
  }

  completeLevel() {
    this.completed = true;
    this.winAnim = createRubikScratchSuccessAnimation(this.rubik, this.canvasSize, {
      accessoryId: this.equippedAccessoryId,
      expressionId: this.equippedExpressionId || 'joy',
    });
    GameStorage.markLevelCompleted(this.maze.id);
    if (this.onLevelComplete) {
      this.onLevelComplete(this.getAttemptStats());
    }
  }

  destroy() {
    this.rubik = null;
    this.level = null;
    this.pointer = null;
  }
}

function createRubikState(level) {
  var size = level.size || 2;
  return {
    size: size,
    cubies: createCubies(size, level.cat),
    goal: cloneSlot(level.goal),
    turn: null,
  };
}

function createCubies(size, catSlot) {
  var coords = getCubeCoords(size);
  var cubies = [];
  var id = 0;
  coords.forEach(function (x) {
    coords.forEach(function (y) {
      coords.forEach(function (z) {
        var position = { x: x, y: y, z: z };
        var cubie = {
          id: 'cubie-' + id++,
          position: position,
          stickers: getRubikFaceNormals()
            .filter(function (normal) {
              return isOuterFace(position, normal, coords);
            })
            .map(function (normal) {
              return {
                kind: isSameSlot(position, normal, catSlot) ? 'cat' : 'color',
                normal: { x: normal.x, y: normal.y, z: normal.z },
              };
            }),
        };
        cubies.push(cubie);
      });
    });
  });
  return cubies;
}

function getCubeCoords(size) {
  if (size <= 1) return [0];
  var coords = [];
  var start = -(size - 1);
  for (var i = 0; i < size; i++) {
    coords.push(start + i * 2);
  }
  return coords;
}

function isOuterFace(position, normal, coords) {
  var min = coords[0];
  var max = coords[coords.length - 1];
  if (normal.x > 0) return position.x === max;
  if (normal.x < 0) return position.x === min;
  if (normal.y > 0) return position.y === max;
  if (normal.y < 0) return position.y === min;
  if (normal.z > 0) return position.z === max;
  if (normal.z < 0) return position.z === min;
  return false;
}

function isSameSlot(position, normal, slot) {
  return (
    slot &&
    sameVector(position, slot.position) &&
    sameVector(normal, slot.normal)
  );
}

function cloneSlot(slot) {
  return {
    position: {
      x: slot.position.x,
      y: slot.position.y,
      z: slot.position.z,
    },
    normal: {
      x: slot.normal.x,
      y: slot.normal.y,
      z: slot.normal.z,
    },
  };
}

function findCatSticker(state) {
  for (var i = 0; i < state.cubies.length; i++) {
    var cubie = state.cubies[i];
    for (var j = 0; j < cubie.stickers.length; j++) {
      if (cubie.stickers[j].kind === 'cat') {
        return {
          cubie: cubie,
          sticker: cubie.stickers[j],
        };
      }
    }
  }
  return null;
}
