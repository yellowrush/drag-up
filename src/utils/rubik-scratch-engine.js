import { GameStorage } from './storage.js';
import { calculateLevelScore } from './rewards.js';
import {
  RUBIK_SCRATCH_LEVELS,
  RUBIK_SCRATCH_LEVEL_MAP,
} from './rubik-scratch-levels.js';
import {
  getRubikFaceNormals,
  getRubikCatStickerHit,
  getRubikStickerCenterScreen,
  createRubikScratchSuccessAnimation,
  renderRubikScratch,
  rotateRubikQuarter,
  sameVector,
  vectorKey,
} from './rubik-scratch-renderer.js';

var TURN_DRAG_THRESHOLD = 12;
var TURN_MIN_DRAG_DISTANCE = 1.2;
var TURN_PREVIEW_MIN_SCORE = 0.5;
var TURN_DIRECTION_MIN_SCORE = 0.58;
var TURN_DIRECTION_MARGIN = 0.1;
var TURN_DIRECTION_LONG_DRAG_MARGIN = 0.055;
var TURN_AMBIGUOUS_DISTANCE_MULTIPLIER = 2.4;
var TURN_COMMIT_PROGRESS = 0.38;
var TURN_PREVIEW_MAX_PROGRESS = 0.88;
var TURN_INTENT_PREVIEW_PROGRESS = 0.46;
var TURN_CONFIRM_PREVIEW_PROGRESS = 0.52;
var TURN_PREVIEW_RETURN_DURATION = 120;
var TURN_PREVIEW_SELECT_DURATION = 150;
var TURN_DURATION = 330;
var TELEPORT_DURATION = 620;
var GRAVITY_DURATION = 520;
var FOLD_DURATION = 520;
var GOAL_SPECIAL_MOVE_DURATION = 320;
var FORCED_TURN_CHAIN_LIMIT = 4;

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
    this.confirmPicker = null;
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
    this.confirmPicker = null;
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
        this.resolvePostMoveEffects({
          allowWormhole: false,
          allowGravity: true,
          allowForced: true,
        });
      }
      return;
    }
    if (this.rubik.gravityMove) {
      this.rubik.gravityMove.elapsed += dt;
      this.rubik.gravityMove.progress = Math.min(1, this.rubik.gravityMove.elapsed / this.rubik.gravityMove.duration);
      if (this.rubik.gravityMove.progress >= 1) {
        this.rubik.gravityMove = null;
        this.resolvePostMoveEffects({
          allowWormhole: true,
          allowFold: true,
          allowGravity: false,
          allowForced: true,
        });
      }
      return;
    }
    if (this.rubik.foldMove) {
      this.rubik.foldMove.elapsed += dt;
      this.rubik.foldMove.progress = Math.min(1, this.rubik.foldMove.elapsed / this.rubik.foldMove.duration);
      if (this.rubik.foldMove.progress >= 1) {
        this.rubik.foldMove = null;
        this.resolvePostMoveEffects({
          allowWormhole: true,
          allowFold: false,
          allowGravity: true,
          allowForced: true,
        });
      }
      return;
    }
    this.updatePreviewTween(dt);
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
    if (!this.rubik || this.completed || this.rubik.turn || this.rubik.teleport || this.rubik.gravityMove || this.rubik.foldMove) {
      this.pointer = null;
      return;
    }
    var point = this.getCanvasPoint(pointer);
    if (this.handleConfirmPickerTap(point)) {
      return;
    }
    var catHit = getRubikCatStickerHit(this.rubik, point, this.canvasSize);
    if (!catHit) {
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    var candidates = this.getTurnCandidatesForHit(catHit);
    if (!candidates.length) {
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    this.pointer = {
      start: point,
      current: point,
      hit: catHit,
      candidates: candidates,
      choice: null,
      hasDragIntent: false,
    };
    this.confirmPicker = null;
    this.updateInteractionState(this.pointer, null);
  }

  handlePointerMove(pointer) {
    if (!this.pointer || !this.rubik || this.rubik.turn) return;
    this.pointer.current = this.getCanvasPoint(pointer);
    this.pointer.hasDragIntent =
      this.pointer.hasDragIntent ||
      getPointDistance(this.pointer.start, this.pointer.current) >= TURN_MIN_DRAG_DISTANCE;
    var choice = this.getTurnChoiceFromDrag(
      this.pointer.hit,
      this.pointer.start,
      this.pointer.current,
      this.pointer.candidates,
      { allowPointChoice: false },
    );
    if (choice && choice.canPreview) {
      this.selectPointerChoice(this.pointer, choice);
    } else {
      this.pointer.choice = null;
      this.rubik.previewTurn = null;
      this.rubik.previewTween = null;
    }
    this.updateInteractionState(this.pointer, choice);
  }

  handlePointerUp(pointer) {
    if (!this.pointer || !this.rubik || this.rubik.turn) {
      if (this.confirmPicker && this.rubik && !this.rubik.turn) {
        return;
      }
      this.pointer = null;
      this.clearInteractionState();
      return;
    }
    var end = this.getCanvasPoint(pointer);
    var hasDragIntent =
      this.pointer.hasDragIntent ||
      getPointDistance(this.pointer.start, end) >= TURN_MIN_DRAG_DISTANCE;
    var choice = this.getTurnChoiceFromDrag(
      this.pointer.hit,
      this.pointer.start,
      end,
      this.pointer.candidates,
      {
        allowPointChoice: false,
        forceCommit: hasDragIntent,
        minDistance: hasDragIntent ? TURN_MIN_DRAG_DISTANCE : null,
      },
    );
    if (choice && choice.canPreview) {
      this.selectPointerChoice(this.pointer, choice);
    }
    var initialProgress = choice ? this.getTurnStartProgress(choice) : 0;
    if (choice && choice.canCommit) {
      this.pointer = null;
      this.startTurn(choice.turn, initialProgress);
    } else {
      this.startConfirmPicker(this.pointer, choice && choice.candidate);
      this.pointer = null;
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

  getTurnChoiceFromDrag(hit, start, end, candidates, options) {
    options = options || {};
    if (options.allowPointChoice !== false) {
      var arrowChoice = this.getTurnChoiceFromPoint(end, candidates || this.getTurnCandidatesForHit(hit));
      if (arrowChoice) return arrowChoice;
    }

    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var threshold = this.getTurnDragThreshold(hit);
    var minDistance = options.minDistance != null ? options.minDistance : threshold;
    if (distance < minDistance) return null;

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
      (
        margin >= TURN_DIRECTION_LONG_DRAG_MARGIN &&
        distance >= threshold * TURN_AMBIGUOUS_DISTANCE_MULTIPLIER
      );
    var progressReady = best.progress >= TURN_COMMIT_PROGRESS;
    var forceCommit = !!options.forceCommit;

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
      canCommit: forceCommit || (directionReady && progressReady && ambiguityCleared),
      ambiguous: !forceCommit && directionReady && progressReady && !ambiguityCleared,
    };
  }

  getTurnChoiceFromPoint(point, candidates) {
    if (!point || !candidates || !candidates.length) return null;
    var hits = candidates
      .map(function (candidate) {
        var center = candidate.buttonCenter || candidate.end;
        var dx = point.x - center.x;
        var dy = point.y - center.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var radius = candidate.hitRadius || TURN_DRAG_THRESHOLD;
        return {
          candidate: candidate,
          distance: distance,
          radius: radius,
        };
      })
      .filter(function (hit) {
        return hit.distance <= hit.radius;
      })
      .sort(function (a, b) {
        return a.distance - b.distance;
      });
    if (!hits.length) return null;
    var candidate = hits[0].candidate;
    return {
      turn: {
        axis: candidate.axis,
        layer: candidate.layer,
        dir: candidate.dir,
      },
      candidate: candidate,
      score: 1,
      margin: 1,
      distance: hits[0].distance,
      previewProgress: TURN_INTENT_PREVIEW_PROGRESS,
      canPreview: true,
      canCommit: true,
      ambiguous: false,
    };
  }

  getTurnDragThreshold(hit) {
    return Math.max(TURN_DRAG_THRESHOLD, (hit && hit.unit ? hit.unit : 40) * 0.34);
  }

  handleConfirmPickerTap(point) {
    if (!this.confirmPicker || !this.rubik || !this.rubik.interaction) {
      return false;
    }
    var action = this.getConfirmPickerAction(point);
    if (!action) {
      this.clearInteractionState();
      return false;
    }
    if (action === 'confirm') {
      var choice = this.getConfirmPickerChoice();
      if (!choice) {
        this.clearInteractionState();
        return true;
      }
      var initialProgress = this.getTurnStartProgress(choice, TURN_CONFIRM_PREVIEW_PROGRESS);
      this.startTurn(choice.turn, initialProgress);
      return true;
    }
    if (action === 'next') {
      this.stepConfirmPicker(1);
      return true;
    }
    if (action === 'prev') {
      this.stepConfirmPicker(-1);
      return true;
    }
    this.clearInteractionState();
    return true;
  }

  getConfirmPickerAction(point) {
    var confirm = this.rubik && this.rubik.interaction && this.rubik.interaction.confirm;
    if (!point || !confirm) return '';
    if (isPointInCircle(point, confirm.confirmCenter, confirm.radius)) return 'confirm';
    if (confirm.total > 1 && isPointInCircle(point, confirm.nextCenter, confirm.radius)) return 'next';
    if (confirm.total > 1 && isPointInCircle(point, confirm.prevCenter, confirm.radius)) return 'prev';
    return '';
  }

  getConfirmPickerChoice() {
    if (!this.confirmPicker || !this.confirmPicker.candidates.length) return null;
    var candidate = this.confirmPicker.candidates[this.confirmPicker.index];
    if (!candidate) return null;
    return {
      turn: {
        axis: candidate.axis,
        layer: candidate.layer,
        dir: candidate.dir,
      },
      candidate: candidate,
      score: 1,
      margin: 1,
      distance: 0,
      previewProgress: TURN_CONFIRM_PREVIEW_PROGRESS,
      canPreview: true,
      canCommit: true,
      ambiguous: false,
    };
  }

  startConfirmPicker(pointer, seedCandidate) {
    if (!this.rubik || !pointer || !pointer.candidates || !pointer.candidates.length) {
      this.clearInteractionState();
      return;
    }
    var index = 0;
    if (seedCandidate) {
      var seedIndex = pointer.candidates.findIndex(function (candidate) {
        return candidate.axis === seedCandidate.axis &&
          candidate.layer === seedCandidate.layer &&
          candidate.dir === seedCandidate.dir;
      });
      if (seedIndex >= 0) index = seedIndex;
    }
    this.confirmPicker = {
      hit: pointer.hit,
      candidates: pointer.candidates,
      index: index,
      startedAt: Date.now(),
    };
    this.updateConfirmPickerState();
  }

  stepConfirmPicker(offset) {
    if (!this.confirmPicker || !this.confirmPicker.candidates.length) return;
    var total = this.confirmPicker.candidates.length;
    this.confirmPicker.index = (this.confirmPicker.index + offset + total) % total;
    this.updateConfirmPickerState();
  }

  updateConfirmPickerState() {
    if (!this.rubik || !this.confirmPicker) return;
    var choice = this.getConfirmPickerChoice();
    if (!choice) {
      this.clearInteractionState();
      return;
    }
    this.startPreviewTween(choice.turn, TURN_CONFIRM_PREVIEW_PROGRESS);
    var candidate = choice.candidate;
    this.rubik.interaction = {
      mode: 'confirm',
      hitCubieId: this.confirmPicker.hit.cubie.id,
      hitNormalKey: vectorKey(this.confirmPicker.hit.sticker.normal),
      hitCenter: {
        x: this.confirmPicker.hit.center.x,
        y: this.confirmPicker.hit.center.y,
      },
      candidates: [this.getInteractionCandidateData(candidate)],
      activeTurn: choice.turn,
      ambiguous: false,
      confirm: this.getConfirmPickerControls(),
    };
  }

  getConfirmPickerControls() {
    var unit = this.confirmPicker && this.confirmPicker.hit && this.confirmPicker.hit.unit
      ? this.confirmPicker.hit.unit
      : 40;
    var radius = Math.max(24, unit * 0.64);
    var width = this.canvasSize.width || 375;
    var height = this.canvasSize.height || 600;
    var centerX = width / 2;
    var y = clamp(height - radius - unit * 0.42, radius + unit * 0.42, height - radius - unit * 0.2);
    var gap = Math.max(radius * 2.15, unit * 1.48);
    return {
      confirmCenter: { x: centerX, y: y },
      prevCenter: { x: centerX - gap, y: y },
      nextCenter: { x: centerX + gap, y: y },
      radius: radius,
      index: this.confirmPicker.index,
      total: this.confirmPicker.candidates.length,
    };
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
      if (isTurnLocked(self.rubik, axis, layer)) {
        return;
      }
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
        var actualVector = {
          x: nextCenter.x - baseCenter.x,
          y: nextCenter.y - baseCenter.y,
        };
        var actualLength = Math.sqrt(actualVector.x * actualVector.x + actualVector.y * actualVector.y);
        if (actualLength < self.getTurnDragThreshold(hit) * 0.35) {
          return;
        }
        var unit = hit.unit || 40;
        var ux = actualVector.x / actualLength;
        var uy = actualVector.y / actualLength;
        var startOffset = unit * 0.96;
        var endOffset = Math.max(unit * 2.38, Math.min(unit * 3.15, actualLength * 1.62));
        var arrowStart = {
          x: baseCenter.x + ux * startOffset,
          y: baseCenter.y + uy * startOffset,
        };
        var arrowEnd = {
          x: baseCenter.x + ux * endOffset,
          y: baseCenter.y + uy * endOffset,
        };
        var vector = {
          x: arrowEnd.x - arrowStart.x,
          y: arrowEnd.y - arrowStart.y,
        };
        var length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        candidates.push({
          axis: axis,
          layer: layer,
          dir: dir,
          vector: vector,
          start: arrowStart,
          end: arrowEnd,
          buttonCenter: { x: arrowEnd.x, y: arrowEnd.y },
          hitRadius: unit * 0.8,
          length: length,
        });
      });
    });
    return candidates;
  }

  updateInteractionState(pointer, choice) {
    if (!this.rubik || !pointer) return;
    this.rubik.interaction = {
      mode: 'swipe',
      hitCubieId: pointer.hit.cubie.id,
      hitNormalKey: vectorKey(pointer.hit.sticker.normal),
      hitCenter: {
        x: pointer.hit.center.x,
        y: pointer.hit.center.y,
      },
      start: {
        x: pointer.start.x,
        y: pointer.start.y,
      },
      current: {
        x: pointer.current.x,
        y: pointer.current.y,
      },
      candidates: pointer.candidates.map(function (candidate) {
        return this.getInteractionCandidateData(candidate);
      }, this),
      activeTurn: choice && choice.canPreview ? choice.turn : null,
      ambiguous: !!(choice && choice.ambiguous),
    };
  }

  getInteractionCandidateData(candidate) {
    return {
      axis: candidate.axis,
      layer: candidate.layer,
      dir: candidate.dir,
      vector: { x: candidate.vector.x, y: candidate.vector.y },
      start: { x: candidate.start.x, y: candidate.start.y },
      end: { x: candidate.end.x, y: candidate.end.y },
      buttonCenter: candidate.buttonCenter ? {
        x: candidate.buttonCenter.x,
        y: candidate.buttonCenter.y,
      } : null,
      hitRadius: candidate.hitRadius,
      length: candidate.length,
    };
  }

  clearInteractionState() {
    if (!this.rubik) return;
    this.confirmPicker = null;
    this.rubik.interaction = null;
    this.rubik.previewTurn = null;
    this.rubik.previewTween = null;
  }

  selectPointerChoice(pointer, choice) {
    if (!this.rubik || !pointer || !choice) return;
    var targetProgress = clamp(choice.previewProgress || TURN_INTENT_PREVIEW_PROGRESS, 0, TURN_PREVIEW_MAX_PROGRESS);
    if (pointer.choice && isSameTurn(pointer.choice.turn, choice.turn)) {
      pointer.choice = choice;
      if (this.rubik.previewTurn && isSameTurn(this.rubik.previewTurn, choice.turn)) {
        this.rubik.previewTurn.progress = targetProgress;
        this.rubik.previewTween = null;
      } else if (this.rubik.previewTween && this.rubik.previewTween.toTurn && isSameTurn(this.rubik.previewTween.toTurn, choice.turn)) {
        this.rubik.previewTurn = {
          axis: choice.turn.axis,
          layer: choice.turn.layer,
          dir: choice.turn.dir,
          progress: targetProgress,
        };
        this.rubik.previewTween = null;
      }
      return;
    }
    pointer.choice = choice;
    this.startPreviewTween(choice.turn, targetProgress);
  }

  startPreviewTween(turn, targetProgress) {
    if (!this.rubik || !turn) return;
    var previewProgress = clamp(targetProgress || TURN_INTENT_PREVIEW_PROGRESS, 0, TURN_PREVIEW_MAX_PROGRESS);
    var current = this.rubik.previewTurn;
    var fromProgress = current ? clamp(current.progress || 0, 0, TURN_PREVIEW_MAX_PROGRESS) : 0;
    var sameAsCurrent = current && isSameTurn(current, turn);
    this.rubik.previewTween = {
      phase: !sameAsCurrent && fromProgress > 0.01 ? 'return' : 'select',
      fromTurn: current ? cloneTurnIntent(current) : null,
      toTurn: cloneTurnIntent(turn),
      fromProgress: sameAsCurrent ? fromProgress : 0,
      returnProgress: fromProgress,
      elapsed: 0,
      returnDuration: TURN_PREVIEW_RETURN_DURATION,
      selectDuration: TURN_PREVIEW_SELECT_DURATION,
      targetProgress: previewProgress,
    };
    if (!current || !fromProgress) {
      this.rubik.previewTurn = {
        axis: turn.axis,
        layer: turn.layer,
        dir: turn.dir,
        progress: 0,
      };
    }
  }

  updatePreviewTween(dt) {
    if (!this.rubik || !this.rubik.previewTween || this.rubik.turn) return;
    var tween = this.rubik.previewTween;
    tween.elapsed += dt;
    if (tween.phase === 'return') {
      var returnRatio = easeInOutCubic(tween.elapsed / tween.returnDuration);
      var progress = tween.returnProgress * (1 - returnRatio);
      if (tween.fromTurn && progress > 0.001) {
        this.rubik.previewTurn = {
          axis: tween.fromTurn.axis,
          layer: tween.fromTurn.layer,
          dir: tween.fromTurn.dir,
          progress: progress,
        };
      } else {
        tween.phase = 'select';
        tween.elapsed = 0;
        tween.fromProgress = 0;
        this.rubik.previewTurn = {
          axis: tween.toTurn.axis,
          layer: tween.toTurn.layer,
          dir: tween.toTurn.dir,
          progress: 0,
        };
      }
      return;
    }

    var selectRatio = easeInOutCubic(tween.elapsed / tween.selectDuration);
    var selectProgress = tween.fromProgress + (tween.targetProgress - tween.fromProgress) * selectRatio;
    this.rubik.previewTurn = {
      axis: tween.toTurn.axis,
      layer: tween.toTurn.layer,
      dir: tween.toTurn.dir,
      progress: selectProgress,
    };
    if (selectRatio >= 1) {
      this.rubik.previewTurn.progress = tween.targetProgress;
      this.rubik.previewTween = null;
    }
  }

  getPreviewProgressForTurn(turn) {
    if (!this.rubik || !this.rubik.previewTurn || !turn) return 0;
    if (!isSameTurn(this.rubik.previewTurn, turn)) return 0;
    return clamp(this.rubik.previewTurn.progress || 0, 0, TURN_PREVIEW_MAX_PROGRESS);
  }

  getTurnStartProgress(choice, fallbackProgress) {
    if (!choice || !choice.turn) return 0;
    var shownProgress = this.getPreviewProgressForTurn(choice.turn);
    var gestureProgress = clamp(
      choice.previewProgress || fallbackProgress || 0,
      0,
      TURN_PREVIEW_MAX_PROGRESS,
    );
    return Math.max(shownProgress, gestureProgress);
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
      isForced: !!turn.isForced,
    };
  }

  commitTurn() {
    var turn = this.rubik.turn;
    if (!turn) return;
    var stickySlot = null;
    var stickyKey = '';
    var catBeforeTurn = findCatSticker(this.rubik);
    if (!turn.isUndo && catBeforeTurn && catBeforeTurn.cubie.position[turn.axis] === turn.layer) {
      var catSlotBeforeTurn = {
        position: cloneVector(catBeforeTurn.cubie.position),
        normal: cloneVector(catBeforeTurn.sticker.normal),
      };
      if (findStickySticker(this.rubik.stickyStickers, catSlotBeforeTurn.position, catSlotBeforeTurn.normal)) {
        stickySlot = catSlotBeforeTurn;
        stickyKey = getSlotKey(stickySlot.position, stickySlot.normal);
      }
    }
    var shouldHoldSticky = stickySlot && this.rubik.stickyHoldKey !== stickyKey;
    this.rubik.cubies.forEach(function (cubie) {
      if (cubie.position[turn.axis] !== turn.layer) return;
      cubie.position = rotateRubikQuarter(cubie.position, turn.axis, turn.dir);
      cubie.stickers.forEach(function (sticker) {
        sticker.normal = rotateRubikQuarter(sticker.normal, turn.axis, turn.dir);
      });
    });
    if (shouldHoldSticky && moveCatToSlot(this.rubik, stickySlot)) {
      this.rubik.stickyHoldKey = stickyKey;
      this.rubik.stickyTouch = {
        key: stickyKey,
        startedAt: Date.now(),
      };
    } else if (!shouldHoldSticky) {
      this.rubik.stickyHoldKey = '';
    }
    this.rubik.turn = null;
    if (!turn.isUndo && !turn.isForced) {
      this.undoStack = [{
        axis: turn.axis,
        layer: turn.layer,
        dir: -turn.dir,
        isUndo: true,
      }];
      this.rubik.forceTurnChain = 0;
      this.rubik.lastForcedKey = '';
      this.levelStats.rotateCount += 1;
    }

    this.resolvePostMoveEffects({
      allowWormhole: !turn.isUndo,
      allowGravity: !turn.isUndo,
      allowForced: !turn.isUndo,
    });
  }

  resolvePostMoveEffects(options) {
    options = options || {};
    this.resolvePawButton();
    this.checkLevelComplete();
    if (this.completed) return true;

    if (options.allowWormhole && this.resolveWormhole()) {
      return true;
    }

    if (options.allowFold !== false && this.resolveFoldDoor()) {
      return true;
    }

    if (options.allowGravity && this.resolveGravityAxis()) {
      return true;
    }

    if (options.allowForced && this.resolveForcedTurn()) {
      return true;
    }

    this.checkLevelComplete();
    return this.completed;
  }

  resolvePawButton() {
    if (!this.rubik || !this.rubik.pawButtons || !this.rubik.pawButtons.length) {
      return false;
    }
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var button = findPawButton(
      this.rubik.pawButtons,
      cat.cubie.position,
      cat.sticker.normal,
    );
    if (!button || this.rubik.buttonStates[button.id]) return false;
    this.rubik.buttonStates[button.id] = true;
    this.rubik.buttonActivatedAt[button.id] = Date.now();
    this.rubik.buttonTouch = {
      key: getSlotKey(button.position, button.normal),
      startedAt: Date.now(),
    };
    return true;
  }

  resolveWormhole() {
    if (!this.rubik || !this.rubik.wormholes || !this.rubik.wormholes.length) {
      return false;
    }
    if (this.isCatAtGoal()) return false;
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var endpoint = findWormholeEndpoint(
      this.rubik,
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
      duration: getSpecialMoveDuration(this.rubik, endpoint.to, TELEPORT_DURATION),
      progress: 0,
    };
    return true;
  }

  resolveGravityAxis() {
    if (!this.rubik || !this.rubik.gravityAxes || !this.rubik.gravityAxes.length) {
      return false;
    }
    if (this.isCatAtGoal()) return false;
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var gravity = findActiveGravityAxis(this.rubik, cat.cubie.position, cat.sticker.normal);
    if (!gravity) return false;
    var targetSlot = getGravityTargetSlot(this.rubik, gravity, cat.cubie.position);
    if (!targetSlot) return false;
    if (
      sameVector(cat.cubie.position, targetSlot.position) &&
      sameVector(cat.sticker.normal, targetSlot.normal)
    ) {
      return false;
    }
    var fromSlot = {
      position: cloneVector(cat.cubie.position),
      normal: cloneVector(cat.sticker.normal),
    };
    if (!moveCatToSlot(this.rubik, targetSlot)) return false;
    this.rubik.gravityCount += 1;
    this.rubik.gravityMove = {
      id: gravity.id || '',
      axis: gravity.axis,
      dir: gravity.dir,
      from: fromSlot,
      to: cloneSlot(targetSlot),
      elapsed: 0,
      duration: getSpecialMoveDuration(this.rubik, targetSlot, GRAVITY_DURATION),
      progress: 0,
    };
    return true;
  }

  resolveFoldDoor() {
    if (!this.rubik || !this.rubik.foldDoors || !this.rubik.foldDoors.length) {
      return false;
    }
    if (this.isCatAtGoal()) return false;
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var endpoint = findFoldDoorEndpoint(
      this.rubik,
      cat.cubie.position,
      cat.sticker.normal,
    );
    if (!endpoint) return false;
    var fromSlot = {
      position: cloneVector(cat.cubie.position),
      normal: cloneVector(cat.sticker.normal),
    };
    if (!moveCatToSlot(this.rubik, endpoint.to)) return false;
    this.rubik.foldCount += 1;
    this.rubik.foldMove = {
      id: endpoint.id || '',
      mode: endpoint.mode || 'portal',
      hingeAxis: endpoint.hingeAxis || '',
      dir: endpoint.dir || 1,
      from: fromSlot,
      to: cloneSlot(endpoint.to),
      elapsed: 0,
      duration: getSpecialMoveDuration(this.rubik, endpoint.to, FOLD_DURATION),
      progress: 0,
    };
    return true;
  }

  resolveForcedTurn() {
    if (!this.rubik || !this.rubik.forcedTurns || !this.rubik.forcedTurns.length) {
      return false;
    }
    if (this.isCatAtGoal()) return false;
    if ((this.rubik.forceTurnChain || 0) >= FORCED_TURN_CHAIN_LIMIT) {
      return false;
    }
    var cat = findCatSticker(this.rubik);
    if (!cat) return false;
    var forced = findForcedTurn(
      this.rubik,
      cat.cubie.position,
      cat.sticker.normal,
    );
    if (!forced || !forced.turn) return false;
    var forcedKey = getSlotKey(forced.position, forced.normal);
    if (this.rubik.forceTurnChain > 0 && this.rubik.lastForcedKey === forcedKey) {
      return false;
    }
    var turn = normalizeForcedTurn(forced);
    this.rubik.forceTurnChain = (this.rubik.forceTurnChain || 0) + 1;
    this.rubik.lastForcedKey = forcedKey;
    this.rubik.forcedTouch = {
      key: forcedKey,
      startedAt: Date.now(),
    };
    this.startTurn({
      axis: turn.axis,
      layer: turn.layer,
      dir: turn.dir,
      isForced: true,
    }, 0);
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
    if (this.isCatAtGoal()) {
      this.completeLevel();
    }
  }

  isCatAtGoal() {
    if (!this.rubik || !this.rubik.goal) return false;
    var cat = findCatSticker(this.rubik);
    return !!(
      isGoalUnlocked(this.rubik) &&
      cat &&
      sameVector(cat.cubie.position, this.rubik.goal.position) &&
      sameVector(cat.sticker.normal, this.rubik.goal.normal)
    );
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
    this.confirmPicker = null;
    this.undoStack = [];
  }
}

function createRubikState(level) {
  var size = level.size || 2;
  return {
    size: size,
    cubies: createCubies(size, level.cat, level),
    goal: cloneGoal(level.goal),
    buttonStates: {},
    buttonActivatedAt: {},
    pawButtons: clonePawButtons(level.pawButtons || []),
    stickyStickers: cloneSlots(level.stickyStickers || []),
    stickyHoldKey: '',
    gravityCount: 0,
    gravityAxes: cloneGravityAxes(level.gravityAxes || []),
    lockedAxes: cloneLockedAxes(level.lockedAxes || []),
    foldCount: 0,
    foldDoors: cloneFoldDoors(level.foldDoors || []),
    wormholeCount: 0,
    wormholes: cloneWormholes(level.wormholes || []),
    forcedTurns: cloneForcedTurns(level.forcedTurns || []),
    forceTurnChain: 0,
    lastForcedKey: '',
    forcedTouch: null,
    turn: null,
    previewTurn: null,
    previewTween: null,
    interaction: null,
    teleport: null,
    gravityMove: null,
    foldMove: null,
  };
}

function createCubies(size, catSlot, level) {
  var coords = getCubeCoords(size);
  var extraStickerSlots = collectAdditionalStickerSlots(level || {});
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
            .map(function (normal) {
              var outer = isOuterFace(position, normal, coords);
              var extra = !!extraStickerSlots[getSlotKey(position, normal)];
              if (!outer && !extra) return null;
              return {
                kind: isSameSlot(position, normal, catSlot) ? 'cat' : 'color',
                normal: { x: normal.x, y: normal.y, z: normal.z },
                hidden: !outer,
              };
            })
            .filter(Boolean),
        };
        cubies.push(cubie);
      });
    });
  });
  return cubies;
}

function collectAdditionalStickerSlots(level) {
  var slots = {};
  var addSlot = function (slot) {
    if (!slot || !slot.position || !slot.normal) return;
    slots[getSlotKey(slot.position, slot.normal)] = true;
  };
  addSlot(level.cat);
  addSlot(level.goal);
  (level.pawButtons || []).forEach(addSlot);
  (level.stickyStickers || []).forEach(addSlot);
  (level.forcedTurns || []).forEach(addSlot);
  (level.wormholes || []).forEach(function (wormhole) {
    addSlot(wormhole.from);
    addSlot(wormhole.to);
  });
  (level.foldDoors || []).forEach(function (foldDoor) {
    if (foldDoor.from && foldDoor.to) {
      addSlot(foldDoor.from);
      addSlot(foldDoor.to);
      return;
    }
    addSlot(foldDoor);
    var target = getConfiguredHingeFoldTargetSlot(level.size || 2, foldDoor);
    addSlot(target);
  });
  return slots;
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

function getSlotKey(position, normal) {
  return vectorKey(position) + '|' + vectorKey(normal);
}

function cloneVector(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function cloneSlots(slots) {
  return (slots || []).map(function (slot) {
    return cloneSlot(slot);
  });
}

function clonePawButtons(buttons) {
  return (buttons || []).map(function (button, index) {
    return {
      id: button.id || 'paw-button-' + index,
      position: cloneVector(button.position),
      normal: cloneVector(button.normal),
    };
  });
}

function cloneGravityAxes(gravityAxes) {
  return (gravityAxes || []).map(function (gravity, index) {
    return {
      id: gravity.id || 'gravity-axis-' + index,
      axis: gravity.axis || 'y',
      dir: gravity.dir == null ? -1 : gravity.dir,
      fixed: cloneGravityFixed(gravity.fixed || gravity.line || null),
      requiresButton: cloneRequiresButton(gravity.requiresButton),
    };
  });
}

function cloneGravityFixed(fixed) {
  if (!fixed) return null;
  var cloned = {};
  ['x', 'y', 'z'].forEach(function (axis) {
    if (fixed[axis] != null) {
      cloned[axis] = fixed[axis];
    }
  });
  return cloned;
}

function cloneLockedAxes(lockedAxes) {
  return (lockedAxes || []).map(function (lock, index) {
    return {
      id: lock.id || 'locked-axis-' + index,
      axis: lock.axis || 'y',
      layer: lock.layer,
      requiresButton: cloneRequiresButton(lock.requiresButton),
    };
  });
}

function cloneRequiresButton(requiresButton) {
  if (Array.isArray(requiresButton)) return requiresButton.slice();
  return requiresButton || '';
}

function cloneWormholes(wormholes) {
  return (wormholes || []).map(function (wormhole, index) {
    return {
      id: wormhole.id || 'wormhole-' + index,
      from: cloneSlot(wormhole.from),
      to: cloneSlot(wormhole.to),
      requiresButton: cloneRequiresButton(wormhole.requiresButton),
    };
  });
}

function cloneFoldDoors(foldDoors) {
  return (foldDoors || []).map(function (foldDoor, index) {
    var cloned = {
      id: foldDoor.id || 'fold-door-' + index,
      requiresButton: cloneRequiresButton(foldDoor.requiresButton),
    };
    if (foldDoor.from && foldDoor.to) {
      cloned.hingeAxis = foldDoor.hingeAxis || '';
      cloned.dir = foldDoor.dir == null ? 1 : foldDoor.dir;
      cloned.from = cloneSlot(foldDoor.from);
      cloned.to = cloneSlot(foldDoor.to);
      return cloned;
    }
    cloned.position = cloneVector(foldDoor.position);
    cloned.normal = cloneVector(foldDoor.normal);
    cloned.hingeAxis = foldDoor.hingeAxis || getDefaultFoldHingeAxis(foldDoor.normal);
    cloned.dir = foldDoor.dir == null ? 1 : foldDoor.dir;
    return cloned;
  });
}

function cloneForcedTurns(forcedTurns) {
  return (forcedTurns || []).map(function (forcedTurn, index) {
    return {
      id: forcedTurn.id || 'forced-turn-' + index,
      position: {
        x: forcedTurn.position.x,
        y: forcedTurn.position.y,
        z: forcedTurn.position.z,
      },
      normal: {
        x: forcedTurn.normal.x,
        y: forcedTurn.normal.y,
        z: forcedTurn.normal.z,
      },
      turn: {
        axis: forcedTurn.turn.axis,
        layer: forcedTurn.turn.layer,
        dir: forcedTurn.turn.dir,
      },
      requiresButton: cloneRequiresButton(forcedTurn.requiresButton),
    };
  });
}

function findWormholeEndpoint(state, position, normal) {
  for (var i = 0; i < state.wormholes.length; i++) {
    var wormhole = state.wormholes[i];
    if (!isMechanicEnabled(state, wormhole)) continue;
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

function findFoldDoorEndpoint(state, position, normal) {
  for (var i = 0; i < state.foldDoors.length; i++) {
    var foldDoor = state.foldDoors[i];
    if (!isMechanicEnabled(state, foldDoor)) continue;
    if (foldDoor.from && foldDoor.to && isSameSlot(position, normal, foldDoor.from)) {
      var foldMove = getAdjacentFoldMove(state, foldDoor.from, foldDoor.to);
      if (!foldMove) continue;
      return {
        id: foldDoor.id,
        from: foldDoor.from,
        to: foldDoor.to,
        hingeAxis: foldMove.hingeAxis,
        dir: foldMove.dir,
        mode: 'hinge',
      };
    }
    if (foldDoor.position && foldDoor.normal && isSameSlot(position, normal, foldDoor)) {
      var targetSlot = getHingeFoldTargetSlot(state, foldDoor);
      if (!targetSlot) continue;
      return {
        id: foldDoor.id,
        from: foldDoor,
        to: targetSlot,
        hingeAxis: foldDoor.hingeAxis,
        dir: foldDoor.dir,
        mode: 'hinge',
      };
    }
  }
  return null;
}

function getAdjacentFoldMove(state, fromSlot, toSlot) {
  if (!fromSlot || !toSlot) return null;
  if (!sameVector(fromSlot.normal, toSlot.normal)) return null;
  if (!findStickerAtSlot(state, toSlot)) return null;
  var step = getRubikCoordStep(state);
  var move = getSingleAxisDelta(fromSlot.position, toSlot.position, step);
  if (!move) return null;
  var normalAxis = getVectorAxis(fromSlot.normal);
  if (!normalAxis || move.axis === normalAxis) return null;
  var hingeAxis = getRemainingAxis(normalAxis, move.axis);
  var dir = getFoldDirForMovement(fromSlot.normal, hingeAxis, move.vector);
  if (!dir) return null;
  return {
    hingeAxis: hingeAxis,
    dir: dir,
  };
}

function getHingeFoldTargetSlot(state, foldDoor) {
  var targetSlot = getConfiguredHingeFoldTargetSlot((state && state.size) || 2, foldDoor);
  return findStickerAtSlot(state, targetSlot) ? targetSlot : null;
}

function getConfiguredHingeFoldTargetSlot(size, foldDoor) {
  var hingeAxis = foldDoor.hingeAxis;
  if (!hingeAxis || Math.abs(foldDoor.normal[hingeAxis]) > 0.5) return null;
  var sideVector = rotateRubikQuarter(foldDoor.normal, hingeAxis, foldDoor.dir);
  var axis = getVectorAxis(sideVector);
  if (!axis) return null;
  var targetPosition = cloneVector(foldDoor.position);
  targetPosition[axis] += sideVector[axis] * getRubikCoordStep({ size: size || 2 });
  return {
    position: targetPosition,
    normal: cloneVector(foldDoor.normal),
  };
}

function getSingleAxisDelta(fromPosition, toPosition, step) {
  var axes = ['x', 'y', 'z'];
  var movedAxis = '';
  var sign = 0;
  for (var i = 0; i < axes.length; i++) {
    var axis = axes[i];
    var delta = toPosition[axis] - fromPosition[axis];
    if (!delta) continue;
    if (movedAxis || Math.abs(delta) !== step) {
      return null;
    }
    movedAxis = axis;
    sign = delta > 0 ? 1 : -1;
  }
  if (!movedAxis) return null;
  var vector = { x: 0, y: 0, z: 0 };
  vector[movedAxis] = sign;
  return {
    axis: movedAxis,
    vector: vector,
  };
}

function getVectorAxis(vector) {
  if (Math.abs(vector.x) > 0.5) return 'x';
  if (Math.abs(vector.y) > 0.5) return 'y';
  if (Math.abs(vector.z) > 0.5) return 'z';
  return '';
}

function getRemainingAxis(a, b) {
  var axes = ['x', 'y', 'z'];
  for (var i = 0; i < axes.length; i++) {
    if (axes[i] !== a && axes[i] !== b) return axes[i];
  }
  return '';
}

function getFoldDirForMovement(normal, hingeAxis, movementVector) {
  for (var dir = -1; dir <= 1; dir += 2) {
    if (sameVector(rotateRubikQuarter(normal, hingeAxis, dir), movementVector)) {
      return dir;
    }
  }
  return null;
}

function getRubikCoordStep(state) {
  var coords = getCubeCoords((state && state.size) || 2);
  return coords.length > 1 ? Math.abs(coords[1] - coords[0]) : 2;
}

function getDefaultFoldHingeAxis(normal) {
  if (Math.abs(normal.x) > 0.5) return 'y';
  if (Math.abs(normal.y) > 0.5) return 'x';
  return 'y';
}

function findForcedTurn(state, position, normal) {
  var forcedTurns = (state && state.forcedTurns) || [];
  for (var i = 0; i < forcedTurns.length; i++) {
    var forcedTurn = forcedTurns[i];
    if (!isMechanicEnabled(state, forcedTurn)) continue;
    if (isSameSlot(position, normal, forcedTurn)) {
      return forcedTurn;
    }
  }
  return null;
}

function findPawButton(buttons, position, normal) {
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    if (isSameSlot(position, normal, button)) {
      return button;
    }
  }
  return null;
}

function findStickySticker(stickyStickers, position, normal) {
  for (var i = 0; i < stickyStickers.length; i++) {
    var sticky = stickyStickers[i];
    if (isSameSlot(position, normal, sticky)) {
      return sticky;
    }
  }
  return null;
}

function findActiveGravityAxis(state, position, normal) {
  for (var i = 0; i < state.gravityAxes.length; i++) {
    var gravity = state.gravityAxes[i];
    if (!isMechanicEnabled(state, gravity)) continue;
    if (!isPositionInsideGravityAxis(gravity, position)) continue;
    if (Math.abs(normal[gravity.axis]) > 0.5 && normal[gravity.axis] === gravity.dir) {
      continue;
    }
    return gravity;
  }
  return null;
}

function isPositionInsideGravityAxis(gravity, position) {
  if (!gravity || !position) return false;
  var fixed = gravity.fixed;
  if (!fixed) return true;
  var axes = ['x', 'y', 'z'];
  for (var i = 0; i < axes.length; i++) {
    var axis = axes[i];
    if (axis === gravity.axis) continue;
    if (fixed[axis] != null && position[axis] !== fixed[axis]) {
      return false;
    }
  }
  return true;
}

function getGravityTargetSlot(state, gravity, position) {
  var coords = getCubeCoords(state.size);
  var target = cloneVector(position);
  target[gravity.axis] = gravity.dir < 0 ? coords[0] : coords[coords.length - 1];
  var normal = { x: 0, y: 0, z: 0 };
  normal[gravity.axis] = gravity.dir < 0 ? -1 : 1;
  return {
    position: target,
    normal: normal,
  };
}

function getSpecialMoveDuration(state, targetSlot, defaultDuration) {
  if (
    state &&
    targetSlot &&
    state.goal &&
    isGoalUnlocked(state) &&
    sameVector(targetSlot.position, state.goal.position) &&
    sameVector(targetSlot.normal, state.goal.normal)
  ) {
    return Math.min(defaultDuration, GOAL_SPECIAL_MOVE_DURATION);
  }
  return defaultDuration;
}

function isTurnLocked(state, axis, layer) {
  if (!state || !state.lockedAxes || !state.lockedAxes.length) return false;
  for (var i = 0; i < state.lockedAxes.length; i++) {
    var lock = state.lockedAxes[i];
    if (lock.axis !== axis) continue;
    if (lock.layer != null && lock.layer !== layer) continue;
    if (!isMechanicEnabled(state, lock)) return true;
  }
  return false;
}

function isGoalUnlocked(state) {
  return isMechanicEnabled(state, state.goal || {});
}

function isMechanicEnabled(state, mechanic) {
  var requiresButton = mechanic && mechanic.requiresButton;
  if (!requiresButton) return true;
  var ids = Array.isArray(requiresButton) ? requiresButton : [requiresButton];
  for (var i = 0; i < ids.length; i++) {
    if (!state.buttonStates[ids[i]]) return false;
  }
  return true;
}

function normalizeForcedTurn(forcedTurn) {
  var axis = forcedTurn.turn.axis;
  return {
    axis: axis,
    layer: forcedTurn.turn.layer != null ? forcedTurn.turn.layer : forcedTurn.position[axis],
    dir: forcedTurn.turn.dir,
  };
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

function getPointDistance(a, b) {
  if (!a || !b) return 0;
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPointInCircle(point, center, radius) {
  if (!point || !center) return false;
  var dx = point.x - center.x;
  var dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

function isSameTurn(a, b) {
  return !!a && !!b &&
    a.axis === b.axis &&
    a.layer === b.layer &&
    a.dir === b.dir;
}

function cloneTurnIntent(turn) {
  return {
    axis: turn.axis,
    layer: turn.layer,
    dir: turn.dir,
  };
}

function easeInOutCubic(t) {
  t = Math.max(0, Math.min(1, t || 0));
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

function cloneGoal(goal) {
  var cloned = cloneSlot(goal);
  cloned.requiresButton = cloneRequiresButton(goal.requiresButton);
  return cloned;
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
