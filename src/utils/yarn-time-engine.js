import { GameStorage } from './storage.js';
import { calculateLevelScore } from './rewards.js';
import {
  YARN_TIME_LEVELS,
  YARN_TIME_LEVEL_MAP,
} from './yarn-time-levels.js';
import {
  getYarnClockAction,
  getYarnTimeLayout,
  createYarnTimeSuccessAnimation,
  renderYarnTime,
  yarnScreenToWorld,
  yarnWorldToScreen,
} from './yarn-time-renderer.js';

var YARN_HIT_RADIUS = 30;
var NODE_DROP_RADIUS = 34;

export class YarnTimeEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.canvasSize = { width: 0, height: 0 };
    this.canvasLeft = 0;
    this.canvasTop = 0;
    this.touchHitOffsetY = 0;

    this.level = null;
    this.nodeMap = {};
    this.edgeMap = {};
    this.edgeStates = {};
    this.tileStates = {};
    this.maze = {
      id: '',
      instruction: '',
      goalIcon: 'yarn',
    };
    this.cat = null;
    this.yarn = null;
    this.time = null;
    this.pointer = null;
    this.levelStats = this.createLevelStats('');
    this.completed = false;
    this.winAnim = null;
    this.now = Date.now();
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
    if (!currentLevelId || !YARN_TIME_LEVEL_MAP[currentLevelId]) {
      currentLevelId = YARN_TIME_LEVELS[0].id;
      GameStorage.saveCurrentLevel(currentLevelId);
    }
    this.loadLevel(currentLevelId);
  }

  loadLevel(levelId) {
    var level = YARN_TIME_LEVEL_MAP[levelId] || YARN_TIME_LEVELS[0];
    this.level = cloneLevel(level);
    this.nodeMap = createNodeMap(this.level);
    this.edgeMap = createEdgeMap(this.level);
    this.maze = {
      id: this.level.id,
      instruction: this.level.instruction || '',
      goalIcon: 'yarn',
    };

    var startNode = this.nodeMap[this.level.cat.startNode] || this.level.nodes[0];
    this.cat = {
      nodeId: startNode.id,
      pos: clonePoint(startNode),
      mode: 'playing',
      targetNodeId: '',
      move: null,
      lastSafeNodeId: startNode.id,
    };
    this.yarn = {
      nodeId: startNode.id,
      previousNodeId: startNode.id,
      pos: clonePoint(startNode),
      isHeld: false,
      validDropNodeId: '',
    };
    this.time = {
      worldTime: Number(this.level.time && this.level.time.startAt) || 0,
      mode: 'play',
      energy: Number(this.level.clock && this.level.clock.energy) || 2,
      maxEnergy: Number(this.level.clock && this.level.clock.energy) || 2,
      handTime: 0,
      handCycle: Number(this.level.clock && this.level.clock.rechargeDuration) || 6200,
      skillRemaining: 0,
      skillDuration: 0,
      pauseDropUsed: false,
    };
    this.pointer = null;
    this.completed = false;
    this.winAnim = null;
    this.now = Date.now();
    this.lastUpdateAt = this.now;
    this.resetLevelStats(this.level.id);
    this.tileStates = this.createInitialTileStates();
    this.updateTileStates(0);
    GameStorage.saveCurrentLevel(this.level.id);

    if (this.onInstructionChange) {
      this.onInstructionChange(this.maze.instruction);
    }
    if (this.onLevelLoad) {
      this.onLevelLoad(this.level.id);
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
      rotateCount: 0,
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
    if (!this.level || !this.cat || !this.yarn || !this.time) return;
    var now = Date.now();
    var dt = Math.min(64, now - this.lastUpdateAt);
    this.lastUpdateAt = now;
    this.now = now;

    this.updateClock(dt);
    this.updateTileStates(dt);
    this.ensureActorsOnSafeTiles();
    if (!this.completed) {
      this.updateCat(dt);
    }
    if (this.winAnim) {
      this.winAnim.update();
    }
    this.checkLevelComplete();
  }

  updateClock(dt) {
    this.time.worldTime += dt;
    this.time.handTime += dt;
    while (this.time.handTime >= this.time.handCycle) {
      this.time.handTime -= this.time.handCycle;
      if (this.time.energy < this.time.maxEnergy) {
        this.time.energy += 1;
      }
    }
    this.time.handPhase = this.time.handTime / this.time.handCycle;

    if (this.time.mode === 'pause' || this.time.mode === 'rewind') {
      this.time.skillRemaining = Math.max(0, this.time.skillRemaining - dt);
      if (this.time.skillRemaining <= 0) {
        this.time.mode = 'play';
        this.time.skillDuration = 0;
        this.time.pauseDropUsed = false;
      }
    }
  }

  createInitialTileStates() {
    var states = {};
    (this.level.nodes || []).forEach(function (node) {
      var kind = node && node.kind ? node.kind : 'safe';
      if (kind === 'crumble') {
        var integrity = node.initialIntegrity === 0 ? 0 : Number(node.initialIntegrity) || 1;
        states[node.id] = {
          kind: kind,
          integrity: clamp01(integrity),
          safe: true,
          phase: clamp01(integrity),
        };
      } else if (kind === 'door') {
        states[node.id] = {
          kind: kind,
          open: !!node.initialOpen,
          safe: !!node.initialOpen,
          phase: node.initialOpen ? 1 : 0,
        };
      } else if (kind === 'spike') {
        var spikePhase = clamp01(Number(node.initialPhase) || 0);
        states[node.id] = {
          kind: kind,
          elapsed: spikePhase * (Number(node.cycleDuration) || 2400),
          raised: isSpikeRaised(node, spikePhase),
          safe: !isSpikeRaised(node, spikePhase),
          phase: spikePhase,
        };
      } else if (kind === 'switch') {
        states[node.id] = {
          kind: kind,
          pressed: false,
          safe: true,
          phase: 0,
        };
      } else {
        states[node.id] = {
          kind: kind,
          safe: true,
          phase: 1,
        };
      }
    });
    return states;
  }

  updateTileStates(dt) {
    var self = this;
    (this.level.nodes || []).forEach(function (node) {
      var state = self.tileStates[node.id] || self.createTileState(node);
      self.updateTileState(node, state, dt || 0);
      self.tileStates[node.id] = state;
    });
  }

  updateEdgeStates() {
    var self = this;
    this.edgeStates = {};
    (this.level.edges || []).forEach(function (edge) {
      var info = self.getEdgeState(edge);
      self.edgeStates[edge.id] = info;
    });
    this.updateTileStates(0);
  }

  createTileState(node) {
    if (!node || node.kind === 'safe' || node.kind === 'start' || node.kind === 'goal') {
      return { safe: true, phase: 1, kind: node && node.kind ? node.kind : 'safe' };
    }
    if (node.kind === 'crumble') {
      var integrity = node.initialIntegrity === 0 ? 0 : Number(node.initialIntegrity) || 1;
      return {
        safe: true,
        integrity: clamp01(integrity),
        phase: clamp01(integrity),
        kind: node.kind,
      };
    }
    if (node.kind === 'door') {
      return {
        safe: !!node.initialOpen,
        open: !!node.initialOpen,
        phase: node.initialOpen ? 1 : 0,
        kind: node.kind,
      };
    }
    if (node.kind === 'spike') {
      var spikePhase = clamp01(Number(node.initialPhase) || 0);
      var raised = isSpikeRaised(node, spikePhase);
      return {
        safe: !raised,
        raised: raised,
        elapsed: spikePhase * (Number(node.cycleDuration) || 2400),
        phase: spikePhase,
        kind: node.kind,
      };
    }
    if (node.kind === 'switch') {
      return { safe: true, pressed: false, phase: 0, kind: node.kind };
    }
    return { safe: true, phase: 1, kind: node.kind };
  }

  updateTileState(node, state, dt) {
    if (!node || !state) return;
    if (node.kind === 'crumble') {
      var integrity = Number(state.integrity);
      if (this.time.mode === 'rewind') {
        var recoverDuration = Number(node.recoverDuration) || 1600;
        integrity += dt / recoverDuration;
      } else if (this.time.mode === 'play') {
        var damageDuration = Number(node.damageDuration) || 5200;
        integrity -= dt / damageDuration;
      }
      state.integrity = clamp01(integrity);
      state.phase = state.integrity;
      state.safe = state.integrity >= (Number(node.safeAt) || 0.42);
      return;
    }
    if (node.kind === 'door') {
      state.open = !!state.open;
      state.safe = state.open;
      state.phase = state.open ? 1 : 0;
      return;
    }
    if (node.kind === 'spike') {
      var cycleDuration = Number(node.cycleDuration) || 2400;
      if (this.time.mode === 'play') {
        state.elapsed = (Number(state.elapsed) || 0) + dt;
      }
      var phase = positiveModulo(Number(state.elapsed) || 0, cycleDuration) / cycleDuration;
      state.phase = phase;
      state.raised = isSpikeRaised(node, phase);
      state.safe = !state.raised;
      return;
    }
    if (node.kind === 'switch') {
      state.safe = true;
      state.phase = state.pressed ? 1 : 0;
      return;
    }
    state.safe = true;
    state.phase = state.phase == null ? 1 : state.phase;
  }

  getEdgeState(edge) {
    if (!edge || edge.kind === 'safe') {
      return { safe: true, phase: 0 };
    }
    var cycle = Number(edge.cycle) || 1;
    var phaseMs = positiveModulo(this.time.worldTime, cycle);
    var phase = phaseMs / cycle;
    if (edge.kind === 'crumble') {
      return {
        safe: phaseMs <= (Number(edge.safeUntil) || cycle),
        phase: phase,
      };
    }
    if (edge.kind === 'clock-door') {
      return {
        safe:
          phaseMs >= (Number(edge.openFrom) || 0) &&
          phaseMs <= (Number(edge.openTo) || 0),
        phase: phase,
      };
    }
    return { safe: true, phase: phase };
  }

  render() {
    if (!this.ctx || !this.level) return;
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    renderYarnTime(this.ctx, this, this.canvasSize, {
      accessoryId: this.equippedAccessoryId,
      expressionId: this.equippedExpressionId,
      successAnimation: this.winAnim,
    });
  }

  handlePointerDown(pointer) {
    if (!this.level || this.completed) return;
    var point = this.getCanvasPoint(pointer);
    var clockAction = getYarnClockAction(point, this.canvasSize);
    if (clockAction && this.isClockActionAllowed(clockAction)) {
      this.startClockSkill(clockAction);
      this.pointer = { type: 'clock' };
      return;
    }

    if (this.canPickYarn(point)) {
      this.pointer = { type: 'yarn' };
      this.yarn.isHeld = true;
      this.yarn.previousNodeId = this.yarn.nodeId || this.cat.nodeId;
      this.yarn.nodeId = '';
      this.yarn.pos = this.screenToWorld(point);
      this.yarn.validDropNodeId = this.findValidDropNode(point);
      if (this.cat.mode === 'playing') {
        this.cat.mode = 'watching';
      }
    }
  }

  handlePointerMove(pointer) {
    if (!this.pointer || this.pointer.type !== 'yarn' || !this.yarn.isHeld) {
      return;
    }
    var point = this.getCanvasPoint(pointer);
    this.yarn.pos = this.screenToWorld(point);
    this.yarn.validDropNodeId = this.findValidDropNode(point);
  }

  handlePointerUp(pointer) {
    if (!this.pointer) return;
    if (this.pointer.type === 'yarn' && this.yarn.isHeld) {
      var point = pointer ? this.getCanvasPoint(pointer) : null;
      if (point) {
        this.yarn.pos = this.screenToWorld(point);
        this.yarn.validDropNodeId = this.findValidDropNode(point);
      }
      this.confirmYarnDrop();
    }
    this.pointer = null;
  }

  startClockSkill(action) {
    if (!this.time || this.completed) return false;
    if (this.time.mode !== 'play') return false;
    if (!this.isClockActionAllowed(action)) return false;
    if (this.time.energy <= 0) return false;
    if (action !== 'pause' && action !== 'rewind') return false;

    var duration = action === 'pause'
      ? Number(this.level.clock.pauseDuration) || 2500
      : Number(this.level.clock.rewindDuration) || 2000;
    this.time.energy -= 1;
    this.time.mode = action;
    this.time.skillRemaining = duration;
    this.time.skillDuration = duration;
    this.time.pauseDropUsed = false;
    return true;
  }

  isClockActionAllowed(action) {
    var actions = this.level && this.level.clock && this.level.clock.actions;
    if (!Array.isArray(actions)) return true;
    return actions.indexOf(action) !== -1;
  }

  stopCatForRewind() {
    if (!this.cat || !this.cat.move) return;
    this.cat.move = null;
    if (this.cat.mode === 'chasing') {
      this.cat.mode = 'waiting';
    }
  }

  canPickYarn(point) {
    if (!this.yarn || this.yarn.isHeld) return false;
    if (this.cat.mode === 'chasing') return false;
    var layout = getYarnTimeLayout(this.canvasSize, this.level);
    var yarnPoint = yarnWorldToScreen(this.yarn.pos, layout);
    var dx = point.x - yarnPoint.x;
    var dy = point.y - yarnPoint.y;
    return Math.sqrt(dx * dx + dy * dy) <= YARN_HIT_RADIUS;
  }

  findValidDropNode(screenPoint) {
    if (!screenPoint || !this.level) return '';
    if (this.time.mode === 'pause' && this.time.pauseDropUsed) return '';

    var layout = getYarnTimeLayout(this.canvasSize, this.level);
    var best = null;
    (this.level.nodes || []).forEach(function (node) {
      var center = yarnWorldToScreen(node, layout);
      var dx = screenPoint.x - center.x;
      var dy = screenPoint.y - center.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= NODE_DROP_RADIUS && (!best || distance < best.distance)) {
        best = { node: node, distance: distance };
      }
    });
    if (!best) return '';
    if (!this.isNodeSafe(best.node.id)) return '';
    if (!this.findSafePath(this.cat.nodeId, best.node.id)) return '';
    return best.node.id;
  }

  isNodeWithinPlacementRange(nodeId) {
    var node = this.nodeMap[nodeId];
    var catNode = this.nodeMap[this.cat.nodeId];
    if (!node || !catNode) return false;
    if (node.id === catNode.id) return true;
    var radius = Number(this.level.yarn && this.level.yarn.placementRadius) || 0.3;
    return pointDistance(node, catNode) <= radius;
  }

  confirmYarnDrop() {
    var nodeId = this.yarn.validDropNodeId;
    if (!nodeId) {
      this.returnYarnToPreviousNode();
      return false;
    }

    var node = this.nodeMap[nodeId];
    this.yarn.isHeld = false;
    this.yarn.nodeId = nodeId;
    this.yarn.pos = clonePoint(node);
    this.yarn.validDropNodeId = '';
    if (this.time.mode === 'pause') {
      this.time.pauseDropUsed = true;
    }
    this.levelStats.dragCount += 1;
    this.startCatTowardYarn();
    return true;
  }

  returnYarnToPreviousNode() {
    var fallbackId = this.yarn.previousNodeId || this.cat.nodeId;
    var node = this.nodeMap[fallbackId] || this.nodeMap[this.cat.nodeId];
    this.yarn.isHeld = false;
    this.yarn.nodeId = node.id;
    this.yarn.pos = clonePoint(node);
    this.yarn.validDropNodeId = '';
    if (this.cat.mode === 'watching') {
      this.cat.mode = this.cat.nodeId === this.yarn.nodeId ? 'playing' : 'waiting';
    }
  }

  startCatTowardYarn() {
    if (!this.yarn.nodeId || !this.cat.nodeId) return;
    if (this.yarn.nodeId === this.cat.nodeId) {
      this.cat.mode = 'playing';
      this.cat.targetNodeId = '';
      this.cat.move = null;
      return;
    }
    var path = this.findSafePath(this.cat.nodeId, this.yarn.nodeId);
    if (!path || path.length < 2) {
      this.cat.mode = 'waiting';
      this.cat.targetNodeId = '';
      this.cat.move = null;
      return;
    }
    this.cat.mode = 'chasing';
    this.cat.targetNodeId = this.yarn.nodeId;
    this.cat.move = {
      path: path,
      index: 1,
      fromNodeId: this.cat.nodeId,
      toNodeId: path[1],
    };
  }

  canCatSeeNode(nodeId) {
    var node = this.nodeMap[nodeId];
    if (!node) return false;
    var radius = Number(this.level.cat && this.level.cat.visionRadius) || 0.28;
    return pointDistance(this.cat.pos, node) <= radius;
  }

  updateCat(dt) {
    if (!this.cat.move || this.cat.mode !== 'chasing') {
      return;
    }
    var move = this.cat.move;
    var targetNode = this.nodeMap[move.toNodeId];
    if (!targetNode) {
      this.cat.move = null;
      this.cat.mode = 'waiting';
      return;
    }
    if (!this.isNodeSafe(move.toNodeId)) {
      this.resetCatToSafeNode();
      return;
    }

    var speed = Number(this.level.cat && this.level.cat.moveSpeed) || 0.00024;
    var remaining = speed * dt;
    while (remaining > 0 && this.cat.move && this.cat.mode === 'chasing') {
      move = this.cat.move;
      targetNode = this.nodeMap[move.toNodeId];
      if (!this.isNodeSafe(move.toNodeId)) {
        this.resetCatToSafeNode();
        return;
      }
      var dist = pointDistance(this.cat.pos, targetNode);
      if (dist <= remaining || dist < 0.0001) {
        this.cat.pos = clonePoint(targetNode);
        this.cat.nodeId = targetNode.id;
        this.handleNodeArrival(targetNode);
        if (this.isStableNodeSafe(targetNode.id)) {
          this.cat.lastSafeNodeId = targetNode.id;
        }
        remaining -= dist;
        if (targetNode.id === this.yarn.nodeId) {
          this.cat.mode = 'playing';
          this.cat.targetNodeId = '';
          this.cat.move = null;
          return;
        }
        move.index += 1;
        if (move.index >= move.path.length) {
          this.cat.mode = 'waiting';
          this.cat.move = null;
          return;
        }
        move.fromNodeId = targetNode.id;
        move.toNodeId = move.path[move.index];
      } else {
        var ratio = remaining / dist;
        this.cat.pos = {
          id: this.cat.nodeId,
          x: this.cat.pos.x + (targetNode.x - this.cat.pos.x) * ratio,
          y: this.cat.pos.y + (targetNode.y - this.cat.pos.y) * ratio,
          z: (Number(this.cat.pos.z) || 0) + ((Number(targetNode.z) || 0) - (Number(this.cat.pos.z) || 0)) * ratio,
        };
        remaining = 0;
      }
    }
  }

  resetCatToSafeNode() {
    var node = this.nodeMap[this.cat.lastSafeNodeId] || this.nodeMap[this.cat.nodeId];
    this.cat.pos = clonePoint(node);
    this.cat.nodeId = node.id;
    this.cat.mode = 'playing';
    this.cat.move = null;
    this.cat.targetNodeId = '';
    this.yarn.nodeId = node.id;
    this.yarn.previousNodeId = node.id;
    this.yarn.pos = clonePoint(node);
    this.yarn.isHeld = false;
    this.yarn.validDropNodeId = '';
  }

  handleNodeArrival(node) {
    if (!node || node.kind !== 'switch') return;
    var state = this.tileStates[node.id] || this.createTileState(node);
    if (state.pressed) return;
    state.pressed = true;
    state.phase = 1;
    this.tileStates[node.id] = state;
    this.openDoor(node.opensDoorId || (this.level.door && this.level.door.nodeId));
  }

  openDoor(nodeId) {
    if (!nodeId || !this.nodeMap[nodeId]) return;
    var doorState = this.tileStates[nodeId] || this.createTileState(this.nodeMap[nodeId]);
    doorState.open = true;
    doorState.safe = true;
    doorState.phase = 1;
    this.tileStates[nodeId] = doorState;
  }

  findSafePath(fromNodeId, toNodeId) {
    if (!fromNodeId || !toNodeId) return null;
    if (!this.isNodeSafe(fromNodeId) || !this.isNodeSafe(toNodeId)) return null;
    if (fromNodeId === toNodeId) return [fromNodeId];

    var queue = [fromNodeId];
    var cameFrom = {};
    cameFrom[fromNodeId] = '';

    while (queue.length) {
      var nodeId = queue.shift();
      var neighbors = this.getSafeNeighbors(nodeId);
      for (var i = 0; i < neighbors.length; i++) {
        var next = neighbors[i];
        if (cameFrom[next] !== undefined) continue;
        cameFrom[next] = nodeId;
        if (next === toNodeId) {
          return buildPath(cameFrom, fromNodeId, toNodeId);
        }
        queue.push(next);
      }
    }
    return null;
  }

  getSafeNeighbors(nodeId) {
    var result = [];
    var self = this;
    var node = this.nodeMap[nodeId];
    if (!node || !this.isNodeSafe(nodeId)) return result;
    (this.level.nodes || []).forEach(function (candidate) {
      if (!candidate || candidate.id === nodeId) return;
      if (!self.isNodeSafe(candidate.id)) return;
      if (isGridAdjacent(node, candidate)) {
        result.push(candidate.id);
      }
    });
    return result;
  }

  ensureActorsOnSafeTiles() {
    if (!this.cat || !this.yarn || !this.time) return;
    if (this.time.mode === 'rewind') return;
    if (this.cat.nodeId && !this.isNodeSafe(this.cat.nodeId)) {
      this.resetCatToSafeNode();
      return;
    }
    if (!this.yarn.isHeld && this.yarn.nodeId && !this.isNodeSafe(this.yarn.nodeId)) {
      this.resetCatToSafeNode();
    }
  }

  isNodeSafe(nodeId) {
    if (!nodeId || !this.nodeMap[nodeId]) return false;
    var state = this.tileStates[nodeId];
    return !state || state.safe;
  }

  isStableNodeSafe(nodeId) {
    var node = this.nodeMap[nodeId];
    if (!node || !this.isNodeSafe(nodeId)) return false;
    return !!node.stable || node.kind === 'safe' || node.kind === 'start' || node.kind === 'goal';
  }

  isEdgeSafe(edgeId) {
    var state = this.edgeStates[edgeId];
    return !state || state.safe;
  }

  isEdgeBetweenSafe(a, b) {
    var edge = this.findEdgeBetween(a, b);
    return !!edge && this.isEdgeSafe(edge.id);
  }

  findEdgeBetween(a, b) {
    var edges = this.level.edges || [];
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      if ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a)) {
        return edge;
      }
    }
    return null;
  }

  checkLevelComplete() {
    if (this.completed || !this.level || !this.cat || !this.yarn) return;
    var goalNodeId = this.level.goal && this.level.goal.nodeId;
    if (
      goalNodeId &&
      this.yarn.nodeId === goalNodeId &&
      this.cat.nodeId === goalNodeId &&
      this.cat.mode === 'playing'
    ) {
      this.completeLevel();
    }
  }

  completeLevel() {
    this.completed = true;
    this.winAnim = createYarnTimeSuccessAnimation(this, this.canvasSize, {
      accessoryId: this.equippedAccessoryId,
      expressionId: this.equippedExpressionId || 'joy',
    });
    GameStorage.markLevelCompleted(this.maze.id);
    if (this.onLevelComplete) {
      this.onLevelComplete(this.getAttemptStats());
    }
  }

  getCanvasPoint(pointer) {
    var left = this.canvasLeft;
    var top = this.canvasTop;
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      try {
        var rect = this.canvas.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
      } catch (err) {
        // Use cached offsets.
      }
    }
    return {
      x: pointer.x - left,
      y: pointer.y - top,
    };
  }

  screenToWorld(point) {
    return yarnScreenToWorld(point, getYarnTimeLayout(this.canvasSize, this.level));
  }

  undoLastTurn() {
    return false;
  }

  destroy() {
    this.level = null;
    this.cat = null;
    this.yarn = null;
    this.pointer = null;
  }
}

function createNodeMap(level) {
  var map = {};
  (level.nodes || []).forEach(function (node) {
    map[node.id] = node;
  });
  return map;
}

function createEdgeMap(level) {
  var map = {};
  (level.edges || []).forEach(function (edge) {
    map[edge.id] = edge;
  });
  return map;
}

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function clonePoint(point) {
  return {
    id: point.id || '',
    x: point.x,
    y: point.y,
    z: Number(point.z) || 0,
  };
}

function isGridAdjacent(a, b) {
  if ((Number(a.z) || 0) !== (Number(b.z) || 0)) return false;
  var dx = Math.abs(Number(a.x) - Number(b.x));
  var dy = Math.abs(Number(a.y) - Number(b.y));
  return dx + dy === 1;
}

function pointDistance(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  var dz = (Number(a.z) || 0) - (Number(b.z) || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function positiveModulo(value, mod) {
  return ((value % mod) + mod) % mod;
}

function isSpikeRaised(node, phase) {
  var activeFrom = clamp01(Number(node && node.activeFrom) || 0.45);
  var activeTo = clamp01(node && node.activeTo != null ? Number(node.activeTo) : 0.86);
  if (activeTo >= activeFrom) {
    return phase >= activeFrom && phase <= activeTo;
  }
  return phase >= activeFrom || phase <= activeTo;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildPath(cameFrom, start, end) {
  var path = [end];
  var current = end;
  while (current !== start) {
    current = cameFrom[current];
    if (current === undefined) return null;
    path.unshift(current);
  }
  return path;
}
