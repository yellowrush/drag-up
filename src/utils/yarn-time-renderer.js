import { renderCubAvatar } from './cub.js';
import { renderRewardSuccessBurst } from './reward-effects.js';

var TAU = Math.PI * 2;

export function getYarnTimeLayout(canvasSize, level) {
  var width = canvasSize && canvasSize.width ? canvasSize.width : 375;
  var height = canvasSize && canvasSize.height ? canvasSize.height : 600;
  var sidePad = Math.max(20, width * 0.06);
  var topPad = Math.max(20, height * 0.06);
  var bottomPad = Math.max(102, height * 0.18);
  var layout = {
    x: sidePad,
    y: topPad,
    w: Math.max(1, width - sidePad * 2),
    h: Math.max(1, height - topPad - bottomPad),
    width: width,
    height: height,
  };
  if (level && level.roomStyle === 'isometric-grid') {
    attachGridLayout(layout, level);
  }
  return layout;
}

export function yarnWorldToScreen(point, layout) {
  if (layout && layout.grid && layout.grid.enabled) {
    var z = Number(point.z) || 0;
    return {
      x: layout.grid.originX + (point.x - point.y) * layout.grid.tileW / 2,
      y: layout.grid.originY + (point.x + point.y) * layout.grid.tileH / 2 - z * layout.grid.tileDepth,
    };
  }
  return {
    x: layout.x + point.x * layout.w,
    y: layout.y + point.y * layout.h,
  };
}

export function yarnScreenToWorld(point, layout) {
  if (layout && layout.grid && layout.grid.enabled) {
    var sx = (point.x - layout.grid.originX) / (layout.grid.tileW / 2);
    var sy = (point.y - layout.grid.originY) / (layout.grid.tileH / 2);
    return {
      x: (sy + sx) / 2,
      y: (sy - sx) / 2,
      z: 0,
    };
  }
  return {
    x: (point.x - layout.x) / layout.w,
    y: (point.y - layout.y) / layout.h,
  };
}

function attachGridLayout(layout, level) {
  var rawTileW = Number(level.grid && level.grid.tileWidth) || 52;
  var rawTileH = Number(level.grid && level.grid.tileHeight) || rawTileW * 0.52;
  var rawDepth = rawTileH;
  var bounds = getGridBounds(level.nodes || [], rawTileW, rawTileH, rawDepth);
  var rawW = Math.max(1, bounds.maxX - bounds.minX);
  var rawH = Math.max(1, bounds.maxY - bounds.minY);
  var scale = Math.min(layout.w / rawW, layout.h / rawH) * 0.82;
  var tileW = rawTileW * scale;
  var tileH = rawTileH * scale;
  var tileDepth = rawDepth * scale;
  var scaledBounds = getGridBounds(level.nodes || [], tileW, tileH, tileDepth);
  var centerX = (scaledBounds.minX + scaledBounds.maxX) / 2;
  var centerY = (scaledBounds.minY + scaledBounds.maxY) / 2;

  layout.grid = {
    enabled: true,
    tileW: tileW,
    tileH: tileH,
    tileDepth: tileDepth,
    originX: layout.x + layout.w / 2 - centerX,
    originY: layout.y + layout.h / 2 - centerY - tileDepth * 0.25,
  };
}

function getGridBounds(nodes, tileW, tileH, tileDepth) {
  var minX = Infinity;
  var minY = Infinity;
  var maxX = -Infinity;
  var maxY = -Infinity;
  if (!nodes.length) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }
  function includePoint(point) {
    var z = Number(point.z) || 0;
    var cx = (point.x - point.y) * tileW / 2;
    var cy = (point.x + point.y) * tileH / 2 - z * tileDepth;
    minX = Math.min(minX, cx - tileW / 2);
    maxX = Math.max(maxX, cx + tileW / 2);
    minY = Math.min(minY, cy - tileH / 2);
    maxY = Math.max(maxY, cy + tileH / 2 + tileDepth);
  }
  nodes.forEach(function (node) {
    includePoint(node);
    getFloatingTilePath(node).forEach(includePoint);
  });
  return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
}

export function getYarnClockAction(point, canvasSize) {
  var control = getClockControl(canvasSize);
  if (isPointInCircle(point, control.rewind)) return 'rewind';
  if (isPointInCircle(point, control.pause)) return 'pause';
  return '';
}

export function renderYarnTime(ctx, state, canvasSize, options) {
  if (!ctx || !state || !state.level) return;
  options = options || {};
  var layout = getYarnTimeLayout(canvasSize, state.level);
  var t = state.now / 1000;
  var isGrid = layout.grid && layout.grid.enabled;

  drawRoom(ctx, state, layout);
  if (!isGrid) {
    drawEdges(ctx, state, layout);
  }
  drawGoalNest(ctx, state, layout, t);
  if (!isGrid) {
    drawNodes(ctx, state, layout);
  }
  drawDropPreview(ctx, state, layout);
  drawCharacters(ctx, state, layout, t, options);
  if (!state.completed) {
    drawClockControl(ctx, state, canvasSize);
  }
  drawStatusHints(ctx, state, canvasSize);
  if (state.completed) {
    drawCompletionGlow(ctx, state, layout, t);
  }
  if (options.successAnimation) {
    options.successAnimation.render(ctx);
  }
}

export function createYarnTimeSuccessAnimation(state, canvasSize, options) {
  var layout = getYarnTimeLayout(canvasSize, state.level);
  var center = state.cat && state.cat.pos
    ? yarnWorldToScreen(state.cat.pos, layout)
    : { x: canvasSize.width / 2, y: canvasSize.height / 2 };
  var isGrid = layout.grid && layout.grid.enabled;
  var tile = layout.tile || { w: 56, h: 32 };
  var size = isGrid
    ? Math.max(34, Math.min(54, tile.w * 0.74))
    : Math.max(46, Math.min(layout.w, layout.h) * 0.17);
  return new YarnTimeSuccessAnimation(center, size, options || {});
}

function YarnTimeSuccessAnimation(center, size, options) {
  this.center = center;
  this.size = size;
  this.accessoryId = options.accessoryId || '';
  this.expressionId = options.expressionId || '';
  this.startTime = Date.now();
  this.duration = 980;
  this.t = 0;
}

YarnTimeSuccessAnimation.prototype.update = function () {
  this.t = Math.min(1, (Date.now() - this.startTime) / this.duration);
};

YarnTimeSuccessAnimation.prototype.render = function (ctx) {
  var t = this.t || 0;
  var pop = 0.76 + 0.24 * easeOutBack(Math.min(1, t * 1.18));
  var lift = -this.size * 0.52 * easeOutCubic(t);
  var center = {
    x: this.center.x,
    y: this.center.y + lift,
  };

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(pop, pop);
  renderCubAvatar(ctx, this.size, {
    accessoryId: this.accessoryId,
    expressionId: this.expressionId || 'joy',
    isHovered: true,
    lookOffset: { x: 0, y: 0 },
    time: Date.now() / 1000,
  });
  drawYarnBall(ctx, { x: this.size * 0.38, y: this.size * 0.3 }, this.size * 0.17, Date.now() / 1000, 'playing');
  ctx.restore();

  if (t < 1) {
    renderRewardSuccessBurst(ctx, center, this.size * 1.45, t, {
      accessoryId: this.accessoryId,
      expressionId: this.expressionId,
    });
  }
};

function easeOutCubic(t) {
  var d = 1 - t;
  return 1 - d * d * d;
}

function easeOutBack(t) {
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutCubic(t) {
  var v = clamp01(t);
  return v < 0.5
    ? 4 * v * v * v
    : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

export function drawYarnBall(ctx, center, radius, t, mode) {
  var pulse = mode === 'target' ? Math.sin(t * 6) * radius * 0.08 : 0;
  var heldLift = mode === 'held' ? Math.sin(t * 12) * radius * 0.04 : 0;
  var r = radius + pulse;

  ctx.save();
  ctx.translate(center.x, center.y - heldLift);

  ctx.fillStyle = 'rgba(64,35,42,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.76 + heldLift, r * 0.76, r * 0.18, 0, 0, TAU);
  ctx.fill();

  var gradient = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.18, 0, 0, r * 1.12);
  gradient.addColorStop(0, '#ffd0dd');
  gradient.addColorStop(0.58, '#ef6f96');
  gradient.addColorStop(1, '#b93868');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#7d2444';
  ctx.lineWidth = Math.max(1.4, r * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,247,251,0.72)';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(-r * 0.08, -r * 0.04, r * 0.66, -0.85, 0.72);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.08, r * 0.02, r * 0.58, 2.18, 4.1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(121,35,67,0.8)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(r * 0.04, -r * 0.02, r * 0.42, 0.1, 2.7);
  ctx.stroke();

  ctx.strokeStyle = '#8f2b50';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(r * 0.72, r * 0.2);
  ctx.quadraticCurveTo(r * 1.18, r * 0.58, r * 1.5, r * 0.22 + Math.sin(t * 4) * r * 0.18);
  ctx.stroke();

  ctx.restore();
}

export function drawYarnPlayCat(ctx, center, size, yarnCenter, options) {
  options = options || {};
  var t = options.time || Date.now() / 1000;
  var bob = Math.sin(t * 5) * size * 0.025;
  var pawPhase = (Math.sin(t * TAU / 1.2) + 1) * 0.5;
  var lookOffset = getLookOffset(center, yarnCenter);

  ctx.save();
  ctx.translate(center.x, center.y + bob);
  ctx.scale(1.02 + Math.sin(t * 4) * 0.015, 1.02 - Math.sin(t * 4) * 0.01);
  renderCubAvatar(ctx, size, {
    accessoryId: options.accessoryId,
    expressionId: options.expressionId || 'joy',
    isHovered: true,
    lookOffset: lookOffset,
    time: t,
  });
  ctx.restore();

  drawYarnBall(ctx, yarnCenter, size * 0.18, t, 'playing');
  drawPlayPaw(ctx, {
    x: yarnCenter.x - size * 0.34,
    y: yarnCenter.y - size * 0.14 - pawPhase * size * 0.09,
  }, size * 0.15, -0.32);
  drawPlayPaw(ctx, {
    x: yarnCenter.x + size * 0.35,
    y: yarnCenter.y - size * 0.13 - (1 - pawPhase) * size * 0.09,
  }, size * 0.15, 0.32);
}

export function drawYarnPickupPreview(ctx, yarn, isValidDrop) {
  if (!yarn || !yarn.center) return;
  var radius = yarn.radius || 16;
  ctx.save();
  ctx.strokeStyle = isValidDrop ? 'rgba(86,181,116,0.82)' : 'rgba(218,84,94,0.82)';
  ctx.fillStyle = isValidDrop ? 'rgba(86,181,116,0.12)' : 'rgba(218,84,94,0.12)';
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.setLineDash([radius * 0.3, radius * 0.22]);
  ctx.beginPath();
  ctx.arc(yarn.center.x, yarn.center.y, radius * 1.55, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRoom(ctx, state, layout) {
  if (state.level.roomStyle === 'isometric-grid' || state.level.roomStyle === 'isometric-tiles') {
    drawIsometricRoom(ctx, state, layout);
    return;
  }

  ctx.save();
  ctx.fillStyle = '#f3dfbd';
  ctx.strokeStyle = '#8a6543';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  (state.level.roomPolygons || []).forEach(function (polygon) {
    if (!polygon.length) return;
    ctx.beginPath();
    polygon.forEach(function (point, index) {
      var screen = yarnWorldToScreen(point, layout);
      if (!index) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#b98658';
  ctx.lineWidth = 1;
  for (var i = 0; i < 8; i++) {
    var y = layout.y + layout.h * (0.18 + i * 0.09);
    ctx.beginPath();
    ctx.moveTo(layout.x + layout.w * 0.1, y);
    ctx.quadraticCurveTo(layout.x + layout.w * 0.46, y + (i % 2 ? 9 : -7), layout.x + layout.w * 0.9, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIsometricRoom(ctx, state, layout) {
  var tile = getIsoTileMetrics(layout);
  ctx.save();

  var background = ctx.createLinearGradient(0, 0, 0, layout.height);
  background.addColorStop(0, '#062b3a');
  background.addColorStop(1, '#081b2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawDistantFloats(ctx, layout, tile);
  drawFloatingTileTracks(ctx, state, layout, tile);

  var sortedNodes = createIsometricRenderNodes(state.level.nodes || []).sort(function (a, b) {
    var ad = a.x + a.y + (a.z || 0) * 2;
    var bd = b.x + b.y + (b.z || 0) * 2;
    return ad === bd ? a.x - b.x : ad - bd;
  });
  sortedNodes.forEach(function (node) {
    var center = yarnWorldToScreen(node, layout);
    var height = tile.depth;
    var stateInfo = state.tileStates && state.tileStates[node.id];
    if (node.kind === 'support-block') {
      drawIsoTile(ctx, center, tile.w, tile.h, height, getSupportBlockPalette(), {
        skipShadow: (Number(node.z) || 0) > 0,
      });
      return;
    }
    if (node.kind === 'stair') {
      drawStairTile(ctx, node, center, tile);
      return;
    }
    if (isFloatingTileNode(node)) {
      drawFloatingTile(ctx, center, tile, stateInfo, state.floatingTileStates && state.floatingTileStates[node.id], state.now / 1000);
      return;
    }
    if (node.kind === 'rotating-bridge') {
      var bridgeState = getNodeRotatingBridgeState(node, state);
      var bridgeRole = bridgeState && !bridgeState.animating
        ? getRotatingBridgeNodeRole(node, bridgeState)
        : '';
      if (bridgeRole) {
        drawRotatingBridgeGridCell(ctx, center, tile, bridgeRole, bridgeState.orientation);
        return;
      }
      drawRotatingBridgeSocketTile(ctx, center, tile, bridgeState && bridgeState.animating ? { active: false } : stateInfo);
      return;
    }
    if (node.kind === 'lifting-bridge') {
      var liftState = getNodeLiftingBridgeState(node, state);
      var liftMoving = liftState && (liftState.animating || liftState.dragging);
      var liftRole = liftState && !liftMoving
        ? getLiftingBridgeNodeRole(node, liftState)
        : '';
      if (liftRole) {
        drawLiftingBridgeGridCell(ctx, center, tile, liftRole, liftState);
        return;
      }
      drawLiftingBridgeSocketTile(ctx, center, tile, liftState && liftMoving ? { active: false } : stateInfo);
      return;
    }
    var palette = getTilePalette(node, stateInfo);
    drawIsoTile(ctx, center, tile.w, tile.h, height, palette, {
      skipShadow: (Number(node.z) || 0) > 0,
    });
    drawIsoTileDetails(ctx, node, center, tile, stateInfo, state.now / 1000);
  });
  drawRotatingBridgeOverlays(ctx, state, layout, tile);
  drawLiftingBridgeOverlays(ctx, state, layout, tile);

  ctx.restore();
}

function createIsometricRenderNodes(nodes) {
  var realKeys = {};
  var supportKeys = {};
  var result = (nodes || []).slice();
  (nodes || []).forEach(function (node) {
    realKeys[getRenderGridKey(node)] = true;
  });
  (nodes || []).forEach(function (node) {
    var z = Number(node.z) || 0;
    if (z <= 0) return;
    if (isFloatingTileNode(node)) return;
    for (var supportZ = z - 1; supportZ >= 0; supportZ -= 1) {
      var support = {
        id: 'support:' + node.id + ':' + supportZ,
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        z: supportZ,
        kind: 'support-block',
      };
      var key = getRenderGridKey(support);
      if (realKeys[key] || supportKeys[key]) continue;
      supportKeys[key] = true;
      result.push(support);
    }
  });
  return result;
}

function isFloatingTileNode(node) {
  return !!(node && (node.kind === 'floating-tile' || node.kind === 'floating'));
}

function getFloatingTilePath(node) {
  if (!isFloatingTileNode(node)) return [];
  var path = Array.isArray(node.motionPath) && node.motionPath.length
    ? node.motionPath
    : Array.isArray(node.path) && node.path.length
      ? node.path
      : [];
  return path.map(function (point) {
    return {
      x: Number(point && point.x != null ? point.x : node.x) || 0,
      y: Number(point && point.y != null ? point.y : node.y) || 0,
      z: Number(point && point.z != null ? point.z : node.z) || 0,
    };
  });
}

function getRenderGridKey(point) {
  return [
    Number(point.x) || 0,
    Number(point.y) || 0,
    Number(point.z) || 0,
  ].join(':');
}

function drawDistantFloats(ctx, layout, tile) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  [
    { x: layout.x + layout.w * 0.12, y: layout.y + layout.h * 0.18, s: 0.72 },
    { x: layout.x + layout.w * 0.88, y: layout.y + layout.h * 0.22, s: 0.64 },
    { x: layout.x + layout.w * 0.10, y: layout.y + layout.h * 0.80, s: 0.52 },
    { x: layout.x + layout.w * 0.86, y: layout.y + layout.h * 0.76, s: 0.46 },
  ].forEach(function (float) {
    ctx.fillStyle = 'rgba(191,226,221,0.55)';
    ctx.strokeStyle = 'rgba(222,246,242,0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(float.x, float.y, tile.w * float.s, tile.h * float.s * 0.52, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawFloatingTileTracks(ctx, state, layout, tile) {
  (state.level.nodes || []).forEach(function (node) {
    var path = getFloatingTilePath(node);
    if (path.length < 2) return;
    var screenPath = path.map(function (point) {
      return yarnWorldToScreen(point, layout);
    });
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(89, 172, 190, 0.42)';
    ctx.lineWidth = Math.max(2, tile.w * 0.035);
    ctx.setLineDash([tile.w * 0.13, tile.w * 0.09]);
    ctx.beginPath();
    screenPath.forEach(function (point, index) {
      if (!index) ctx.moveTo(point.x, point.y + tile.depth * 0.58);
      else ctx.lineTo(point.x, point.y + tile.depth * 0.58);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    path.forEach(function (point) {
      var center = yarnWorldToScreen(point, layout);
      drawFloatingTileDock(ctx, center, tile);
    });
    ctx.restore();
  });
}

function drawFloatingTileDock(ctx, center, tile) {
  var top = getIsoTopPoints({ x: center.x, y: center.y + tile.depth * 0.52 }, tile.w * 0.76, tile.h * 0.76);
  ctx.save();
  ctx.fillStyle = 'rgba(135, 213, 209, 0.12)';
  ctx.strokeStyle = 'rgba(96, 169, 180, 0.38)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.022);
  tracePoly(ctx, top);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawIsometricBridgeTiles(ctx, state, layout, tile) {
  (state.level.edges || []).forEach(function (edge) {
    var from = state.nodeMap[edge.from];
    var to = state.nodeMap[edge.to];
    if (!from || !to) return;
    var stateInfo = state.edgeStates && state.edgeStates[edge.id];
    var safe = !stateInfo || stateInfo.safe;
    var fromCenter = yarnWorldToScreen(from, layout);
    var toCenter = yarnWorldToScreen(to, layout);
    var mid = {
      x: (fromCenter.x + toCenter.x) / 2,
      y: (fromCenter.y + toCenter.y) / 2,
    };
    var height = Math.min(getNodeTileHeight(from, tile), getNodeTileHeight(to, tile)) * 0.72;
    var palette = getBridgePalette(edge, safe);
    drawIsoTile(ctx, mid, tile.w * 0.78, tile.h * 0.78, height, palette);
  });
}

function drawIsoTile(ctx, center, width, height, depth, palette, options) {
  var top = getIsoTopPoints(center, width, height);
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + depth };
  });
  options = options || {};

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (!options.skipShadow) {
    ctx.fillStyle = 'rgba(56,39,72,0.16)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + depth + height * 0.58, width * 0.46, height * 0.28, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = palette.right;
  tracePoly(ctx, [top[1], bottom[1], bottom[2], top[2]]);
  ctx.fill();

  ctx.fillStyle = palette.left;
  tracePoly(ctx, [top[2], bottom[2], bottom[3], top[3]]);
  ctx.fill();

  ctx.fillStyle = palette.top;
  tracePoly(ctx, top);
  ctx.fill();

  ctx.restore();
}

function drawIsoTileDetails(ctx, node, center, tile, stateInfo, t) {
  if (!node) return;
  if (node.bridge) {
    drawBridgeTrim(ctx, center, tile, node.kind === 'spike' ? { safe: true } : stateInfo);
  }
  if (node.kind === 'crumble') {
    drawCrumbleTileMarks(ctx, center, tile, stateInfo);
  } else if (node.kind === 'spike') {
    drawSpikeTileMark(ctx, node, center, tile, stateInfo);
  } else if (node.kind === 'door') {
    drawDoorTileMark(ctx, center, tile, stateInfo);
  } else if (node.kind === 'switch') {
    drawSwitchTileMark(ctx, center, tile, stateInfo);
  } else if (node.kind === 'rotating-bridge') {
    drawRotatingBridgeTileMark(ctx, node, center, tile, stateInfo, t);
  } else if (isFloatingTileNode(node)) {
    drawFloatingTileMark(ctx, center, tile, stateInfo, t);
  } else if (node.kind === 'clock-door') {
    drawClockDoorTileMark(ctx, center, tile, stateInfo, t);
  } else if (node.kind === 'start') {
    drawStartTileMark(ctx, center, tile);
  }
}

function drawBridgeTrim(ctx, center, tile, stateInfo) {
  var safe = !stateInfo || stateInfo.safe;
  var top = getIsoTopPoints(center, tile.w, tile.h);

  ctx.save();
  ctx.globalAlpha = safe ? 0.88 : 0.78;
  ctx.strokeStyle = safe ? 'rgba(224,251,249,0.78)' : 'rgba(210,214,220,0.48)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.026);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(top[3].x + tile.w * 0.1, top[3].y - 2);
  ctx.lineTo(top[0].x - tile.w * 0.08, top[0].y - 2);
  ctx.lineTo(top[1].x - tile.w * 0.1, top[1].y - 1);
  ctx.stroke();

  ctx.strokeStyle = safe ? 'rgba(38,104,119,0.42)' : 'rgba(58,67,77,0.36)';
  ctx.lineWidth = Math.max(1.4, tile.w * 0.03);
  ctx.beginPath();
  ctx.moveTo(center.x - tile.w * 0.25, center.y + tile.h * 0.44);
  ctx.quadraticCurveTo(
    center.x,
    center.y + tile.depth * 0.96,
    center.x + tile.w * 0.25,
    center.y + tile.h * 0.44,
  );
  ctx.stroke();

  ctx.fillStyle = safe ? 'rgba(235,255,252,0.84)' : 'rgba(205,212,218,0.48)';
  [
    { x: top[3].x + tile.w * 0.16, y: top[3].y - 3 },
    { x: top[0].x, y: top[0].y - 4 },
    { x: top[1].x - tile.w * 0.16, y: top[1].y - 3 },
  ].forEach(function (post) {
    ctx.beginPath();
    roundRect(ctx, post.x - 1.5, post.y - tile.h * 0.18, 3, tile.h * 0.34, 1.5);
    ctx.fill();
  });
  ctx.restore();
}

function drawCrumbleTileMarks(ctx, center, tile, stateInfo) {
  var integrity = stateInfo && stateInfo.integrity != null ? stateInfo.integrity : 1;
  var damage = 1 - integrity;
  var safe = !stateInfo || stateInfo.safe;
  var cracks = Math.max(1, Math.min(7, 1 + Math.floor(damage * 7)));

  ctx.save();
  ctx.strokeStyle = safe ? 'rgba(128,66,63,0.58)' : 'rgba(54,47,51,0.82)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.026);
  ctx.lineCap = 'round';
  for (var i = 0; i < cracks; i++) {
    var ox = (i - (cracks - 1) / 2) * tile.w * 0.075;
    var oy = (i % 2 ? 1 : -1) * tile.h * 0.13;
    ctx.beginPath();
    ctx.moveTo(center.x + ox - tile.w * 0.04, center.y + oy - tile.h * 0.16);
    ctx.lineTo(center.x + ox + tile.w * 0.02, center.y + oy - tile.h * 0.01);
    ctx.lineTo(center.x + ox - tile.w * 0.01, center.y + oy + tile.h * 0.15);
    ctx.stroke();
  }
  if (!safe) {
    ctx.fillStyle = 'rgba(30,24,31,0.34)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + tile.h * 0.03, tile.w * 0.24, tile.h * 0.18, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpikeTileMark(ctx, node, center, tile, stateInfo) {
  var raised = stateInfo && stateInfo.raised;
  var phase = stateInfo ? stateInfo.phase || 0 : 0;
  var activeFrom = clamp01(Number(node && node.activeFrom) || 0.45);
  var appearAge = phaseDistanceAfter(phase, activeFrom);
  var appearWindow = 0.1;
  var appearRatio = raised ? clamp01(appearAge / appearWindow) : 0;
  var appearPulse = raised ? Math.max(0, 1 - appearRatio) : 0;
  var spikeH = tile.h * (raised ? 0.24 + 0.58 * appearRatio : 0.18);
  var spikeW = tile.w * 0.1;

  ctx.save();
  ctx.translate(center.x, center.y - tile.h * 0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (appearPulse > 0) {
    ctx.strokeStyle = 'rgba(232,70,72,' + (0.7 * appearPulse).toFixed(3) + ')';
    ctx.fillStyle = 'rgba(232,70,72,' + (0.16 * appearPulse).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1.8, tile.w * 0.035);
    ctx.beginPath();
    ctx.ellipse(0, tile.h * 0.1, tile.w * (0.26 + 0.18 * appearPulse), tile.h * (0.18 + 0.08 * appearPulse), 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = raised ? 'rgba(90,45,53,0.88)' : 'rgba(79,96,104,0.54)';
  ctx.fillStyle = raised ? 'rgba(236,231,219,0.96)' : 'rgba(87,108,118,0.38)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.022);

  for (var i = -1; i <= 1; i++) {
    var x = i * tile.w * 0.13;
    if (raised) {
      ctx.beginPath();
      ctx.moveTo(x - spikeW, tile.h * 0.16);
      ctx.lineTo(x, tile.h * 0.16 - spikeH);
      ctx.lineTo(x + spikeW, tile.h * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.64)';
      ctx.beginPath();
      ctx.moveTo(x - spikeW * 0.2, tile.h * 0.08);
      ctx.lineTo(x, tile.h * 0.16 - spikeH * 0.72);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(90,45,53,0.82)';
    } else {
      ctx.beginPath();
      ctx.moveTo(x - spikeW * 1.25, tile.h * 0.08);
      ctx.lineTo(x + spikeW * 1.25, tile.h * 0.08);
      ctx.stroke();
    }
  }

  if (!raised) {
    ctx.strokeStyle = phase > 0.32 && phase < 0.45 ? 'rgba(193,80,75,0.64)' : 'rgba(57,86,96,0.38)';
    ctx.lineWidth = Math.max(1, tile.w * 0.018);
    ctx.beginPath();
    ctx.ellipse(0, tile.h * 0.12, tile.w * 0.26, tile.h * 0.18, 0, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDoorTileMark(ctx, center, tile, stateInfo) {
  var open = stateInfo && stateInfo.open;
  var w = tile.w * 0.46;
  var h = tile.h * 0.86;
  var baseY = tile.h * 0.34;

  ctx.save();
  ctx.translate(center.x, center.y - tile.h * 0.28);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(42,32,38,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, baseY + tile.h * 0.16, w * 0.66, tile.h * 0.2, 0, 0, TAU);
  ctx.fill();

  if (open) {
    ctx.strokeStyle = 'rgba(45,119,103,0.86)';
    ctx.lineWidth = Math.max(2, tile.w * 0.035);
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, baseY);
    ctx.lineTo(-w * 0.48, baseY - h * 0.78);
    ctx.quadraticCurveTo(0, baseY - h * 1.05, w * 0.48, baseY - h * 0.78);
    ctx.lineTo(w * 0.48, baseY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(139,211,186,0.5)';
    ctx.strokeStyle = 'rgba(47,125,103,0.7)';
    ctx.lineWidth = Math.max(1.2, tile.w * 0.022);
    traceDoorPanel(ctx, -w * 0.5, baseY, w * 0.32, h * 0.78, -0.18);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(232,255,244,0.72)';
    ctx.lineWidth = Math.max(1, tile.w * 0.018);
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, baseY - h * 0.48);
    ctx.lineTo(w * 0.22, baseY - h * 0.48);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(132,86,91,0.96)';
    ctx.strokeStyle = 'rgba(82,55,62,0.88)';
    ctx.lineWidth = Math.max(1.6, tile.w * 0.03);
    traceDoorPanel(ctx, -w * 0.46, baseY, w * 0.92, h, 0);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(248,215,187,0.42)';
    ctx.lineWidth = Math.max(1, tile.w * 0.018);
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w * 0.22, baseY - h * 0.76);
      ctx.lineTo(i * w * 0.22, baseY - h * 0.18);
      ctx.stroke();
    }

    drawLockIcon(ctx, 0, baseY - h * 0.46, tile.w * 0.13, false);
  }

  ctx.restore();
}

function traceDoorPanel(ctx, x, y, w, h, lean) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + lean * w, y - h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.5 + lean * w, y - h * 1.08, x + w + lean * w, y - h * 0.7);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

function drawLockIcon(ctx, x, y, size, open) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = open ? 'rgba(60,126,101,0.72)' : 'rgba(95,61,45,0.86)';
  ctx.fillStyle = open ? 'rgba(214,255,226,0.88)' : 'rgba(255,213,107,0.96)';
  ctx.lineWidth = Math.max(1.2, size * 0.16);
  ctx.beginPath();
  if (open) {
    ctx.moveTo(-size * 0.18, -size * 0.1);
    ctx.quadraticCurveTo(-size * 0.52, -size * 0.62, 0, -size * 0.7);
  } else {
    ctx.arc(0, -size * 0.18, size * 0.48, Math.PI, 0);
  }
  ctx.stroke();
  roundRect(ctx, -size * 0.56, -size * 0.18, size * 1.12, size * 0.86, size * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = open ? 'rgba(48,116,91,0.76)' : 'rgba(112,68,38,0.76)';
  ctx.beginPath();
  ctx.arc(0, size * 0.14, size * 0.12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSwitchTileMark(ctx, center, tile, stateInfo) {
  var pressed = stateInfo && stateInfo.pressed;
  var lift = pressed ? tile.h * 0.02 : -tile.h * 0.16;
  var baseW = tile.w * 0.42;
  var baseH = tile.h * 0.24;
  var capW = tile.w * 0.3;
  var capH = tile.h * 0.24;

  ctx.save();
  ctx.translate(center.x, center.y - tile.h * 0.02);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(72,48,36,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, tile.h * 0.22, baseW * 0.62, baseH * 0.48, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = pressed ? 'rgba(137,101,63,0.92)' : 'rgba(156,103,51,0.94)';
  ctx.strokeStyle = 'rgba(92,62,35,0.72)';
  ctx.lineWidth = Math.max(1.4, tile.w * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, tile.h * 0.08, baseW * 0.52, baseH * 0.56, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pressed ? 'rgba(88,184,112,0.96)' : 'rgba(245,183,66,0.98)';
  ctx.strokeStyle = pressed ? 'rgba(39,113,72,0.88)' : 'rgba(140,86,31,0.88)';
  ctx.lineWidth = Math.max(1.8, tile.w * 0.032);
  ctx.beginPath();
  ctx.ellipse(0, lift, capW * 0.5, capH * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  if (!pressed) {
    ctx.fillStyle = 'rgba(126,75,35,0.58)';
    ctx.beginPath();
    ctx.ellipse(0, lift + capH * 0.5, capW * 0.46, capH * 0.22, 0, 0, Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = pressed ? 'rgba(232,255,222,0.58)' : 'rgba(255,244,180,0.7)';
  ctx.beginPath();
  ctx.ellipse(-capW * 0.14, lift - capH * 0.15, capW * 0.17, capH * 0.16, -0.4, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawStairTile(ctx, node, center, tile) {
  var top = getIsoTopPoints(center, tile.w, tile.h);
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + tile.depth };
  });
  var palette = getTilePalette(node, { safe: true });

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if ((Number(node.z) || 0) <= 0) {
    ctx.fillStyle = 'rgba(56,39,72,0.16)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + tile.depth + tile.h * 0.58, tile.w * 0.46, tile.h * 0.28, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = palette.right;
  tracePoly(ctx, [top[1], bottom[1], bottom[2], top[2]]);
  ctx.fill();

  ctx.fillStyle = palette.left;
  tracePoly(ctx, [top[2], bottom[2], bottom[3], top[3]]);
  ctx.fill();

  ctx.fillStyle = palette.top;
  tracePoly(ctx, top);
  ctx.fill();

  drawStairBody(ctx, node, center, tile, palette, top);
  ctx.restore();
}

function drawStairBody(ctx, node, center, tile, palette, top) {
  var edges = getStairEdges(node, top || getIsoTopPoints(center, tile.w, tile.h));
  var stepCount = 4;
  var totalRise = tile.depth;
  var stepRise = totalRise / stepCount;

  function point(run, across, lift) {
    var a = lerpPoint(edges.low[0], edges.high[0], run);
    var b = lerpPoint(edges.low[1], edges.high[1], run);
    var base = lerpPoint(a, b, across);
    return { x: base.x, y: base.y - lift };
  }

  function sideProfile(across) {
    var points = [point(0, across, 0)];
    for (var i = 0; i < stepCount; i++) {
      var front = i / stepCount;
      var back = (i + 1) / stepCount;
      var lift = stepRise * (i + 1);
      points.push(point(front, across, lift));
      points.push(point(back, across, lift));
    }
    points.push(point(1, across, 0));
    return points;
  }

  function faceColor(points) {
    var sumX = 0;
    points.forEach(function (point) {
      sumX += point.x;
    });
    return sumX / Math.max(1, points.length) >= center.x ? palette.right : palette.left;
  }

  var leftSide = sideProfile(0);
  ctx.fillStyle = faceColor(leftSide);
  tracePoly(ctx, leftSide);
  ctx.fill();

  var rightSide = sideProfile(1);
  ctx.fillStyle = faceColor(rightSide);
  tracePoly(ctx, rightSide);
  ctx.fill();

  var highFace = [point(1, 0, 0), point(1, 1, 0), point(1, 1, totalRise), point(1, 0, totalRise)];
  ctx.fillStyle = faceColor(highFace);
  tracePoly(ctx, highFace);
  ctx.fill();

  for (var i = 0; i < stepCount; i++) {
    var front = i / stepCount;
    var back = (i + 1) / stepCount;
    var prevLift = stepRise * i;
    var lift = stepRise * (i + 1);
    var p1 = point(front, 0, lift);
    var p2 = point(front, 1, lift);
    var p3 = point(back, 1, lift);
    var p4 = point(back, 0, lift);
    var r1 = point(front, 0, prevLift);
    var r2 = point(front, 1, prevLift);

    ctx.fillStyle = faceColor([r1, r2, p2, p1]);
    ctx.strokeStyle = 'rgba(102,132,116,0.38)';
    ctx.lineWidth = Math.max(1, tile.w * 0.018);
    tracePoly(ctx, [r1, r2, p2, p1]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.top;
    tracePoly(ctx, [p1, p2, p3, p4]);
    ctx.fill();
    ctx.stroke();
  }

}

function getStairEdges(node, top) {
  var direction = node && (node.stairDirection || node.direction || node.facing);
  if (direction === 'south' || direction === 'down' || direction === '+y') {
    return {
      low: [top[0], top[1]],
      high: [top[3], top[2]],
    };
  } else if (direction === 'east' || direction === 'right' || direction === '+x') {
    return {
      low: [top[3], top[0]],
      high: [top[2], top[1]],
    };
  } else if (direction === 'west' || direction === 'left' || direction === '-x') {
    return {
      low: [top[1], top[2]],
      high: [top[0], top[3]],
    };
  }
  return {
    low: [top[2], top[3]],
    high: [top[1], top[0]],
  };
}

function drawClockDoorTileMark(ctx, center, tile, stateInfo, t) {
  var safe = !stateInfo || stateInfo.safe;
  var phase = stateInfo ? stateInfo.phase : 0;
  var r = Math.max(7, tile.w * 0.13);

  ctx.save();
  ctx.translate(center.x, center.y - tile.h * 0.03);
  ctx.fillStyle = safe ? 'rgba(235,255,255,0.94)' : 'rgba(219,225,230,0.9)';
  ctx.strokeStyle = safe ? 'rgba(49,129,151,0.86)' : 'rgba(86,96,108,0.72)';
  ctx.lineWidth = Math.max(1.4, tile.w * 0.028);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = safe ? 'rgba(31,101,127,0.92)' : 'rgba(76,84,96,0.82)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.022);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(phase * TAU - Math.PI / 2) * r * 0.58, Math.sin(phase * TAU - Math.PI / 2) * r * 0.58);
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(t * 0.7 - Math.PI / 2) * r * 0.38, Math.sin(t * 0.7 - Math.PI / 2) * r * 0.38);
  ctx.stroke();

  if (!safe) {
    ctx.strokeStyle = 'rgba(82,88,102,0.56)';
    ctx.lineWidth = Math.max(1.4, tile.w * 0.025);
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.52, -r * 0.95);
      ctx.lineTo(i * r * 0.52, r * 0.95);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStartTileMark(ctx, center, tile) {
  ctx.save();
  ctx.fillStyle = 'rgba(177,105,119,0.24)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + tile.h * 0.03, tile.w * 0.18, tile.h * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawFloatingTile(ctx, center, tile, stateInfo, floatState, t) {
  var docked = !!(floatState && floatState.docked);
  var palette = getFloatingTilePalette(docked);
  var bob = docked ? 0 : Math.sin(t * 5.2) * tile.h * 0.05;
  var drawCenter = { x: center.x, y: center.y + bob };

  ctx.save();
  ctx.fillStyle = docked ? 'rgba(26, 49, 58, 0.18)' : 'rgba(26, 49, 58, 0.12)';
  ctx.beginPath();
  ctx.ellipse(
    center.x,
    center.y + tile.depth * 0.86,
    tile.w * (docked ? 0.42 : 0.35),
    tile.h * (docked ? 0.24 : 0.18),
    0,
    0,
    TAU
  );
  ctx.fill();
  ctx.restore();

  drawIsoTile(ctx, drawCenter, tile.w * 0.94, tile.h * 0.94, tile.depth * 0.72, palette, {
    skipShadow: true,
  });
  drawFloatingTileMark(ctx, drawCenter, tile, stateInfo, t);

  if (docked) {
    var top = getIsoTopPoints(drawCenter, tile.w * 1.03, tile.h * 1.03);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = Math.max(1.2, tile.w * 0.02);
    tracePoly(ctx, top);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFloatingTileMark(ctx, center, tile, stateInfo, t) {
  var docked = !stateInfo || stateInfo.docked !== false;
  var pulse = docked ? 0.5 + Math.sin(t * 5.8) * 0.5 : 0.35;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = docked ? 'rgba(43, 121, 139, 0.72)' : 'rgba(43, 121, 139, 0.5)';
  ctx.lineWidth = Math.max(1.5, tile.w * 0.032);
  ctx.beginPath();
  ctx.moveTo(center.x - tile.w * 0.16, center.y - tile.h * 0.05);
  ctx.lineTo(center.x + tile.w * 0.16, center.y - tile.h * 0.05);
  ctx.moveTo(center.x - tile.w * 0.10, center.y + tile.h * 0.08);
  ctx.lineTo(center.x + tile.w * 0.10, center.y + tile.h * 0.08);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.46 + pulse * 0.32) + ')';
  ctx.beginPath();
  ctx.ellipse(center.x - tile.w * 0.2, center.y - tile.h * 0.2, tile.w * 0.08, tile.h * 0.045, -0.28, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawRotatingBridgeTileMark(ctx, node, center, tile, stateInfo, t) {
  if (!node.bridgeCenter) return;
  var pulse = 0.5 + Math.sin(t * 4.8) * 0.5;
  var r = tile.w * (0.12 + pulse * 0.012);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(255,246,212,0.96)';
  ctx.strokeStyle = 'rgba(121,85,49,0.88)';
  ctx.lineWidth = Math.max(1.4, tile.w * 0.026);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y - tile.h * 0.08, r, r * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(120,79,39,0.9)';
  ctx.lineWidth = Math.max(1.5, tile.w * 0.026);
  ctx.beginPath();
  ctx.moveTo(center.x, center.y - tile.h * 0.08);
  ctx.lineTo(center.x + r * 0.82, center.y - tile.h * 0.26);
  ctx.stroke();
  ctx.fillStyle = 'rgba(249,188,86,0.98)';
  ctx.strokeStyle = 'rgba(120,79,39,0.86)';
  ctx.lineWidth = Math.max(1.1, tile.w * 0.018);
  ctx.beginPath();
  ctx.ellipse(center.x + r * 0.92, center.y - tile.h * 0.28, r * 0.28, r * 0.2, -0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.beginPath();
  ctx.ellipse(center.x - r * 0.18, center.y - tile.h * 0.2, r * 0.26, r * 0.12, -0.35, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawRotatingBridgeSocketTile(ctx, center, tile, stateInfo) {
  var active = stateInfo && stateInfo.active;
  if (active) {
    drawIsoTile(ctx, center, tile.w, tile.h, tile.depth, getRotatingBridgeSocketPalette(active));
    return;
  }
  drawRotatingBridgeDashedSocket(ctx, center, tile);
}

function drawRotatingBridgeDashedSocket(ctx, center, tile) {
  var top = getIsoTopPoints(center, tile.w, tile.h);
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + tile.depth };
  });

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(211,231,235,0.52)';
  ctx.lineWidth = Math.max(1.1, tile.w * 0.02);
  ctx.setLineDash([tile.w * 0.1, tile.w * 0.07]);
  tracePoly(ctx, top);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(147,178,187,0.32)';
  ctx.lineWidth = Math.max(1, tile.w * 0.016);
  [
    [top[1], bottom[1], bottom[2], top[2]],
    [top[2], bottom[2], bottom[3], top[3]],
  ].forEach(function (face) {
    tracePoly(ctx, face);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRotatingBridgeOverlays(ctx, state, layout, tile) {
  var bridges = state.level.rotatingBridges || [];
  if (!bridges.length) return;
  bridges.forEach(function (bridge) {
    if (!bridge || !bridge.center) return;
    var bridgeState = state.bridgeStates && state.bridgeStates[bridge.id];
    if (!bridgeState || !bridgeState.animating) return;
    drawRotatingBridgeMovingState(ctx, bridge, bridgeState, layout, tile);
  });
}

function drawRotatingBridgeMovingState(ctx, bridge, bridgeState, layout, tile) {
  var ratio = easeInOutCubic(bridgeState.progress);
  var angle = getRotatingBridgeAnimationAngle(
    bridgeState.fromOrientation || bridgeState.orientation,
    bridgeState.toOrientation || bridgeState.orientation,
    ratio,
    tile
  );
  var center = yarnWorldToScreen(bridge.center, layout);
  drawRotatingBridgeRigidCells(
    ctx,
    center,
    tile,
    angle,
    bridge.length || 3,
    bridgeState.toOrientation || bridgeState.orientation
  );
}

function drawRotatingBridgeRigidCells(ctx, center, tile, angle, length, orientation) {
  var count = Math.max(1, Number(length) || 3);
  var arm = Math.floor(count / 2);
  var step = Math.sqrt(tile.w * tile.w + tile.h * tile.h) * 0.5;
  var axis = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  var cells = [];
  for (var i = -arm; i <= arm; i++) {
    cells.push({
      center: {
        x: center.x + axis.x * step * i,
        y: center.y + axis.y * step * i,
      },
      role: i === 0 ? 'hole' : 'pier',
      order: center.y + axis.y * step * i,
    });
  }
  cells.sort(function (a, b) {
    return a.order === b.order ? a.center.x - b.center.x : a.order - b.order;
  });
  cells.forEach(function (cell) {
    drawRotatingBridgeGridCell(ctx, cell.center, tile, cell.role, orientation);
  });
}

function getRotatingBridgeAnimationAngle(fromOrientation, toOrientation, ratio, tile) {
  var fromAngle = getRotatingBridgeOrientationAngle(fromOrientation, tile);
  var toAngle = getRotatingBridgeOrientationAngle(toOrientation, tile);
  return fromAngle + normalizeAngle(toAngle - fromAngle) * ratio;
}

function getRotatingBridgeOrientationAngle(orientation, tile) {
  if (orientation === 'horizontal') {
    return Math.atan2(tile.h * 0.5, tile.w * 0.5);
  }
  return Math.atan2(tile.h * 0.5, -tile.w * 0.5);
}

function normalizeAngle(angle) {
  var result = angle;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
}

function drawRotatingBridgeGridCell(ctx, center, tile, role, orientation) {
  var top = getIsoTopPoints(center, tile.w, tile.h);
  var wallDepth = tile.depth;
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + wallDepth };
  });
  var rightFace = [top[1], bottom[1], bottom[2], top[2]];
  var leftFace = [top[2], bottom[2], bottom[3], top[3]];
  var palette = getRotatingBridgeCellPalette(role);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(56,39,72,0.16)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + wallDepth + tile.h * 0.58, tile.w * 0.46, tile.h * 0.28, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = palette.right;
  tracePoly(ctx, rightFace);
  ctx.fill();
  if (role === 'hole') {
    drawIsoBridgeArch(ctx, rightFace, tile);
  }

  ctx.fillStyle = palette.left;
  tracePoly(ctx, leftFace);
  ctx.fill();
  if (role === 'hole') {
    drawIsoBridgeArch(ctx, leftFace, tile);
  }

  ctx.fillStyle = palette.top;
  tracePoly(ctx, top);
  ctx.fill();

  if (role === 'hole') {
    drawRotatingBridgeCenterButton(ctx, center, tile, orientation);
  }

  ctx.restore();
}

function drawIsoBridgeArch(ctx, face, tile) {
  var leftBase = getFacePoint(face, 0.14, 1);
  var leftShoulder = getFacePoint(face, 0.14, 0.52);
  var peak = getFacePoint(face, 0.5, 0.12);
  var rightShoulder = getFacePoint(face, 0.86, 0.52);
  var rightBase = getFacePoint(face, 0.86, 1);
  var leftInner = getFacePoint(face, 0.24, 0.96);
  var rightInner = getFacePoint(face, 0.76, 0.96);

  ctx.save();
  ctx.fillStyle = 'rgba(4,27,43,0.92)';
  ctx.strokeStyle = 'rgba(220,253,247,0.48)';
  ctx.lineWidth = Math.max(1.4, tile.w * 0.026);
  ctx.beginPath();
  ctx.moveTo(leftBase.x, leftBase.y);
  ctx.lineTo(leftShoulder.x, leftShoulder.y);
  ctx.quadraticCurveTo(
    getFacePoint(face, 0.22, 0.16).x,
    getFacePoint(face, 0.22, 0.16).y,
    peak.x,
    peak.y
  );
  ctx.quadraticCurveTo(
    getFacePoint(face, 0.78, 0.16).x,
    getFacePoint(face, 0.78, 0.16).y,
    rightShoulder.x,
    rightShoulder.y
  );
  ctx.lineTo(rightBase.x, rightBase.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, tile.w * 0.014);
  ctx.beginPath();
  ctx.moveTo(leftInner.x, leftInner.y);
  ctx.quadraticCurveTo(
    getFacePoint(face, 0.34, 0.34).x,
    getFacePoint(face, 0.34, 0.34).y,
    peak.x,
    peak.y + tile.h * 0.08
  );
  ctx.quadraticCurveTo(
    getFacePoint(face, 0.66, 0.34).x,
    getFacePoint(face, 0.66, 0.34).y,
    rightInner.x,
    rightInner.y
  );
  ctx.stroke();
  ctx.restore();
}

function drawRotatingBridgeCenterButton(ctx, center, tile, orientation) {
  var isHorizontal = orientation === 'horizontal';
  var r = tile.w * 0.14;
  var baseX = center.x;
  var baseY = center.y - tile.h * 0.08;
  var lever = isHorizontal
    ? { x: tile.w * 0.12, y: -tile.h * 0.09 }
    : { x: -tile.w * 0.12, y: -tile.h * 0.09 };
  var knob = {
    x: baseX + lever.x,
    y: baseY + lever.y,
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(35,56,78,0.24)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + tile.h * 0.06, r * 1.18, r * 0.54, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = isHorizontal ? 'rgba(128,214,255,0.96)' : 'rgba(255,223,141,0.96)';
  ctx.strokeStyle = isHorizontal ? 'rgba(52,112,148,0.9)' : 'rgba(128,87,44,0.9)';
  ctx.lineWidth = Math.max(1.5, tile.w * 0.028);
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, r, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = isHorizontal ? 'rgba(31,86,122,0.92)' : 'rgba(120,79,39,0.92)';
  ctx.lineWidth = Math.max(1.8, tile.w * 0.03);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(knob.x, knob.y);
  ctx.stroke();

  ctx.fillStyle = isHorizontal ? 'rgba(244,255,255,0.98)' : 'rgba(255,248,225,0.98)';
  ctx.strokeStyle = isHorizontal ? 'rgba(43,99,132,0.86)' : 'rgba(120,79,39,0.86)';
  ctx.lineWidth = Math.max(1.1, tile.w * 0.018);
  ctx.beginPath();
  ctx.ellipse(knob.x, knob.y, r * 0.3, r * 0.22, -0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isHorizontal ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(baseX - r * 0.18, baseY - r * 0.36, r * 0.26, r * 0.12, -0.35, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = isHorizontal ? 'rgba(19,78,116,0.42)' : 'rgba(117,81,44,0.42)';
  ctx.lineWidth = Math.max(1, tile.w * 0.014);
  ctx.beginPath();
  ctx.moveTo(baseX - r * 0.44, baseY + r * 0.26);
  ctx.lineTo(baseX + r * 0.44, baseY + r * 0.26);
  ctx.stroke();
  ctx.restore();
}

function getRotatingBridgeCells(bridge, orientation) {
  var length = Math.max(1, Number(bridge.length) || 3);
  var arm = Math.floor(length / 2);
  var center = bridge.center || { x: 0, y: 0, z: 0 };
  var cells = [];
  for (var i = -arm; i <= arm; i++) {
    cells.push({
      x: (Number(center.x) || 0) + (orientation === 'horizontal' ? i : 0),
      y: (Number(center.y) || 0) + (orientation === 'horizontal' ? 0 : i),
      z: Number(center.z) || 0,
      role: i === 0 ? 'hole' : 'pier',
    });
  }
  return cells;
}

function getNodeRotatingBridgeState(node, state) {
  if (!node || !node.bridgeId || !state || !state.level) return null;
  var bridges = state.level.rotatingBridges || [];
  var bridge = null;
  for (var i = 0; i < bridges.length; i++) {
    if (bridges[i].id === node.bridgeId) {
      bridge = bridges[i];
      break;
    }
  }
  if (!bridge) return null;
  var raw = state.bridgeStates && state.bridgeStates[bridge.id] ? state.bridgeStates[bridge.id] : {};
  return {
    bridge: bridge,
    orientation: raw.orientation || bridge.initialOrientation || bridge.orientation || 'vertical',
    fromOrientation: raw.fromOrientation || raw.orientation || bridge.initialOrientation || bridge.orientation || 'vertical',
    toOrientation: raw.toOrientation || raw.orientation || bridge.initialOrientation || bridge.orientation || 'vertical',
    progress: raw.progress == null ? 1 : raw.progress,
    animating: !!raw.animating,
  };
}

function getRotatingBridgeNodeRole(node, bridgeState) {
  if (!node || !bridgeState || !bridgeState.bridge) return '';
  var cells = getRotatingBridgeCells(bridgeState.bridge, bridgeState.orientation);
  for (var i = 0; i < cells.length; i++) {
    if (isSameGridCell(node, cells[i])) {
      return cells[i].role;
    }
  }
  return '';
}

function drawLiftingBridgeSocketTile(ctx, center, tile, stateInfo) {
  var active = stateInfo && stateInfo.active;
  if (active) {
    drawIsoTile(ctx, center, tile.w, tile.h, tile.depth, getLiftingBridgeCellPalette('pier'));
    return;
  }
  drawLiftingBridgeDashedSocket(ctx, center, tile);
}

function drawLiftingBridgeDashedSocket(ctx, center, tile) {
  var top = getIsoTopPoints(center, tile.w, tile.h);
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + tile.depth };
  });

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(249,209,127,0.54)';
  ctx.lineWidth = Math.max(1.2, tile.w * 0.022);
  ctx.setLineDash([tile.w * 0.08, tile.w * 0.06]);
  tracePoly(ctx, top);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(186,142,83,0.28)';
  ctx.lineWidth = Math.max(1, tile.w * 0.016);
  [
    [top[1], bottom[1], bottom[2], top[2]],
    [top[2], bottom[2], bottom[3], top[3]],
  ].forEach(function (face) {
    tracePoly(ctx, face);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
}

function drawLiftingBridgeOverlays(ctx, state, layout, tile) {
  var bridges = state.level.liftingBridges || [];
  if (!bridges.length) return;
  bridges.forEach(function (bridge) {
    if (!bridge || !bridge.center) return;
    var liftState = state.liftBridgeStates && state.liftBridgeStates[bridge.id];
    if (!liftState || (!liftState.animating && !liftState.dragging)) return;
    drawLiftingBridgeMovingState(ctx, bridge, liftState, layout, tile);
  });
}

function drawLiftingBridgeMovingState(ctx, bridge, liftState, layout, tile) {
  var cells = getLiftingBridgeCells(bridge, liftState.displayZ);
  var renderCells = cells.map(function (cell) {
    return {
      role: cell.role,
      center: yarnWorldToScreen(cell, layout),
      order: cell.x + cell.y + (Number(cell.z) || 0) * 2,
    };
  });
  renderCells.sort(function (a, b) {
    return a.order === b.order ? a.center.x - b.center.x : a.order - b.order;
  });
  renderCells.forEach(function (cell) {
    drawLiftingBridgeGridCell(ctx, cell.center, tile, cell.role, liftState);
  });
}

function drawLiftingBridgeGridCell(ctx, center, tile, role, liftState) {
  var top = getIsoTopPoints(center, tile.w, tile.h);
  var wallDepth = tile.depth;
  var bottom = top.map(function (point) {
    return { x: point.x, y: point.y + wallDepth };
  });
  var rightFace = [top[1], bottom[1], bottom[2], top[2]];
  var leftFace = [top[2], bottom[2], bottom[3], top[3]];
  var palette = getLiftingBridgeCellPalette(role);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  var lowerZ = liftState && liftState.lowerZ != null ? Number(liftState.lowerZ) : 0;
  var displayZ = liftState && liftState.displayZ != null ? Number(liftState.displayZ) : lowerZ;
  if (displayZ <= lowerZ + 0.001) {
    ctx.fillStyle = 'rgba(56,39,72,0.16)';
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + wallDepth + tile.h * 0.58, tile.w * 0.46, tile.h * 0.28, 0, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = palette.right;
  tracePoly(ctx, rightFace);
  ctx.fill();
  if (role === 'hole') {
    drawIsoBridgeArch(ctx, rightFace, tile);
  }

  ctx.fillStyle = palette.left;
  tracePoly(ctx, leftFace);
  ctx.fill();
  if (role === 'hole') {
    drawIsoBridgeArch(ctx, leftFace, tile);
  }

  ctx.fillStyle = palette.top;
  tracePoly(ctx, top);
  ctx.fill();

  if (role === 'hole') {
    drawLiftingBridgeLever(ctx, center, tile, liftState);
  }

  ctx.restore();
}

function drawLiftingBridgeLever(ctx, center, tile, liftState) {
  var lowerZ = liftState && liftState.lowerZ != null ? Number(liftState.lowerZ) : 0;
  var upperZ = liftState && liftState.upperZ != null ? Number(liftState.upperZ) : lowerZ + 2;
  var displayZ = liftState && liftState.displayZ != null ? Number(liftState.displayZ) : lowerZ;
  var ratio = upperZ === lowerZ ? 0 : clamp01((displayZ - lowerZ) / (upperZ - lowerZ));
  var slotH = tile.h * 1.1;
  var baseY = center.y - tile.h * 0.02;
  var knobY = baseY + slotH * 0.24 - slotH * 0.72 * ratio;
  var r = tile.w * 0.12;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(49,42,51,0.22)';
  ctx.beginPath();
  ctx.ellipse(center.x, baseY + tile.h * 0.2, tile.w * 0.18, tile.h * 0.12, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(102,72,38,0.82)';
  ctx.lineWidth = Math.max(2, tile.w * 0.035);
  ctx.beginPath();
  ctx.moveTo(center.x, baseY + slotH * 0.28);
  ctx.lineTo(center.x, baseY - slotH * 0.52);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,247,210,0.62)';
  ctx.lineWidth = Math.max(1, tile.w * 0.014);
  ctx.beginPath();
  ctx.moveTo(center.x + tile.w * 0.04, baseY + slotH * 0.2);
  ctx.lineTo(center.x + tile.w * 0.04, baseY - slotH * 0.44);
  ctx.stroke();

  ctx.fillStyle = ratio > 0.5 ? 'rgba(110,214,146,0.96)' : 'rgba(255,207,98,0.98)';
  ctx.strokeStyle = ratio > 0.5 ? 'rgba(42,116,78,0.88)' : 'rgba(128,82,35,0.88)';
  ctx.lineWidth = Math.max(1.6, tile.w * 0.028);
  ctx.beginPath();
  ctx.ellipse(center.x, knobY, r, r * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(center.x - r * 0.22, knobY - r * 0.22, r * 0.24, r * 0.12, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function getLiftingBridgeCells(bridge, liftZ) {
  var length = Math.max(1, Number(bridge.length) || 3);
  var arm = Math.floor(length / 2);
  var center = bridge.center || { x: 0, y: 0, z: 0 };
  var orientation = bridge.orientation === 'vertical' ? 'vertical' : 'horizontal';
  var cells = [];
  for (var i = -arm; i <= arm; i++) {
    cells.push({
      x: (Number(center.x) || 0) + (orientation === 'horizontal' ? i : 0),
      y: (Number(center.y) || 0) + (orientation === 'horizontal' ? 0 : i),
      z: Number(liftZ) || 0,
      role: i === 0 ? 'hole' : 'pier',
    });
  }
  return cells;
}

function getNodeLiftingBridgeState(node, state) {
  if (!node || !node.liftBridgeId || !state || !state.level) return null;
  var bridges = state.level.liftingBridges || [];
  var bridge = null;
  for (var i = 0; i < bridges.length; i++) {
    if (bridges[i].id === node.liftBridgeId) {
      bridge = bridges[i];
      break;
    }
  }
  if (!bridge) return null;
  var raw = state.liftBridgeStates && state.liftBridgeStates[bridge.id] ? state.liftBridgeStates[bridge.id] : {};
  var lowerZ = raw.lowerZ != null ? raw.lowerZ : bridge.lowerZ != null ? Number(bridge.lowerZ) : Number(bridge.center && bridge.center.z) || 0;
  var upperZ = raw.upperZ != null ? raw.upperZ : bridge.upperZ != null ? Number(bridge.upperZ) : lowerZ + 2;
  return {
    bridge: bridge,
    z: raw.z != null ? raw.z : lowerZ,
    displayZ: raw.displayZ != null ? raw.displayZ : raw.z != null ? raw.z : lowerZ,
    lowerZ: lowerZ,
    upperZ: upperZ,
    progress: raw.progress == null ? 1 : raw.progress,
    animating: !!raw.animating,
    dragging: !!raw.dragging,
  };
}

function getLiftingBridgeNodeRole(node, liftState) {
  if (!node || !liftState || !liftState.bridge) return '';
  var cells = getLiftingBridgeCells(liftState.bridge, liftState.z);
  for (var i = 0; i < cells.length; i++) {
    if (isSameGridCell(node, cells[i])) {
      return cells[i].role;
    }
  }
  return '';
}

function isSameGridCell(a, b) {
  return (
    Math.abs((Number(a.x) || 0) - (Number(b.x) || 0)) < 0.001 &&
    Math.abs((Number(a.y) || 0) - (Number(b.y) || 0)) < 0.001 &&
    Math.abs((Number(a.z) || 0) - (Number(b.z) || 0)) < 0.001
  );
}

function getFacePoint(face, u, v) {
  var top = lerpPoint(face[0], face[3], u);
  var bottom = lerpPoint(face[1], face[2], u);
  return lerpPoint(top, bottom, v);
}

function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function normalizePoint(point) {
  var length = Math.sqrt(point.x * point.x + point.y * point.y);
  if (!length) return { x: 0, y: 0 };
  return {
    x: point.x / length,
    y: point.y / length,
  };
}

function getIsoTopPoints(center, width, height) {
  return [
    { x: center.x, y: center.y - height / 2 },
    { x: center.x + width / 2, y: center.y },
    { x: center.x, y: center.y + height / 2 },
    { x: center.x - width / 2, y: center.y },
  ];
}

function getIsoTileMetrics(layout) {
  if (layout.grid && layout.grid.enabled) {
    return {
      w: layout.grid.tileW,
      h: layout.grid.tileH,
      depth: layout.grid.tileDepth,
    };
  }
  var width = Math.max(34, Math.min(52, layout.w * 0.13));
  return {
    w: width,
    h: width * 0.52,
    depth: width * 0.35,
  };
}

function getNodeTileHeight(node, tile) {
  var h = node.tile ? Number(node.tile.h) || 0 : 0;
  return tile.h * (0.48 + h * 0.38);
}

function getRotatingBridgeCellPalette(role) {
  if (role === 'hole') {
    return {
      top: '#dcefff',
      left: '#8ab6d1',
      right: '#74a2c1',
      stroke: '#526f8a',
      highlight: 'rgba(245,252,255,0.86)',
    };
  }
  return {
    top: '#e5f4ff',
    left: '#9ac3d8',
    right: '#82aecb',
    stroke: '#5a7892',
    highlight: 'rgba(248,253,255,0.86)',
  };
}

function getRotatingBridgeSocketPalette(active) {
  if (active) {
    return getRotatingBridgeCellPalette('pier');
  }
  return {
    top: 'rgba(218,232,238,0.28)',
    left: 'rgba(117,142,154,0.18)',
    right: 'rgba(104,130,145,0.18)',
    stroke: 'rgba(137,166,180,0.48)',
    highlight: 'rgba(242,250,255,0.34)',
  };
}

function getLiftingBridgeCellPalette(role) {
  if (role === 'hole') {
    return {
      top: '#ffe0a3',
      left: '#c89259',
      right: '#b57d4e',
      stroke: '#845832',
      highlight: 'rgba(255,249,219,0.86)',
    };
  }
  return {
    top: '#fff0bd',
    left: '#d8aa68',
    right: '#c39157',
    stroke: '#916239',
    highlight: 'rgba(255,251,230,0.86)',
  };
}

function getSupportBlockPalette() {
  return getGrassTilePalette();
}

function getGrassTilePalette() {
  return {
    top: '#edf4e8',
    left: '#9fbea5',
    right: '#86a99a',
    stroke: '#668474',
    highlight: 'rgba(252,255,247,0.84)',
  };
}

function getTilePalette(node, stateInfo) {
  var safe = !stateInfo || stateInfo.safe;
  if (isFloatingTileNode(node)) {
    return getFloatingTilePalette(!!(stateInfo && stateInfo.docked));
  }
  if (node.kind === 'rotating-bridge') {
    return safe ? getRotatingBridgeCellPalette('pier') : getRotatingBridgeSocketPalette(false);
  }
  if (node.kind === 'lifting-bridge') {
    return safe ? getLiftingBridgeCellPalette('pier') : getRotatingBridgeSocketPalette(false);
  }
  if (node.kind === 'stair') {
    return getGrassTilePalette();
  }
  if (node.kind === 'goal') {
    return {
      top: '#ffe3a1',
      left: '#dca760',
      right: '#c79052',
      stroke: '#9f6932',
      highlight: 'rgba(255,250,219,0.85)',
    };
  }
  if (node.kind === 'start') {
    return {
      top: '#fff0d7',
      left: '#d9a7a8',
      right: '#c98f9b',
      stroke: '#9f6870',
      highlight: 'rgba(255,252,238,0.9)',
    };
  }
  if (node.kind === 'crumble') {
    var integrity = stateInfo && stateInfo.integrity != null ? stateInfo.integrity : 1;
    if (!safe) {
      return {
        top: '#787b82',
        left: '#545d68',
        right: '#48535f',
        stroke: '#364350',
        highlight: 'rgba(239,240,239,0.58)',
      };
    }
    return {
      top: integrity > 0.76 ? '#ffe5d5' : '#ffd4c2',
      left: '#d69b8b',
      right: '#bd857d',
      stroke: '#8f5f5b',
      highlight: 'rgba(255,249,241,0.78)',
    };
  }
  if (node.kind === 'spike') {
    return {
      top: '#d7e9e5',
      left: '#8eb5b1',
      right: '#789d9f',
      stroke: '#5f7f85',
      highlight: 'rgba(248,255,250,0.76)',
    };
  }
  if (node.kind === 'door') {
    if (!safe) {
      return {
        top: '#c9b4b8',
        left: '#8b6f78',
        right: '#755e69',
        stroke: '#604c57',
        highlight: 'rgba(237,224,225,0.46)',
      };
    }
    return {
      top: '#d9f5e8',
      left: '#91c8aa',
      right: '#75ae96',
      stroke: '#5b8876',
      highlight: 'rgba(251,255,249,0.86)',
    };
  }
  if (node.kind === 'switch') {
    return {
      top: stateInfo && stateInfo.pressed ? '#d9f3cf' : '#ffe2aa',
      left: stateInfo && stateInfo.pressed ? '#8fc17d' : '#d7a25c',
      right: stateInfo && stateInfo.pressed ? '#76a96e' : '#bd8c4e',
      stroke: stateInfo && stateInfo.pressed ? '#5f8955' : '#906537',
      highlight: 'rgba(255,252,225,0.84)',
    };
  }
  if (node.kind === 'clock-door') {
    if (!safe) {
      return {
        top: '#d0d8df',
        left: '#8392a1',
        right: '#748392',
        stroke: '#5d6977',
        highlight: 'rgba(239,244,247,0.52)',
      };
    }
    return {
      top: '#d9fbff',
      left: '#96cbd2',
      right: '#7fb8c4',
      stroke: '#5d8e9a',
      highlight: 'rgba(252,255,255,0.9)',
    };
  }
  if (node.bridge) {
    return {
      top: '#e6f8f1',
      left: '#8cc8bf',
      right: '#74b4b1',
      stroke: '#5c8d8e',
      highlight: 'rgba(252,255,251,0.82)',
    };
  }
  return getGrassTilePalette();
}

function getFloatingTilePalette(docked) {
  if (docked) {
    return {
      top: '#d7fbf5',
      left: '#78c7c5',
      right: '#5db2bd',
      stroke: '#43899b',
      highlight: 'rgba(255,255,255,0.9)',
    };
  }
  return {
    top: '#bdebe9',
    left: '#63b8bf',
    right: '#489aaa',
    stroke: '#3b788b',
    highlight: 'rgba(250,255,255,0.82)',
  };
}

function getBridgePalette(edge, safe) {
  if (!safe) {
    return {
      top: 'rgba(158,133,136,0.7)',
      left: 'rgba(111,90,97,0.72)',
      right: 'rgba(97,81,91,0.72)',
      stroke: 'rgba(86,65,72,0.66)',
      highlight: 'rgba(238,222,220,0.54)',
    };
  }
  if (edge.kind === 'clock-door') {
    return {
      top: '#d7f3f8',
      left: '#91c1ce',
      right: '#7cacbc',
      stroke: '#5b8794',
      highlight: 'rgba(251,255,255,0.9)',
    };
  }
  if (edge.kind === 'crumble') {
    return {
      top: '#ffd6c9',
      left: '#d59686',
      right: '#be8177',
      stroke: '#955c57',
      highlight: 'rgba(255,248,241,0.76)',
    };
  }
  return {
    top: '#f5e9d6',
    left: '#cfaa81',
    right: '#b99570',
    stroke: '#8e6b4a',
    highlight: 'rgba(255,249,235,0.78)',
  };
}

function tracePoly(ctx, points) {
  ctx.beginPath();
  points.forEach(function (point, index) {
    if (!index) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

function drawEdges(ctx, state, layout) {
  var edges = state.level.edges || [];
  var isIso = state.level.roomStyle === 'isometric-grid' || state.level.roomStyle === 'isometric-tiles';
  edges.forEach(function (edge) {
    var stateInfo = state.edgeStates && state.edgeStates[edge.id];
    var safe = !stateInfo || stateInfo.safe;
    var from = state.nodeMap[edge.from];
    var to = state.nodeMap[edge.to];
    if (!from || !to) return;
    var p0 = yarnWorldToScreen(from, layout);
    var p1 = yarnWorldToScreen(to, layout);
    var c = edge.curve && edge.curve.length
      ? yarnWorldToScreen(edge.curve[0], layout)
      : { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getEdgeBaseColor(edge, safe, stateInfo);
    ctx.lineWidth = isIso ? (edge.kind === 'clock-door' ? 5 : 6) : (edge.kind === 'clock-door' ? 12 : 14);
    ctx.globalAlpha = safe ? 0.94 : 0.42;
    if (!safe) ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = safe ? 'rgba(255,246,250,0.72)' : 'rgba(92,64,66,0.34)';
    ctx.lineWidth = isIso ? 1.6 : 3;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
    ctx.stroke();

    if (edge.kind === 'crumble') {
      drawCrumbleMarks(ctx, p0, c, p1, safe, stateInfo);
    } else if (edge.kind === 'clock-door') {
      drawClockDoorMark(ctx, c, safe, stateInfo);
    }
    ctx.restore();
  });
}

function getEdgeBaseColor(edge, safe, stateInfo) {
  if (edge.kind === 'crumble') {
    if (!safe) return 'rgba(118,86,82,0.72)';
    return stateInfo && stateInfo.phase > 0.38
      ? 'rgba(224,135,112,0.88)'
      : 'rgba(219,102,142,0.9)';
  }
  if (edge.kind === 'clock-door') {
    return safe ? 'rgba(102,176,208,0.88)' : 'rgba(117,128,144,0.72)';
  }
  return 'rgba(218,95,139,0.88)';
}

function drawCrumbleMarks(ctx, p0, c, p1, safe, stateInfo) {
  var phase = stateInfo ? stateInfo.phase : 0;
  var cracks = safe ? Math.floor(phase * 4) : 5;
  ctx.save();
  ctx.strokeStyle = safe ? 'rgba(116,63,60,0.54)' : 'rgba(67,47,48,0.72)';
  ctx.lineWidth = 2;
  for (var i = 0; i < cracks; i++) {
    var t = 0.2 + i * 0.14;
    var p = quadraticPoint(p0, c, p1, t);
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y - 5);
    ctx.lineTo(p.x + 3, p.y + 3);
    ctx.lineTo(p.x - 2, p.y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawClockDoorMark(ctx, center, safe, stateInfo) {
  var phase = stateInfo ? stateInfo.phase : 0;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.fillStyle = safe ? 'rgba(224,250,255,0.9)' : 'rgba(218,224,232,0.82)';
  ctx.strokeStyle = safe ? 'rgba(39,104,126,0.82)' : 'rgba(82,91,104,0.76)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = safe ? 'rgba(39,104,126,0.9)' : 'rgba(82,91,104,0.82)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(phase * TAU - Math.PI / 2) * 8, Math.sin(phase * TAU - Math.PI / 2) * 8);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -6);
  ctx.stroke();
  ctx.restore();
}

function drawGoalNest(ctx, state, layout, t) {
  var goalNode = state.nodeMap[state.level.goal && state.level.goal.nodeId];
  if (!goalNode) return;
  var center = yarnWorldToScreen(goalNode, layout);
  var tile = getIsoTileMetrics(layout);
  var isGrid = layout.grid && layout.grid.enabled;
  var pole = isGrid ? Math.max(12, tile.w * 0.24) : 44;
  var flagW = isGrid ? Math.max(11, tile.w * 0.22) : 28;
  var flagH = flagW * 0.58;
  var baseX = isGrid ? 0 : -flagW * 0.2;
  var baseY = isGrid ? tile.h * 0.22 : tile.h * 0.38;

  ctx.save();
  ctx.translate(center.x, center.y - (isGrid ? tile.h * 0.06 : tile.h * 0.18));
  ctx.strokeStyle = 'rgba(103,65,49,0.86)';
  ctx.lineWidth = isGrid ? Math.max(1.6, tile.w * 0.028) : Math.max(2, tile.w * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(baseX, -pole);
  ctx.stroke();
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#e64b52';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = isGrid ? Math.max(1.8, tile.w * 0.032) : Math.max(2.4, tile.w * 0.04);
  ctx.beginPath();
  ctx.moveTo(baseX + flagW * 0.04, -pole);
  ctx.lineTo(baseX + flagW * 0.92, -pole + flagH * 0.12);
  ctx.lineTo(baseX + flagW * 0.62, -pole + flagH * 0.46);
  ctx.lineTo(baseX + flagW * 0.92, -pole + flagH * 0.82);
  ctx.lineTo(baseX + flagW * 0.04, -pole + flagH * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(142,52,57,0.78)';
  ctx.lineWidth = Math.max(1, tile.w * 0.018);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,236,214,0.42)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + tile.h * 0.04, flagW * 0.28, tile.h * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawNodes(ctx, state, layout) {
  (state.level.nodes || []).forEach(function (node) {
    var center = yarnWorldToScreen(node, layout);
    ctx.save();
    ctx.fillStyle = node.kind === 'goal' ? 'rgba(255,211,114,0.72)' : 'rgba(255,247,236,0.72)';
    ctx.strokeStyle = 'rgba(127,89,61,0.42)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 5, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawDropPreview(ctx, state, layout) {
  if (!state.yarn || !state.yarn.isHeld) return;
  var tile = getIsoTileMetrics(layout);
  var isGrid = layout.grid && layout.grid.enabled;
  var validNode = state.yarn.validDropNodeId ? state.nodeMap[state.yarn.validDropNodeId] : null;
  if (validNode) {
    var center = yarnWorldToScreen(validNode, layout);
    if (isGrid) drawIsoDropPreview(ctx, center, tile, true);
    else drawYarnPickupPreview(ctx, { center: center, radius: 18 }, true);
  } else {
    var heldCenter = yarnWorldToScreen(state.yarn.pos, layout);
    drawYarnPickupPreview(ctx, { center: heldCenter, radius: isGrid ? Math.max(12, tile.w * 0.2) : 18 }, false);
  }
}

function drawIsoDropPreview(ctx, center, tile, isValidDrop) {
  var top = getIsoTopPoints(center, tile.w * 1.06, tile.h * 1.06);
  ctx.save();
  ctx.strokeStyle = isValidDrop ? 'rgba(94,202,143,0.9)' : 'rgba(218,84,94,0.82)';
  ctx.fillStyle = isValidDrop ? 'rgba(94,202,143,0.14)' : 'rgba(218,84,94,0.12)';
  ctx.lineWidth = Math.max(2, tile.w * 0.035);
  ctx.setLineDash([tile.w * 0.11, tile.w * 0.07]);
  tracePoly(ctx, top);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCharacters(ctx, state, layout, t, options) {
  var catBaseCenter = yarnWorldToScreen(state.cat.pos, layout);
  var catCenter = { x: catBaseCenter.x, y: catBaseCenter.y };
  var tile = getIsoTileMetrics(layout);
  var isGrid = layout.grid && layout.grid.enabled;
  var catSize = isGrid
    ? Math.max(16, Math.min(23, tile.w * 0.36))
    : Math.max(34, Math.min(layout.w, layout.h) * 0.13);
  if (isGrid) {
    catCenter.y -= tile.h * 0.62 + tile.depth * 0.1;
    drawFloatingCatShadow(ctx, catBaseCenter, tile, catSize, state.cat.mode, t);
  }
  var yarnCenter = yarnWorldToScreen(state.yarn.pos, layout);
  var yarnRadius = catSize * 0.18;

  if (state.cat.mode === 'playing' && !state.yarn.isHeld) {
    var roll = Math.sin(t * TAU / 1.2) * 5;
    var playYarnCenter = {
      x: catCenter.x + catSize * 0.42 + roll,
      y: catCenter.y + catSize * 0.42 + Math.cos(t * TAU / 1.2) * 1.8,
    };
    drawYarnPlayCat(ctx, catCenter, catSize, playYarnCenter, {
      accessoryId: options.accessoryId,
      expressionId: options.expressionId || 'joy',
      time: t,
    });
    return;
  }

  drawYarnBall(ctx, yarnCenter, yarnRadius, t, state.yarn.isHeld ? 'held' : 'target');
  drawCatAvatarAt(ctx, catCenter, catSize, {
    accessoryId: options.accessoryId,
    expressionId: options.expressionId,
    lookAt: yarnCenter,
    mode: state.cat.mode,
    time: t,
  });
}

function drawFloatingCatShadow(ctx, center, tile, size, mode, t) {
  var pulse = mode === 'chasing'
    ? Math.sin(t * 8) * 0.05
    : Math.sin(t * 3.2) * 0.03;
  ctx.save();
  ctx.fillStyle = 'rgba(27, 28, 34, 0.24)';
  ctx.beginPath();
  ctx.ellipse(
    center.x,
    center.y,
    size * (0.46 + pulse),
    Math.max(2.4, size * 0.13),
    0,
    0,
    TAU
  );
  ctx.fill();
  ctx.restore();
}

function drawCatAvatarAt(ctx, center, size, options) {
  var t = options.time || Date.now() / 1000;
  var bob = options.mode === 'chasing' ? Math.sin(t * 8) * size * 0.026 : Math.sin(t * 3.4) * size * 0.012;
  ctx.save();
  ctx.translate(center.x, center.y + bob);
  renderCubAvatar(ctx, size, {
    accessoryId: options.accessoryId,
    expressionId: options.expressionId || (options.mode === 'waiting' ? 'surprised' : ''),
    isHovered: options.mode === 'watching' || options.mode === 'chasing',
    lookOffset: getLookOffset(center, options.lookAt),
    time: t,
  });
  ctx.restore();
}

function drawClockControl(ctx, state, canvasSize) {
  var control = getClockControl(canvasSize);
  var time = state.time || {};
  var active = time.mode || 'play';
  var energy = time.energy || 0;
  var maxEnergy = time.maxEnergy || 2;
  var handPhase = time.handPhase || 0;
  var actions = state.level && state.level.clock && Array.isArray(state.level.clock.actions)
    ? state.level.clock.actions
    : ['rewind', 'pause'];
  if (!actions.length) return;
  var canRewind = actions.indexOf('rewind') !== -1;
  var canPause = actions.indexOf('pause') !== -1;
  var ratio = time.skillRemaining && time.skillDuration
    ? Math.max(0, Math.min(1, time.skillRemaining / time.skillDuration))
    : 0;

  ctx.save();
  drawPocketWatch(ctx, control.main, {
    phase: handPhase,
    active: active !== 'play',
    energy: energy,
    maxEnergy: maxEnergy,
  });
  drawPocketButton(ctx, control.rewind, {
    icon: 'rewind',
    active: active === 'rewind',
    enabled: canRewind && energy > 0 && active === 'play',
    ratio: active === 'rewind' ? ratio : 0,
  });
  drawPocketButton(ctx, control.pause, {
    icon: 'pause',
    active: active === 'pause',
    enabled: canPause && energy > 0 && active === 'play',
    ratio: active === 'pause' ? ratio : 0,
  });
  ctx.restore();
}

function drawStatusHints(ctx, state, canvasSize) {
  var width = canvasSize && canvasSize.width ? canvasSize.width : 375;
  var height = canvasSize && canvasSize.height ? canvasSize.height : 600;
  var text = '';
  if (state.time && state.time.mode === 'pause') {
    text = state.time.pauseDropUsed ? '\u65f6\u95f4\u6682\u505c\u4e2d\uff1a\u5df2\u653e\u7f6e\u8fc7\u6bdb\u7ebf\u7403' : '\u65f6\u95f4\u6682\u505c\u4e2d\uff1a\u53ef\u653e\u7f6e\u4e00\u6b21\u6bdb\u7ebf\u7403';
  } else if (state.time && state.time.mode === 'rewind') {
    text = '\u5012\u9000\u4e2d\uff1a\u88c2\u7eb9\u683c\u6b63\u5728\u6062\u590d';
  } else if (state.cat && state.cat.mode === 'waiting') {
    text = '\u628a\u6bdb\u7ebf\u7403\u653e\u5230\u5c0f\u732b\u770b\u5f97\u5230\u7684\u5b89\u5168\u70b9';
  }
  if (!text) return;

  ctx.save();
  ctx.fillStyle = 'rgba(72,52,42,0.76)';
  ctx.strokeStyle = 'rgba(255,244,226,0.8)';
  ctx.lineWidth = 1.5;
  var w = Math.min(width - 32, 290);
  var x = (width - w) / 2;
  var y = height - 124;
  roundRect(ctx, x, y, w, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3df';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, y + 12);
  ctx.restore();
}

function drawCompletionGlow(ctx, state, layout, t) {
  var goalNode = state.nodeMap[state.level.goal && state.level.goal.nodeId];
  if (!goalNode) return;
  var center = yarnWorldToScreen(goalNode, layout);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,226,125,0.56)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 36 + Math.sin(t * 5) * 4, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function getClockControl(canvasSize) {
  var width = canvasSize && canvasSize.width ? canvasSize.width : 375;
  var height = canvasSize && canvasSize.height ? canvasSize.height : 600;
  var x = width / 2;
  var y = height - 70;
  return {
    main: { x: x, y: y, r: 34 },
    rewind: { x: x - 82, y: y + 4, r: 25 },
    pause: { x: x + 82, y: y + 4, r: 25 },
  };
}

function drawPocketWatch(ctx, control, options) {
  var phase = options.phase || 0;
  var r = control.r;

  ctx.save();
  ctx.translate(control.x, control.y);
  ctx.fillStyle = 'rgba(255,245,226,0.96)';
  ctx.strokeStyle = options.active ? 'rgba(116,92,195,0.9)' : 'rgba(111,78,51,0.72)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,245,226,0.95)';
  ctx.strokeStyle = 'rgba(111,78,51,0.62)';
  ctx.lineWidth = 2;
  roundRect(ctx, -8, -r - 10, 16, 10, 5);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(111,78,51,0.26)';
  ctx.lineWidth = 1.4;
  for (var i = 0; i < 12; i++) {
    var a = i / 12 * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8));
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }

  var angle = phase * TAU - Math.PI / 2;
  ctx.strokeStyle = '#c64b52';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (r - 10), Math.sin(angle) * (r - 10));
  ctx.stroke();

  ctx.fillStyle = 'rgba(91,68,52,0.82)';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, TAU);
  ctx.fill();

  var maxEnergy = Math.max(0, options.maxEnergy == null ? 2 : options.maxEnergy);
  for (var dot = 0; dot < maxEnergy; dot++) {
    ctx.fillStyle = dot < options.energy ? '#f0a84f' : 'rgba(111,78,51,0.23)';
    ctx.beginPath();
    ctx.arc((dot - (maxEnergy - 1) / 2) * 12, r + 11, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPocketButton(ctx, control, options) {
  var r = control.r;
  var enabled = options.enabled || options.active;
  var pressed = !!options.active;
  var accent = options.icon === 'rewind'
    ? 'rgba(107,86,210,0.95)'
    : 'rgba(55,146,172,0.95)';
  var iconColor = options.icon === 'rewind'
    ? 'rgba(68,56,126,0.95)'
    : 'rgba(37,102,121,0.95)';

  ctx.save();
  ctx.translate(control.x, control.y + (pressed ? 2 : 0));
  ctx.globalAlpha = enabled ? 1 : 0.48;

  ctx.fillStyle = pressed ? 'rgba(72,55,68,0.2)' : 'rgba(72,55,68,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8 + (pressed ? 1 : 4), r * 0.92, r * 0.22, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = pressed ? 'rgba(196,172,141,0.96)' : 'rgba(164,116,75,0.92)';
  ctx.strokeStyle = 'rgba(82,58,43,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, pressed ? 2 : 4, r + 3, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pressed ? 'rgba(236,224,205,0.98)' : 'rgba(255,246,224,0.98)';
  ctx.strokeStyle = pressed ? accent : 'rgba(111,78,51,0.78)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = pressed ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.48)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.28, r * 0.38, r * 0.18, -0.45, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(122,86,58,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 6, 0, TAU);
  ctx.stroke();

  if (options.ratio > 0) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * options.ratio);
    ctx.stroke();
  }

  if (options.icon === 'rewind') {
    var arrowOffset = 5;
    ctx.strokeStyle = iconColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(3 + arrowOffset, -9);
    ctx.lineTo(-8 + arrowOffset, 0);
    ctx.lineTo(3 + arrowOffset, 9);
    ctx.moveTo(-8 + arrowOffset, -9);
    ctx.lineTo(-19 + arrowOffset, 0);
    ctx.lineTo(-8 + arrowOffset, 9);
    ctx.stroke();
  } else {
    ctx.fillStyle = iconColor;
    roundRect(ctx, -7, -10, 5, 20, 2);
    ctx.fill();
    roundRect(ctx, 4, -10, 5, 20, 2);
    ctx.fill();
  }
  ctx.restore();
}

function isPointInCircle(point, circle) {
  if (!point || !circle) return false;
  var dx = point.x - circle.x;
  var dy = point.y - circle.y;
  return Math.sqrt(dx * dx + dy * dy) <= circle.r;
}

function drawPlayPaw(ctx, center, size, rotate) {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(rotate);
  ctx.fillStyle = '#fff7ec';
  ctx.strokeStyle = '#5b4032';
  ctx.lineWidth = Math.max(1.2, size * 0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.9, size * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f1a7b6';
  ctx.beginPath();
  ctx.arc(-size * 0.26, -size * 0.12, size * 0.14, 0, TAU);
  ctx.arc(0, -size * 0.2, size * 0.14, 0, TAU);
  ctx.arc(size * 0.26, -size * 0.12, size * 0.14, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function getLookOffset(from, to) {
  if (!from || !to) return { x: 0, y: 0 };
  var dx = to.x - from.x;
  var dy = to.y - from.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  if (!distance) return { x: 0, y: 0 };
  var max = 3.4;
  return {
    x: (dx / distance) * max,
    y: (dy / distance) * max,
  };
}

function quadraticPoint(a, b, c, t) {
  var inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * b.x + t * t * c.x,
    y: inv * inv * a.y + 2 * inv * t * b.y + t * t * c.y,
  };
}

function phaseDistanceAfter(phase, start) {
  return phase >= start ? phase - start : phase + 1 - start;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function roundRect(ctx, x, y, w, h, r) {
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
