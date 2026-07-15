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
  vectorKey,
} from './rubik-scratch-renderer.js';

var TURN_DRAG_THRESHOLD = 12;
var TURN_PREVIEW_MIN_SCORE = 0.5;
var TURN_DIRECTION_MIN_SCORE = 0.58;
var TURN_DIRECTION_MARGIN = 0.1;
var TURN_AMBIGUOUS_DISTANCE_MULTIPLIER = 2.4;
var TURN_COMMIT_PROGRESS = 0.38;
var TURN_PREVIEW_MAX_PROGRESS = 0.88;
var TURN_DURATION = 330;
var TELEPORT_DURATION = 620;

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
    this.undoStack = [];
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
    this.undoStack = [];
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
    if (this.rubik.teleport) {
      this.rubik.teleport.elapsed += dt;
      this.rubik.teleport.progress = Math.min(1, this.rubik.teleport.elapsed / this.rubik.teleport.duration);
      if (this.rubik.teleport.progress >= 1) {
        this.rubik.teleport = null;
        this.checkLevelComplete();
      }
      return;
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
    if (!this.rubik || this.completed || this.rubik.turn || this.rubik.teleport) {
      this.pointer = null;
      return;
    }
    var point = this.getCanvasPoint(pointer);
    var hit = getRubikStickerHit(this.rubik, point, this.canvasSize);
    if (!hit) {
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    if (getIsSlotInList(hit.cubie.position, hit.sticker.normal, this.rubik.lockedSlots)) {
      this.pointer = null;
      this.clearInteractionState();
      this.rubik.blockedTouch = {
        key: getSlotKey(hit.cubie.position, hit.sticker.normal),
        startedAt: Date.now(),
      };
      return;
    }
    var candidates = this.getTurnCandidatesForHit(hit);
    if (!candidates.length) {
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    this.pointer = {
      start: point,
      current: point,
      hit: hit,
      candidates: candidates,
    };
    this.updateInteractionState(this.pointer, null);
  }

  handlePointerMove(pointer) {
    if (!this.pointer || !this.rubik || this.rubik.turn) return;
    this.pointer.current = this.getCanvasPoint(pointer);
    var choice = this.getTurnChoiceFromDrag(
      this.pointer.hit,
      this.pointer.start,
      this.pointer.current,
      this.pointer.candidates,
    );
    this.updateInteractionState(this.pointer, choice);
    if (choice && choice.canPreview) {
      this.rubik.previewTurn = {
        axis: choice.turn.axis,
        layer: choice.turn.layer,
        dir: choice.turn.dir,
        progress: choice.previewProgress,
      };
    } else {
      this.rubik.previewTurn = null;
    }
  }

  handlePointerUp(pointer) {
    if (!this.pointer || !this.rubik || this.rubik.turn) {
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    var end = this.getCanvasPoint(pointer);
    var choice = this.getTurnChoiceFromDrag(
      this.pointer.hit,
      this.pointer.start,
      end,
      this.pointer.candidates,
    );
    this.pointer = null;
    this.clearInteractionState();
    if (choice && choice.canCommit) {
      this.startTurn(choice.turn, choice.previewProgress);
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
    var choice = this.getTurnChoiceFromDrag(hit, start, end);
    return choice && choice.canCommit ? choice.turn : null;
  }

  getTurnChoiceFromDrag(hit, start, end, candidates) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var threshold = this.getTurnDragThreshold(hit);
    if (distance < threshold) return null;

    var drag = {
      x: dx / distance,
      y: dy / distance,
    };
    var scored = (candidates || this.getTurnCandidatesForHit(hit))
      .map(function (candidate) {
        var length = candidate.length || Math.sqrt(
          candidate.vector.x * candidate.vector.x + candidate.vector.y * candidate.vector.y,
        );
        if (length <= 0) return null;
        var ux = candidate.vector.x / length;
        var uy = candidate.vector.y / length;
        var score = ux * drag.x + uy * drag.y;
        var projection = dx * ux + dy * uy;
        return {
          axis: candidate.axis,
          layer: candidate.layer,
          dir: candidate.dir,
          candidate: candidate,
          length: length,
          projection: projection,
          progress: projection / length,
          score: score,
        };
      })
      .filter(Boolean)
      .filter(function (candidate) {
        return candidate.score > 0 && candidate.projection > 0;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    if (!scored.length || scored[0].score < TURN_PREVIEW_MIN_SCORE) {
      return null;
    }
    var best = scored[0];
    var margin = scored[1] ? best.score - scored[1].score : 1;
    var progress = clamp(best.progress, 0, TURN_PREVIEW_MAX_PROGRESS);
    var directionReady = best.score >= TURN_DIRECTION_MIN_SCORE;
    var ambiguityCleared =
      margin >= TURN_DIRECTION_MARGIN ||
      distance >= threshold * TURN_AMBIGUOUS_DISTANCE_MULTIPLIER;
    var progressReady = best.progress >= TURN_COMMIT_PROGRESS;

    return {
      turn: {
        axis: best.axis,
        layer: best.layer,
        dir: best.dir,
      },
      candidate: best.candidate,
      score: best.score,
      margin: margin,
      distance: distance,
      previewProgress: progress,
      canPreview: best.score >= TURN_PREVIEW_MIN_SCORE,
      canCommit: directionReady && progressReady && ambiguityCleared,
      ambiguous: directionReady && progressReady && !ambiguityCleared,
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
          start: { x: baseCenter.x, y: baseCenter.y },
          end: { x: nextCenter.x, y: nextCenter.y },
          length: length,
        });
      });
    });
    return candidates;
  }

  updateInteractionState(pointer, choice) {
    if (!this.rubik || !pointer) return;
    this.rubik.interaction = {
      hitCubieId: pointer.hit.cubie.id,
      hitNormalKey: vectorKey(pointer.hit.sticker.normal),
      candidates: pointer.candidates.map(function (candidate) {
        return {
          axis: candidate.axis,
          layer: candidate.layer,
          dir: candidate.dir,
          vector: { x: candidate.vector.x, y: candidate.vector.y },
          start: { x: candidate.start.x, y: candidate.start.y },
          end: { x: candidate.end.x, y: candidate.end.y },
          length: candidate.length,
        };
      }),
      activeTurn: choice && choice.canPreview ? choice.turn : null,
      ambiguous: !!(choice && choice.ambiguous),
    };
  }

  clearInteractionState() {
    if (!this.rubik) return;
    this.rubik.interaction = null;
    this.rubik.previewTurn = null;
  }

  startTurn(turn, initialProgress) {
    if (!this.rubik || this.rubik.turn) return;
    var progress = clamp(initialProgress || 0, 0, TURN_PREVIEW_MAX_PROGRESS);
    this.clearInteractionState();
    this.rubik.turn = {
      axis: turn.axis,
      layer: turn.layer,
      dir: turn.dir,
      elapsed: TURN_DURATION * progress,
      duration: TURN_DURATION,
      progress: progress,
      isUndo: !!turn.isUndo,
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
    if (!turn.isUndo) {
      this.undoStack = [{
        axis: turn.axis,
        layer: turn.layer,
        dir: -turn.dir,
        isUndo: true,
      }];
    }
    this.levelStats.rotateCount += 1;
    if (!turn.isUndo && this.resolveWormhole()) {
      return;
    }
    this.checkLevelComplete();
  }

  resolveWormhole() {
    if (!this.rubik || !this.rubik.wormholes || !this.rubik.wormholes.length) {
      return false;
    }
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var endpoint = findWormholeEndpoint(
      this.rubik.wormholes,
      cat.cubie.position,
      cat.sticker.normal,
    );
    if (!endpoint) return false;
    if (!moveCatToSlot(this.rubik, endpoint.to)) return false;
    this.rubik.wormholeCount += 1;
    this.rubik.teleport = {
      id: endpoint.id || '',
      from: cloneSlot(endpoint.from),
      to: cloneSlot(endpoint.to),
      elapsed: 0,
      duration: TELEPORT_DURATION,
      progress: 0,
    };
    return true;
  }

  undoLastTurn() {
    if (!this.rubik || this.rubik.turn || this.completed) return false;
    this.pointer = null;
    this.clearInteractionState();
    var turn = this.undoStack.pop();
    if (!turn) return false;
    this.startTurn(turn, 0);
    return true;
  }

  checkLevelComplete() {
    if (this.completed || !this.rubik) return;
    var cat = findCatSticker(this.rubik);
    var enoughTurns = this.levelStats.rotateCount >= (this.rubik.minTurns || 0);
    var enoughWormholes =
      (this.rubik.wormholeCount || 0) >= (this.rubik.requiredWormholes || 0);
    if (
      enoughTurns &&
      enoughWormholes &&
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
    this.undoStack = [];
  }
}

function createRubikState(level) {
  var size = level.size || 2;
  return {
    size: size,
    cubies: createCubies(size, level.cat),
    goal: cloneSlot(level.goal),
    minTurns: level.minTurns || 0,
    requiredWormholes: level.requiredWormholes || 0,
    wormholeCount: 0,
    lockedSlots: cloneSlots(level.lockedSlots || []),
    wormholes: cloneWormholes(level.wormholes || []),
    turn: null,
    previewTurn: null,
    interaction: null,
    blockedTouch: null,
    teleport: null,
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

function getIsSlotInList(position, normal, slots) {
  return !!slots && slots.some(function (slot) {
    return isSameSlot(position, normal, slot);
  });
}

function getSlotKey(position, normal) {
  return vectorKey(position) + '|' + vectorKey(normal);
}

function cloneSlots(slots) {
  return (slots || []).map(function (slot) {
    return cloneSlot(slot);
  });
}

function cloneWormholes(wormholes) {
  return (wormholes || []).map(function (wormhole, index) {
    return {
      id: wormhole.id || 'wormhole-' + index,
      from: cloneSlot(wormhole.from),
      to: cloneSlot(wormhole.to),
    };
  });
}

function findWormholeEndpoint(wormholes, position, normal) {
  for (var i = 0; i < wormholes.length; i++) {
    var wormhole = wormholes[i];
    if (isSameSlot(position, normal, wormhole.from)) {
      return {
        id: wormhole.id,
        from: wormhole.from,
        to: wormhole.to,
      };
    }
    if (isSameSlot(position, normal, wormhole.to)) {
      return {
        id: wormhole.id,
        from: wormhole.to,
        to: wormhole.from,
      };
    }
  }
  return null;
}

function moveCatToSlot(state, slot) {
  var target = findStickerAtSlot(state, slot);
  if (!target) return false;
  state.cubies.forEach(function (cubie) {
    cubie.stickers.forEach(function (sticker) {
      if (sticker.kind === 'cat') {
        sticker.kind = 'color';
      }
    });
  });
  target.sticker.kind = 'cat';
  return true;
}

function findStickerAtSlot(state, slot) {
  for (var i = 0; i < state.cubies.length; i++) {
    var cubie = state.cubies[i];
    if (!sameVector(cubie.position, slot.position)) continue;
    for (var j = 0; j < cubie.stickers.length; j++) {
      if (sameVector(cubie.stickers[j].normal, slot.normal)) {
        return {
          cubie: cubie,
          sticker: cubie.stickers[j],
        };
      }
    }
  }
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
