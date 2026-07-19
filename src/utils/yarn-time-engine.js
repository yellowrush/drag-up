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
    this.bridgeStates = {};
    this.liftBridgeStates = {};
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
    this.bridgeStates = this.createInitialBridgeStates();
    this.liftBridgeStates = this.createInitialLiftBridgeStates();
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
    if (!this.level || !this.cat || !this.yarn || !this.time) return;
    var now = Date.now();
    var dt = Math.min(64, now - this.lastUpdateAt);
    this.lastUpdateAt = now;
    this.now = now;

    this.updateClock(dt);
    this.updateBridgeStates(dt);
    this.updateLiftBridgeStates(dt);
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
    var self = this;
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
      } else if (kind === 'rotating-bridge') {
        var active = self.isRotatingBridgeNodeActive(node);
        states[node.id] = {
          kind: kind,
          safe: active,
          phase: active ? 1 : 0,
          active: active,
        };
      } else if (kind === 'lifting-bridge') {
        var liftActive = self.isLiftingBridgeNodeActive(node);
        states[node.id] = {
          kind: kind,
          safe: liftActive,
          phase: liftActive ? 1 : 0,
          active: liftActive,
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
    if (node.kind === 'rotating-bridge') {
      var active = this.isRotatingBridgeNodeActive(node);
      return { safe: active, phase: active ? 1 : 0, active: active, kind: node.kind };
    }
    if (node.kind === 'lifting-bridge') {
      var liftActive = this.isLiftingBridgeNodeActive(node);
      return { safe: liftActive, phase: liftActive ? 1 : 0, active: liftActive, kind: node.kind };
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
    if (node.kind === 'rotating-bridge') {
      var active = this.isRotatingBridgeNodeActive(node);
      state.safe = active;
      state.active = active;
      state.phase = active ? 1 : 0;
      return;
    }
    if (node.kind === 'lifting-bridge') {
      var liftActive = this.isLiftingBridgeNodeActive(node);
      state.safe = liftActive;
      state.active = liftActive;
      state.phase = liftActive ? 1 : 0;
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
      return;
    }

    var liftBridge = this.findLiftBridgeAt(point);
    if (liftBridge && this.beginLiftBridgeDrag(liftBridge, point)) {
      this.pointer = { type: 'lifting-bridge', bridgeId: liftBridge.id };
      return;
    }

    if (this.rotateBridgeAt(point)) {
      this.pointer = { type: 'rotating-bridge' };
      return;
    }
  }

  handlePointerMove(pointer) {
    if (this.pointer && this.pointer.type === 'lifting-bridge') {
      this.updateLiftBridgeDrag(this.getCanvasPoint(pointer));
      return;
    }
    if (!this.pointer || this.pointer.type !== 'yarn' || !this.yarn.isHeld) {
      return;
    }
    var point = this.getCanvasPoint(pointer);
    this.yarn.pos = this.screenToWorld(point);
    this.yarn.validDropNodeId = this.findValidDropNode(point);
  }

  handlePointerUp(pointer) {
    if (!this.pointer) return;
    if (this.pointer.type === 'lifting-bridge') {
      this.finishLiftBridgeDrag(pointer ? this.getCanvasPoint(pointer) : null);
      this.pointer = null;
      return;
    }
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

  createInitialBridgeStates() {
    var states = {};
    (this.level.rotatingBridges || []).forEach(function (bridge) {
      var orientation = normalizeBridgeOrientation(bridge.initialOrientation || bridge.orientation);
      states[bridge.id] = {
        id: bridge.id,
        orientation: orientation,
        fromOrientation: orientation,
        toOrientation: orientation,
        progress: 1,
        animating: false,
        duration: Number(bridge.duration) || 360,
      };
    });
    return states;
  }

  createInitialLiftBridgeStates() {
    var states = {};
    (this.level.liftingBridges || []).forEach(function (bridge) {
      var lowerZ = getLiftBridgeLowerZ(bridge);
      var upperZ = getLiftBridgeUpperZ(bridge);
      var initialZ = clampRange(
        bridge.initialZ != null ? Number(bridge.initialZ) : lowerZ,
        lowerZ,
        upperZ
      );
      states[bridge.id] = {
        id: bridge.id,
        z: initialZ,
        displayZ: initialZ,
        fromZ: initialZ,
        toZ: initialZ,
        lowerZ: lowerZ,
        upperZ: upperZ,
        progress: 1,
        animating: false,
        dragging: false,
        dragStartY: 0,
        dragStartZ: initialZ,
        duration: Number(bridge.duration) || 440,
      };
    });
    return states;
  }

  updateBridgeStates(dt) {
    var self = this;
    (this.level.rotatingBridges || []).forEach(function (bridge) {
      var state = self.bridgeStates[bridge.id];
      if (!state || !state.animating) return;
      var duration = Math.max(80, Number(state.duration) || Number(bridge.duration) || 360);
      state.progress = Math.min(1, Number(state.progress) + dt / duration);
      if (state.progress >= 1) {
        state.orientation = state.toOrientation;
        state.fromOrientation = state.orientation;
        state.animating = false;
      }
    });
  }

  updateLiftBridgeStates(dt) {
    var self = this;
    (this.level.liftingBridges || []).forEach(function (bridge) {
      var state = self.liftBridgeStates[bridge.id];
      if (!state) return;
      if (state.dragging) return;
      if (!state.animating) {
        state.displayZ = state.z;
        return;
      }
      var duration = Math.max(80, Number(state.duration) || Number(bridge.duration) || 440);
      state.progress = Math.min(1, Number(state.progress) + dt / duration);
      var eased = easeInOutCubic(state.progress);
      state.displayZ = Number(state.fromZ) + (Number(state.toZ) - Number(state.fromZ)) * eased;
      if (state.progress >= 1) {
        state.z = state.toZ;
        state.displayZ = state.z;
        state.fromZ = state.z;
        state.animating = false;
      }
    });
  }

  rotateBridgeAt(point) {
    var bridge = this.findRotatingBridgeAt(point);
    if (!bridge) return false;
    var state = this.bridgeStates[bridge.id];
    if (!state || state.animating) return false;
    var targetOrientation = state.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    if (!this.canRotatingBridgeOccupy(bridge, targetOrientation)) return false;
    state.fromOrientation = state.orientation;
    state.toOrientation = targetOrientation;
    state.progress = 0;
    state.animating = true;
    state.duration = Number(bridge.duration) || 360;
    this.levelStats.rotateCount += 1;
    return true;
  }

  findRotatingBridgeAt(point) {
    if (!point || !this.level || !(this.level.rotatingBridges || []).length) return null;
    var layout = getYarnTimeLayout(this.canvasSize, this.level);
    var tileW = layout.grid && layout.grid.enabled ? layout.grid.tileW : 56;
    var hitRadius = Math.max(30, tileW * 0.5);
    for (var i = 0; i < this.level.rotatingBridges.length; i++) {
      var bridge = this.level.rotatingBridges[i];
      if (!bridge || !bridge.center) continue;
      var center = yarnWorldToScreen(bridge.center, layout);
      var dx = point.x - center.x;
      var dy = point.y - center.y;
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
        return bridge;
      }
    }
    return null;
  }

  isRotatingBridgeNodeActive(node) {
    if (!node || node.kind !== 'rotating-bridge') return false;
    var bridge = this.findRotatingBridgeForNode(node);
    if (!bridge) return false;
    var state = this.bridgeStates[bridge.id];
    var orientation = state ? state.orientation : normalizeBridgeOrientation(bridge.initialOrientation || bridge.orientation);
    var keys = createBridgeActiveKeyMap(bridge, orientation);
    return !!keys[getGridKey(node)];
  }

  findRotatingBridgeForNode(node) {
    if (!node) return null;
    var bridges = this.level.rotatingBridges || [];
    for (var i = 0; i < bridges.length; i++) {
      if (node.bridgeId && bridges[i].id === node.bridgeId) return bridges[i];
    }
    return null;
  }

  canRotatingBridgeOccupy(bridge, orientation) {
    if (!bridge) return false;
    var keys = createBridgeActiveKeyMap(bridge, orientation);
    return this.areBridgeTargetCellsEmpty(keys, function (node) {
      return node.kind === 'rotating-bridge' && node.bridgeId === bridge.id;
    });
  }

  findLiftBridgeAt(point) {
    if (!point || !this.level || !(this.level.liftingBridges || []).length) return null;
    var layout = getYarnTimeLayout(this.canvasSize, this.level);
    var tileW = layout.grid && layout.grid.enabled ? layout.grid.tileW : 56;
    var hitRadius = Math.max(34, tileW * 0.58);
    for (var i = 0; i < this.level.liftingBridges.length; i++) {
      var bridge = this.level.liftingBridges[i];
      if (!bridge || !bridge.center) continue;
      var state = this.liftBridgeStates[bridge.id];
      if (!state || state.animating) continue;
      var center = yarnWorldToScreen({
        x: bridge.center.x,
        y: bridge.center.y,
        z: state.displayZ != null ? state.displayZ : state.z,
      }, layout);
      var dx = point.x - center.x;
      var dy = point.y - center.y;
      if (Math.sqrt(dx * dx + dy * dy) <= hitRadius) {
        return bridge;
      }
    }
    return null;
  }

  beginLiftBridgeDrag(bridge, point) {
    if (!bridge || !point) return false;
    var state = this.liftBridgeStates[bridge.id];
    if (!state || state.animating) return false;
    state.dragging = true;
    state.dragStartY = point.y;
    state.dragStartZ = state.z;
    state.displayZ = state.z;
    state.fromZ = state.z;
    state.toZ = state.z;
    state.progress = 1;
    this.updateTileStates(0);
    return true;
  }

  updateLiftBridgeDrag(point) {
    if (!point || !this.pointer || this.pointer.type !== 'lifting-bridge') return;
    var bridge = this.findLiftBridgeById(this.pointer.bridgeId);
    var state = bridge ? this.liftBridgeStates[bridge.id] : null;
    if (!bridge || !state || !state.dragging) return;
    var layout = getYarnTimeLayout(this.canvasSize, this.level);
    var tileDepth = layout.grid && layout.grid.enabled ? layout.grid.tileDepth : 24;
    var deltaZ = -(point.y - state.dragStartY) / Math.max(1, tileDepth);
    var nextZ = clampRange(state.dragStartZ + deltaZ, state.lowerZ, state.upperZ);
    if (nextZ > state.z && !this.canLiftingBridgeOccupy(bridge, state.upperZ)) {
      nextZ = Math.min(nextZ, state.z);
    } else if (nextZ < state.z && !this.canLiftingBridgeOccupy(bridge, state.lowerZ)) {
      nextZ = Math.max(nextZ, state.z);
    }
    state.displayZ = nextZ;
    this.updateTileStates(0);
  }

  finishLiftBridgeDrag(point) {
    if (point) {
      this.updateLiftBridgeDrag(point);
    }
    if (!this.pointer || this.pointer.type !== 'lifting-bridge') return false;
    var bridge = this.findLiftBridgeById(this.pointer.bridgeId);
    var state = bridge ? this.liftBridgeStates[bridge.id] : null;
    if (!bridge || !state) return false;
    var midpoint = (state.lowerZ + state.upperZ) / 2;
    var targetZ = state.displayZ >= midpoint ? state.upperZ : state.lowerZ;
    if (targetZ !== state.z && !this.canLiftingBridgeOccupy(bridge, targetZ)) {
      targetZ = state.z;
    }
    state.dragging = false;
    state.fromZ = state.displayZ;
    state.toZ = targetZ;
    state.progress = 0;
    state.animating = Math.abs(state.fromZ - targetZ) > 0.001;
    state.duration = Number(bridge.duration) || 440;
    if (!state.animating) {
      state.z = targetZ;
      state.displayZ = targetZ;
      state.progress = 1;
    } else if (targetZ !== state.z) {
      this.levelStats.rotateCount += 1;
    }
    this.updateTileStates(0);
    return true;
  }

  findLiftBridgeById(bridgeId) {
    var bridges = this.level.liftingBridges || [];
    for (var i = 0; i < bridges.length; i++) {
      if (bridges[i].id === bridgeId) return bridges[i];
    }
    return null;
  }

  isLiftingBridgeNodeActive(node) {
    if (!node || node.kind !== 'lifting-bridge') return false;
    var bridge = this.findLiftBridgeForNode(node);
    if (!bridge) return false;
    var state = this.liftBridgeStates[bridge.id];
    if (!state || state.animating || state.dragging) return false;
    var keys = createLiftBridgeActiveKeyMap(bridge, state.z);
    return !!keys[getGridKey(node)];
  }

  findLiftBridgeForNode(node) {
    if (!node) return null;
    var bridges = this.level.liftingBridges || [];
    for (var i = 0; i < bridges.length; i++) {
      if (node.liftBridgeId && bridges[i].id === node.liftBridgeId) return bridges[i];
    }
    return null;
  }

  canLiftingBridgeOccupy(bridge, liftZ) {
    if (!bridge) return false;
    var keys = createLiftBridgeActiveKeyMap(bridge, liftZ);
    return this.areBridgeTargetCellsEmpty(keys, function (node) {
      return node.kind === 'lifting-bridge' && node.liftBridgeId === bridge.id;
    });
  }

  areBridgeTargetCellsEmpty(keys, isOwnBridgeNode) {
    if (!keys) return false;
    var nodes = this.level && this.level.nodes ? this.level.nodes : [];
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || !keys[getGridKey(node)]) continue;
      if (isOwnBridgeNode && isOwnBridgeNode(node)) continue;
      return false;
    }
    return true;
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
    this.bridgeStates = {};
    this.liftBridgeStates = {};
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
  var dx = Math.abs(Number(a.x) - Number(b.x));
  var dy = Math.abs(Number(a.y) - Number(b.y));
  var dz = Math.abs((Number(a.z) || 0) - (Number(b.z) || 0));
  if (dz === 0) return dx + dy === 1;
  return (dz === 1 || dz === 2) && dx + dy === 1 && canUseStairBetween(a, b);
}

function normalizeBridgeOrientation(orientation) {
  return orientation === 'horizontal' ? 'horizontal' : 'vertical';
}

function createBridgeActiveKeyMap(bridge, orientation) {
  var keys = {};
  if (!bridge || !bridge.center) return keys;
  var length = Math.max(1, Number(bridge.length) || 3);
  var arm = Math.floor(length / 2);
  var center = bridge.center;
  for (var i = -arm; i <= arm; i++) {
    var x = Number(center.x) || 0;
    var y = Number(center.y) || 0;
    if (orientation === 'horizontal') x += i;
    else y += i;
    keys[getGridKey({ x: x, y: y, z: Number(center.z) || 0 })] = true;
  }
  return keys;
}

function createLiftBridgeActiveKeyMap(bridge, liftZ) {
  var keys = {};
  if (!bridge || !bridge.center) return keys;
  var length = Math.max(1, Number(bridge.length) || 3);
  var arm = Math.floor(length / 2);
  var orientation = bridge.orientation === 'vertical' ? 'vertical' : 'horizontal';
  var center = bridge.center;
  for (var i = -arm; i <= arm; i++) {
    var x = Number(center.x) || 0;
    var y = Number(center.y) || 0;
    if (orientation === 'horizontal') x += i;
    else y += i;
    keys[getGridKey({ x: x, y: y, z: liftZ })] = true;
  }
  return keys;
}

function getLiftBridgeLowerZ(bridge) {
  if (bridge && bridge.lowerZ != null) return Number(bridge.lowerZ) || 0;
  return bridge && bridge.center ? Number(bridge.center.z) || 0 : 0;
}

function getLiftBridgeUpperZ(bridge) {
  if (bridge && bridge.upperZ != null) return Number(bridge.upperZ) || 0;
  return getLiftBridgeLowerZ(bridge) + 2;
}

function isStairNode(node) {
  return node && node.kind === 'stair';
}

function canUseStairBetween(a, b) {
  if (!isStairNode(a) && !isStairNode(b)) return false;
  var lower = (Number(a.z) || 0) <= (Number(b.z) || 0) ? a : b;
  var upper = lower === a ? b : a;
  var dx = Number(upper.x) - Number(lower.x);
  var dy = Number(upper.y) - Number(lower.y);
  return stairDirectionMatches(lower, dx, dy) || stairDirectionMatches(upper, dx, dy);
}

function stairDirectionMatches(node, dx, dy) {
  if (!isStairNode(node)) return false;
  var dir = getStairDirection(node);
  if (!dir) return true;
  return dir.dx === dx && dir.dy === dy;
}

function getStairDirection(node) {
  var direction = node && (node.stairDirection || node.direction || node.facing);
  if (direction === 'north' || direction === 'up' || direction === '-y') return { dx: 0, dy: -1 };
  if (direction === 'south' || direction === 'down' || direction === '+y') return { dx: 0, dy: 1 };
  if (direction === 'east' || direction === 'right' || direction === '+x') return { dx: 1, dy: 0 };
  if (direction === 'west' || direction === 'left' || direction === '-x') return { dx: -1, dy: 0 };
  return null;
}

function getGridKey(point) {
  return [
    Number(point.x) || 0,
    Number(point.y) || 0,
    Number(point.z) || 0,
  ].join(':');
}

function pointDistance(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  var dz = (Number(a.z) || 0) - (Number(b.z) || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function easeInOutCubic(t) {
  var v = clamp01(t);
  return v < 0.5
    ? 4 * v * v * v
    : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

function clampRange(value, min, max) {
  var lower = Math.min(min, max);
  var upper = Math.max(min, max);
  if (!Number.isFinite(value)) return lower;
  return Math.max(lower, Math.min(upper, value));
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
