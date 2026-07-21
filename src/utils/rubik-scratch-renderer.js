import { renderCubAvatar } from './cub.js';
import { renderRewardSuccessBurst } from './reward-effects.js';

var HALF_CUBIE = 1;
var FACE_NORMALS = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];
var VIEW_VECTOR = normalizeVector({ x: 1, y: 1, z: 1 });
var AXIS_BASIS = {
  x: { x: 0.86, y: 0.34 },
  y: { x: 0, y: -0.92 },
  z: { x: -0.86, y: 0.34 },
};
var FACE_COLORS = {
  '1,0,0': '#8bc6e8',
  '-1,0,0': '#5f8db3',
  '0,1,0': '#f4dfaa',
  '0,-1,0': '#7b6047',
  '0,0,1': '#f1b55f',
  '0,0,-1': '#9a6e45',
};

export function renderRubikScratch(ctx, state, canvasSize, options) {
  if (!ctx || !state) return;
  options = options || {};
  var layout = getRubikLayout(canvasSize, state.size);
  var viewTurn = state.turn || state.previewTurn || null;
  var items = getStickerItems(state, canvasSize, viewTurn);
  var goalItem = getGoalItem(state, canvasSize);
  var wormholeItems = getWormholeItems(state, canvasSize);
  var wormholePairs = getWormholePairItems(state, canvasSize);
  var forcedItems = getForcedTurnItems(state, canvasSize);
  var pawButtonItems = getPawButtonItems(state, canvasSize);
  var stickyItems = getStickyItems(state, canvasSize);
  var gravityItems = getGravityAxisItems(state, canvasSize);
  var lockedItems = getLockedAxisItems(state, canvasSize);
  var foldDoorItems = getFoldDoorItems(state, canvasSize);
  var queue = items.map(function (item) {
    return { type: 'sticker', item: item, order: 0 };
  });
  if (goalItem && !options.hideGoal && !goalItem.isBackSideGoal) {
    queue.push({ type: 'goal', item: goalItem, order: 1 });
  }

  drawRubikStage(ctx, layout, state);
  drawExtendedCubeEdges(ctx, layout, state);
  drawWormholeTunnels(ctx, wormholePairs, layout);
  drawAxisOverlays(ctx, gravityItems, lockedItems, layout);
  if (state.interaction && !state.turn) {
    drawRubikInteractionLayer(ctx, items, state.interaction);
  }

  queue.sort(function (a, b) {
    if (a.item.depth === b.item.depth) {
      return a.order - b.order;
    }
    return a.item.depth - b.item.depth;
  });

  queue.forEach(function (entry) {
    if (entry.type === 'goal') {
      drawGoalSticker(ctx, entry.item);
    } else {
      drawSticker(ctx, entry.item);
    }
  });

  drawRubikSlotMarkers(
    ctx,
    wormholeItems,
    forcedItems,
    pawButtonItems,
    stickyItems,
    foldDoorItems,
    state,
  );

  if (goalItem && !options.hideGoal && goalItem.isBackSideGoal) {
    drawBackSideGoalSticker(ctx, goalItem);
  }

  if (state.interaction && !state.turn) {
    drawRubikTurnGuides(ctx, state.interaction, layout);
  }

  items.forEach(function (item) {
    if (
      item.sticker.kind === 'cat' &&
      !options.hideCat &&
      !state.teleport &&
      !state.gravityMove &&
      !state.foldMove
    ) {
      drawCatSticker(
        ctx,
        item.center,
        layout.unit,
        options && options.completed,
        item.faceAlpha,
        item.normalDepth,
        options || {},
      );
    }
  });

  if (state.teleport) {
    drawWormholeTeleport(ctx, state, canvasSize, options || {});
  }

  if (state.gravityMove) {
    drawGravityMove(ctx, state, canvasSize, options || {});
  }

  if (state.foldMove) {
    drawFoldMove(ctx, state, canvasSize, options || {});
  }

  if (options && options.completed) {
    drawCompletionPulse(ctx, state, canvasSize);
  }

  if (options.successAnimation) {
    options.successAnimation.render(ctx);
  }
}

export function createRubikScratchSuccessAnimation(state, canvasSize, options) {
  var goalItem = getGoalItem(state, canvasSize);
  var catItem = null;
  getStickerItems(state, canvasSize, null).some(function (item) {
    if (item.sticker.kind === 'cat') {
      catItem = item;
      return true;
    }
    return false;
  });
  return new RubikScratchSuccessAnimation(goalItem || catItem, catItem, options || {});
}

export function getRubikStickerHit(state, point, canvasSize) {
  if (!state || state.turn) return null;
  var items = getStickerItems(state, canvasSize, null);
  var hits = items.filter(function (item) {
    return item.hitVisible && pointInPolygon(point, item.polygon);
  });
  if (!hits.length) return null;
  hits.sort(function (a, b) {
    return b.depth - a.depth;
  });
  return hits[0];
}

export function getRubikCatStickerHit(state, point, canvasSize) {
  if (!state || state.turn) return null;
  var items = getStickerItems(state, canvasSize, null);
  var catItem = null;
  items.some(function (item) {
    if (item.sticker.kind === 'cat') {
      catItem = item;
      return true;
    }
    return false;
  });
  if (!catItem) return null;
  if (pointInPolygon(point, catItem.polygon)) {
    return catItem;
  }
  var sameCubieHits = items.filter(function (item) {
    return item.cubie &&
      catItem.cubie &&
      item.cubie.id === catItem.cubie.id &&
      item.hitVisible &&
      pointInPolygon(point, item.polygon);
  });
  if (!sameCubieHits.length) return null;
  return catItem;
}

export function getRubikStickerCenterScreen(cubie, normal, turn, canvasSize, size) {
  var corners = getStickerCorners(cubie.position, normal);
  var transformed = corners.map(function (corner) {
    return getTurnedPoint(corner, cubie, turn);
  });
  var center = getPolygonCenter3d(transformed);
  return projectPoint(center, getRubikLayout(canvasSize, size));
}

export function rotateRubikQuarter(vector, axis, dir) {
  return roundVector(rotateVector(vector, axis, dir * Math.PI / 2));
}

export function vectorKey(vector) {
  return [vector.x, vector.y, vector.z].join(',');
}

export function sameVector(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y && a.z === b.z;
}

export function getNormalAxis(normal) {
  if (Math.abs(normal.x) > 0.5) return 'x';
  if (Math.abs(normal.y) > 0.5) return 'y';
  return 'z';
}

export function getNormalLayer(normal) {
  var axis = getNormalAxis(normal);
  return normal[axis] >= 0 ? 1 : -1;
}

function drawRubikStage(ctx, layout, state) {
  var t = Date.now() / 1000;
  ctx.save();
  ctx.translate(layout.center.x, layout.center.y + layout.shadowOffsetY);
  ctx.scale(1, 0.42);
  var radiusX = layout.shadowRadiusX;
  var radiusY = layout.shadowRadiusY;
  var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusX);
  gradient.addColorStop(0, 'rgba(0,0,0,0.24)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY + Math.sin(t * 2.3) * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExtendedCubeEdges(ctx, layout, state) {
  var extent = Math.max(2, state.size || 2);
  var signs = [-extent, extent];
  var edges = [];
  var axes = ['x', 'y', 'z'];
  axes.forEach(function (axis) {
    var otherAxes = axes.filter(function (entry) {
      return entry !== axis;
    });
    signs.forEach(function (a) {
      signs.forEach(function (b) {
        var start = {};
        var end = {};
        start[axis] = -extent;
        end[axis] = extent;
        start[otherAxes[0]] = a;
        end[otherAxes[0]] = a;
        start[otherAxes[1]] = b;
        end[otherAxes[1]] = b;
        edges.push({
          start: start,
          end: end,
          depth: dot(getMidpoint3d(start, end), VIEW_VECTOR),
        });
      });
    });
  });

  edges.sort(function (a, b) {
    return a.depth - b.depth;
  });

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  edges.forEach(function (edge) {
    var start = projectPoint(edge.start, layout);
    var end = projectPoint(edge.end, layout);
    var extended = extendScreenLine(start, end, layout.unit * 0.38);
    var depthRatio = (edge.depth + layout.maxDepth) / (layout.maxDepth * 2 || 1);
    ctx.strokeStyle = 'rgba(255,236,181,' + (0.08 + depthRatio * 0.18).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, layout.unit * (0.016 + depthRatio * 0.01));
    ctx.beginPath();
    ctx.moveTo(extended.start.x, extended.start.y);
    ctx.lineTo(extended.end.x, extended.end.y);
    ctx.stroke();
  });
  ctx.restore();
}

function drawRubikInteractionLayer(ctx, items, interaction) {
  if (!interaction) return;
  var activeTurn = interaction.activeTurn;
  ctx.save();
  if (activeTurn) {
    items.forEach(function (item) {
      if (!item.cubie || !item.cubie.position) return;
      if (item.cubie.position[activeTurn.axis] !== activeTurn.layer) return;
      drawLayerPreviewOverlay(ctx, item, interaction.ambiguous);
    });
  }

  items.forEach(function (item) {
    if (
      item.cubie &&
      item.cubie.id === interaction.hitCubieId &&
      vectorKey(roundVector(item.sticker.normal)) === interaction.hitNormalKey
    ) {
      drawHitStickerOutline(ctx, item, interaction.ambiguous);
    }
  });
  ctx.restore();
}

function drawLayerPreviewOverlay(ctx, item, ambiguous) {
  ctx.save();
  ctx.fillStyle = ambiguous ? 'rgba(255,191,98,0.11)' : 'rgba(255,238,168,0.12)';
  ctx.strokeStyle = ambiguous ? 'rgba(255,202,128,0.34)' : 'rgba(255,244,196,0.38)';
  ctx.lineWidth = Math.max(1, item.unit * 0.018);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.96);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHitStickerOutline(ctx, item, ambiguous) {
  ctx.save();
  ctx.strokeStyle = ambiguous ? 'rgba(255,202,128,0.86)' : 'rgba(255,249,208,0.92)';
  ctx.lineWidth = Math.max(2, item.unit * 0.045);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.9);
  ctx.stroke();
  ctx.restore();
}

function drawRubikTurnGuides(ctx, interaction, layout) {
  if (!interaction || !interaction.candidates || !interaction.candidates.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (interaction.mode === 'confirm') {
    drawTurnGuideArrow(ctx, interaction.candidates[0], layout.unit, true, false, true);
    drawTurnConfirmControls(ctx, interaction.confirm, layout.unit);
    ctx.restore();
    return;
  }

  var activeCandidates = interaction.activeTurn
    ? interaction.candidates.filter(function (candidate) {
      return getIsSameTurn(candidate, interaction.activeTurn);
    })
    : [];
  if (activeCandidates.length) {
    drawTurnGuideArrow(ctx, activeCandidates[0], layout.unit, true, interaction.ambiguous, false);
    ctx.restore();
    return;
  }

  drawSwipeStartCue(ctx, interaction, layout.unit);
  ctx.restore();
}

function drawSwipeStartCue(ctx, interaction, unit) {
  var center = interaction.hitCenter;
  if (!center) return;
  var t = Date.now() / 1000;
  var pulse = (Math.sin(t * Math.PI * 2.1) + 1) / 2;
  var radius = unit * (0.58 + pulse * 0.12);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,246,188,0.72)';
  ctx.fillStyle = 'rgba(255,231,153,0.1)';
  ctx.lineWidth = Math.max(2.2, unit * 0.052);
  ctx.shadowColor = 'rgba(255,226,150,0.32)';
  ctx.shadowBlur = unit * 0.18;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  var directions = getUniqueGuideDirections(interaction.candidates);
  directions.slice(0, 4).forEach(function (direction) {
    var sx = center.x + direction.x * unit * 0.28;
    var sy = center.y + direction.y * unit * 0.28;
    var ex = center.x + direction.x * unit * 0.92;
    var ey = center.y + direction.y * unit * 0.92;
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = Math.max(2, unit * 0.042);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    traceArrowHead(ctx, { x: ex, y: ey }, Math.atan2(direction.y, direction.x), unit * 0.13, 0.66);
  });
  ctx.restore();
}

function getUniqueGuideDirections(candidates) {
  var directions = [];
  (candidates || []).forEach(function (candidate) {
    var vector = candidate.vector || { x: 0, y: 0 };
    var length = vectorLength(vector);
    if (length <= 0) return;
    var direction = {
      x: vector.x / length,
      y: vector.y / length,
      angle: Math.atan2(vector.y, vector.x),
    };
    var hasClose = directions.some(function (existing) {
      var delta = Math.abs(existing.angle - direction.angle);
      delta = Math.min(delta, Math.PI * 2 - delta);
      return delta < 0.24;
    });
    if (!hasClose) directions.push(direction);
  });
  return directions.sort(function (a, b) {
    return a.angle - b.angle;
  });
}

function drawTurnConfirmControls(ctx, confirm, unit) {
  if (!confirm) return;
  var radius = confirm.radius || unit * 0.64;
  ctx.save();
  if (confirm.total > 1) {
    drawCircleIconButton(ctx, confirm.prevCenter, radius, 'prev', unit, false);
    drawCircleIconButton(ctx, confirm.nextCenter, radius, 'next', unit, false);
  }
  drawCircleIconButton(ctx, confirm.confirmCenter, radius * 1.04, 'confirm', unit, true);
  ctx.restore();
}

function drawCircleIconButton(ctx, center, radius, kind, unit, primary) {
  if (!center) return;
  ctx.save();
  ctx.shadowColor = primary ? 'rgba(65,135,78,0.42)' : 'rgba(0,0,0,0.24)';
  ctx.shadowBlur = unit * (primary ? 0.18 : 0.08);
  ctx.fillStyle = primary ? 'rgba(208,249,182,0.94)' : 'rgba(255,246,205,0.88)';
  ctx.strokeStyle = primary ? 'rgba(45,127,68,0.82)' : 'rgba(139,101,51,0.54)';
  ctx.lineWidth = Math.max(2, unit * 0.042);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (kind === 'confirm') {
    drawPawPrint(ctx, center.x, center.y + radius * 0.02, radius * 0.78);
  } else {
    drawChevronIcon(ctx, center, radius * 0.58, kind === 'next' ? 1 : -1);
  }
  ctx.restore();
}

function drawChevronIcon(ctx, center, size, dir) {
  ctx.save();
  ctx.strokeStyle = 'rgba(95,62,30,0.9)';
  ctx.lineWidth = Math.max(3, size * 0.18);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(center.x - dir * size * 0.28, center.y - size * 0.42);
  ctx.lineTo(center.x + dir * size * 0.26, center.y);
  ctx.lineTo(center.x - dir * size * 0.28, center.y + size * 0.42);
  ctx.stroke();
  ctx.restore();
}

function drawTurnGuideArrow(ctx, candidate, unit, active, ambiguous, showButton) {
  if (!candidate) return;
  var sx = candidate.start ? candidate.start.x : 0;
  var sy = candidate.start ? candidate.start.y : 0;
  var ex = candidate.end ? candidate.end.x : sx + candidate.vector.x;
  var ey = candidate.end ? candidate.end.y : sy + candidate.vector.y;
  var vx = ex - sx;
  var vy = ey - sy;
  var length = Math.sqrt(vx * vx + vy * vy) || candidate.length || vectorLength(candidate.vector);
  if (!length) return;
  var ux = vx / length;
  var uy = vy / length;
  var alpha = active ? (ambiguous ? 0.82 : 0.98) : 0.38;
  var color = active
    ? ambiguous ? 'rgba(255,205,118,' + alpha + ')' : 'rgba(255,246,188,' + alpha + ')'
    : 'rgba(255,255,255,' + alpha + ')';
  var head = unit * (active ? 0.42 : 0.32);
  var angle = Math.atan2(uy, ux);
  var buttonCenter = candidate.buttonCenter || { x: ex, y: ey };

  ctx.save();
  if (active && showButton) {
    ctx.fillStyle = 'rgba(255,229,149,0.13)';
    ctx.beginPath();
    ctx.arc(buttonCenter.x, buttonCenter.y, Math.max(unit * 0.68, (candidate.hitRadius || 0) * 0.86), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3.2, unit * (active ? 0.105 : 0.072));
  ctx.shadowColor = active ? 'rgba(255,226,150,0.38)' : 'transparent';
  ctx.shadowBlur = active ? unit * 0.15 : 0;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - Math.cos(angle - 0.62) * head,
    ey - Math.sin(angle - 0.62) * head,
  );
  ctx.lineTo(
    ex - Math.cos(angle + 0.62) * head,
    ey - Math.sin(angle + 0.62) * head,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getIsSameTurn(candidate, turn) {
  return !!turn &&
    candidate.axis === turn.axis &&
    candidate.layer === turn.layer &&
    candidate.dir === turn.dir;
}

function drawRubikSlotMarkers(ctx, wormholeItems, forcedItems, pawButtonItems, stickyItems, foldDoorItems, state) {
  wormholeItems.forEach(function (item) {
    drawWormholeIcon(ctx, item);
  });
  foldDoorItems.forEach(function (item) {
    drawFoldDoorIcon(ctx, item);
  });
  stickyItems.forEach(function (item) {
    var pulse = 0;
    if (state.stickyTouch && state.stickyTouch.key === item.slotKey) {
      pulse = Math.max(0, 1 - (Date.now() - state.stickyTouch.startedAt) / 620);
    }
    drawStickyIcon(ctx, item, pulse);
  });
  pawButtonItems.forEach(function (item) {
    var pulse = 0;
    if (state.buttonTouch && state.buttonTouch.key === item.slotKey) {
      pulse = Math.max(0, 1 - (Date.now() - state.buttonTouch.startedAt) / 620);
    }
    drawPawButtonIcon(ctx, item, pulse);
  });
  forcedItems.forEach(function (item) {
    var pulse = 0;
    if (state.forcedTouch && state.forcedTouch.key === item.slotKey) {
      pulse = Math.max(0, 1 - (Date.now() - state.forcedTouch.startedAt) / 620);
    }
    drawForcedTurnIcon(ctx, item, pulse);
  });
}

function drawStickyIcon(ctx, item, pulse) {
  var center = item.center;
  var unit = item.unit;
  var basis = getPolygonBasis(item.polygon);
  var r = unit * (0.3 + pulse * 0.05);
  ctx.save();
  ctx.globalAlpha = item.forceVisible
    ? 0.46 + pulse * 0.16
    : Math.min(1, item.faceAlpha + 0.34 + pulse * 0.16);
  ctx.fillStyle = pulse > 0 ? 'rgba(137,229,174,0.42)' : 'rgba(103,197,150,0.26)';
  traceInsetPolygon(ctx, item.polygon, item.center, 0.7);
  ctx.fill();

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(35,100,72,0.82)';
  ctx.lineWidth = Math.max(2.4, unit * 0.075);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.68);
  ctx.stroke();

  ctx.strokeStyle = pulse > 0 ? 'rgba(244,255,224,0.96)' : 'rgba(218,255,224,0.84)';
  ctx.lineWidth = Math.max(1.6, unit * 0.04);
  tracePlaneCircle(ctx, center, basis.u, basis.v, r, 30);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(48,116,78,0.82)';
  ctx.lineWidth = Math.max(1.8, unit * 0.045);
  ctx.beginPath();
  ctx.moveTo(center.x - basis.u.x * r * 0.6, center.y - basis.u.y * r * 0.6);
  ctx.bezierCurveTo(
    center.x - basis.v.x * r * 0.7,
    center.y - basis.v.y * r * 0.7,
    center.x + basis.v.x * r * 0.75,
    center.y + basis.v.y * r * 0.75,
    center.x + basis.u.x * r * 0.62,
    center.y + basis.u.y * r * 0.62,
  );
  ctx.stroke();
  ctx.restore();
}

function drawPawButtonIcon(ctx, item, pulse) {
  var active = !!item.buttonActive;
  var unit = item.unit;
  var flash = active ? pulse : 0;
  var baseBasis = getPolygonBasis(item.polygon);
  var planePlate = getInsetPolygon(item.polygon, item.center, 0.74);
  var plateHighlight = getInsetPolygon(item.polygon, item.center, 0.62).map(function (point) {
    return mixPoint(point, planePlate[0], 0.16);
  });
  var baseRadius = unit * 0.43;
  var socketRadius = unit * 0.34;
  var buttonRadius = unit * (active ? 0.27 : 0.32);
  var glowRadius = unit * (0.47 + flash * 0.08);
  var lightCenter = addPlaneOffset(
    item.center,
    baseBasis.u,
    baseBasis.v,
    -buttonRadius * 0.22,
    -buttonRadius * 0.28,
  );

  ctx.save();
  ctx.globalAlpha = item.forceVisible
    ? 0.74 + flash * 0.16
    : Math.min(1, item.faceAlpha + 0.54 + flash * 0.16);

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = active ? 'rgba(31,128,70,0.34)' : 'rgba(50,158,88,0.28)';
  traceRoundedPolygon(ctx, planePlate, Math.max(3, unit * 0.08));
  ctx.fill();

  ctx.strokeStyle = active ? 'rgba(16,91,48,0.74)' : 'rgba(28,117,61,0.68)';
  ctx.lineWidth = Math.max(1.4, unit * 0.034);
  traceRoundedPolygon(ctx, planePlate, Math.max(3, unit * 0.08));
  ctx.stroke();

  ctx.fillStyle = active ? 'rgba(227,255,216,0.1)' : 'rgba(248,255,235,0.18)';
  traceRoundedPolygon(ctx, plateHighlight, Math.max(2, unit * 0.05));
  ctx.fill();

  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = unit * 0.06;
  ctx.shadowOffsetY = unit * 0.022;
  var baseGradient = ctx.createLinearGradient(
    item.center.x,
    item.center.y - baseRadius,
    item.center.x,
    item.center.y + baseRadius,
  );
  baseGradient.addColorStop(0, 'rgba(255,255,255,0.98)');
  baseGradient.addColorStop(0.62, 'rgba(244,248,252,0.96)');
  baseGradient.addColorStop(1, 'rgba(218,226,235,0.92)');
  ctx.fillStyle = baseGradient;
  tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, baseRadius, 44);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = active ? 'rgba(49,123,78,0.82)' : 'rgba(86,137,103,0.74)';
  ctx.lineWidth = Math.max(1.8, unit * 0.044);
  tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, baseRadius, 44);
  ctx.stroke();

  ctx.fillStyle = active ? 'rgba(48,132,75,0.3)' : 'rgba(72,179,102,0.2)';
  tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, socketRadius, 40);
  ctx.fill();

  var topGradient = ctx.createRadialGradient(
    lightCenter.x,
    lightCenter.y,
    buttonRadius * 0.12,
    item.center.x,
    item.center.y,
    buttonRadius,
  );
  topGradient.addColorStop(0, active ? '#bdf5a8' : '#d9ffc8');
  topGradient.addColorStop(0.54, active ? '#61ce68' : '#7ef08a');
  topGradient.addColorStop(1, active ? '#228846' : '#2fb45d');
  ctx.fillStyle = topGradient;
  tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, buttonRadius, 44);
  ctx.fill();

  ctx.strokeStyle = active ? 'rgba(13,79,39,0.88)' : 'rgba(16,99,50,0.84)';
  ctx.lineWidth = Math.max(2, unit * 0.052);
  tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, buttonRadius, 44);
  ctx.stroke();

  if (active) {
    ctx.strokeStyle = 'rgba(224,255,206,0.48)';
    ctx.lineWidth = Math.max(1.5, unit * 0.036);
    tracePlaneCircle(ctx, item.center, baseBasis.u, baseBasis.v, buttonRadius * 0.62, 32);
    ctx.stroke();
  }

  ctx.strokeStyle = active ? 'rgba(242,255,225,0.58)' : 'rgba(250,255,239,0.82)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, unit * 0.042);
  tracePlaneArc(
    ctx,
    addPlaneOffset(item.center, baseBasis.u, baseBasis.v, -buttonRadius * 0.08, -buttonRadius * 0.28),
    baseBasis.u,
    baseBasis.v,
    buttonRadius * 0.52,
    buttonRadius * 0.2,
    Math.PI * 0.08,
    Math.PI * 0.86,
    16,
  );
  ctx.stroke();

  ctx.fillStyle = active ? 'rgba(229,255,215,0.48)' : 'rgba(255,255,245,0.74)';
  tracePlaneCircle(
    ctx,
    addPlaneOffset(item.center, baseBasis.u, baseBasis.v, -buttonRadius * 0.28, -buttonRadius * 0.24),
    baseBasis.u,
    baseBasis.v,
    Math.max(1.5, unit * 0.045),
    18,
  );
  ctx.fill();

  if (active) {
    ctx.strokeStyle = 'rgba(192,255,164,' + (0.42 + flash * 0.46).toFixed(3) + ')';
    ctx.lineWidth = Math.max(1.7, unit * 0.044);
    tracePlaneCircle(
      ctx,
      item.center,
      baseBasis.u,
      baseBasis.v,
      glowRadius,
      40,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function addPlaneOffset(center, u, v, x, y) {
  return {
    x: center.x + u.x * x + v.x * y,
    y: center.y + u.y * x + v.y * y,
  };
}

function getPlaneEllipsePoint(center, u, v, radiusX, radiusY, angle) {
  return addPlaneOffset(
    center,
    u,
    v,
    Math.cos(angle) * radiusX,
    Math.sin(angle) * radiusY,
  );
}

function tracePlaneEllipse(ctx, center, u, v, radiusX, radiusY, steps) {
  tracePlaneArc(ctx, center, u, v, radiusX, radiusY, 0, Math.PI * 2, steps || 28);
  ctx.closePath();
}

function tracePlaneCircle(ctx, center, u, v, radius, steps) {
  tracePlaneEllipse(ctx, center, u, v, radius, radius, steps || 32);
}

function tracePlaneArc(ctx, center, u, v, radiusX, radiusY, start, end, steps) {
  ctx.beginPath();
  for (var i = 0; i <= steps; i++) {
    var t = start + (end - start) * (i / steps);
    var point = getPlaneEllipsePoint(center, u, v, radiusX, radiusY, t);
    if (i === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
}

function drawForcedTurnIcon(ctx, item, pulse) {
  var center = item.center;
  var unit = item.unit;
  var vector = item.arrowVector || { x: 1, y: 0 };
  var length = vectorLength(vector) || 1;
  var ux = vector.x / length;
  var uy = vector.y / length;
  var arrowLength = unit * (0.44 + pulse * 0.08);
  var head = unit * (0.16 + pulse * 0.03);
  var start = {
    x: center.x - ux * arrowLength * 0.42,
    y: center.y - uy * arrowLength * 0.42,
  };
  var end = {
    x: center.x + ux * arrowLength * 0.58,
    y: center.y + uy * arrowLength * 0.58,
  };
  var angle = Math.atan2(uy, ux);
  var revealAlpha = item.revealAlpha == null ? 1 : item.revealAlpha;

  ctx.save();
  ctx.globalAlpha = item.forceVisible
    ? (0.48 + pulse * 0.16) * revealAlpha
    : Math.min(1, item.faceAlpha + 0.28 + pulse * 0.18) * revealAlpha;
  ctx.fillStyle = pulse > 0 ? 'rgba(255,212,111,0.36)' : 'rgba(255,178,84,0.22)';
  traceInsetPolygon(ctx, item.polygon, item.center, 0.72);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = pulse > 0 ? 'rgba(92,48,12,0.82)' : 'rgba(66,38,20,0.72)';
  ctx.lineWidth = Math.max(2.6, unit * 0.082);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.72);
  ctx.stroke();

  ctx.strokeStyle = pulse > 0 ? 'rgba(255,246,194,0.74)' : 'rgba(255,231,164,0.58)';
  ctx.lineWidth = Math.max(1.2, unit * 0.028);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.62);
  ctx.stroke();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = pulse > 0 ? 'rgba(255,214,116,0.44)' : 'rgba(255,202,104,0.24)';
  ctx.shadowBlur = unit * (0.08 + pulse * 0.07);

  ctx.strokeStyle = pulse > 0 ? 'rgba(78,38,8,0.92)' : 'rgba(58,35,18,0.84)';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = Math.max(4.2, unit * 0.12);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  traceArrowHead(ctx, end, angle, head * 1.14, 0.7);
  ctx.fill();

  ctx.strokeStyle = pulse > 0 ? 'rgba(255,246,194,0.98)' : 'rgba(255,225,150,0.92)';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = Math.max(2.3, unit * 0.064);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  traceArrowHead(ctx, end, angle, head, 0.68);
  ctx.fill();
  ctx.restore();
}

function traceArrowHead(ctx, end, angle, size, spread) {
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - Math.cos(angle - spread) * size,
    end.y - Math.sin(angle - spread) * size,
  );
  ctx.lineTo(
    end.x - Math.cos(angle + spread) * size,
    end.y - Math.sin(angle + spread) * size,
  );
  ctx.closePath();
}

function roundedDiamond(ctx, center, ux, uy, nx, ny, radius) {
  ctx.beginPath();
  ctx.moveTo(center.x + ux * radius, center.y + uy * radius);
  ctx.lineTo(center.x + nx * radius * 0.75, center.y + ny * radius * 0.75);
  ctx.lineTo(center.x - ux * radius, center.y - uy * radius);
  ctx.lineTo(center.x - nx * radius * 0.75, center.y - ny * radius * 0.75);
  ctx.closePath();
}

function drawAxisOverlays(ctx, gravityItems, lockedItems, layout) {
  if (lockedItems && lockedItems.length) {
    lockedItems.forEach(function (item) {
      drawLockedAxisIcon(ctx, item, layout);
    });
  }
  if (gravityItems && gravityItems.length) {
    gravityItems.forEach(function (item) {
      drawGravityAxisIcon(ctx, item, layout);
    });
  }
}

function drawGravityAxisIcon(ctx, item, layout) {
  var unit = layout.unit;
  if (item.start && item.end) {
    drawGravityAxisField(ctx, item, layout);
    return;
  }
  var vector = item.vector || { x: 0, y: 1 };
  var length = vectorLength(vector) || 1;
  var ux = vector.x / length;
  var uy = vector.y / length;
  var center = item.center;
  var line = unit * 0.68;
  var start = {
    x: center.x - ux * line * 0.42,
    y: center.y - uy * line * 0.42,
  };
  var end = {
    x: center.x + ux * line * 0.58,
    y: center.y + uy * line * 0.58,
  };
  var angle = Math.atan2(uy, ux);

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16,55,90,0.72)';
  ctx.fillStyle = 'rgba(16,55,90,0.72)';
  ctx.lineWidth = Math.max(4, unit * 0.1);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  traceArrowHead(ctx, end, angle, unit * 0.18, 0.66);
  ctx.fill();

  ctx.strokeStyle = 'rgba(158,228,255,0.88)';
  ctx.fillStyle = 'rgba(158,228,255,0.88)';
  ctx.lineWidth = Math.max(1.8, unit * 0.04);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  traceArrowHead(ctx, end, angle, unit * 0.13, 0.64);
  ctx.fill();
  ctx.restore();
}

function drawGravityAxisField(ctx, item, layout) {
  var unit = layout.unit;
  var start = item.start;
  var end = item.end;
  var vector = {
    x: end.x - start.x,
    y: end.y - start.y,
  };
  var length = vectorLength(vector) || 1;
  var ux = vector.x / length;
  var uy = vector.y / length;
  var nx = -uy;
  var ny = ux;
  var angle = Math.atan2(uy, ux);
  var t = Date.now() / 520;
  var flow = (Math.sin(t) + 1) * 0.5;
  var arrowCenter = {
    x: start.x + (end.x - start.x) * (0.58 + flow * 0.1),
    y: start.y + (end.y - start.y) * (0.58 + flow * 0.1),
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = 'rgba(20,92,58,0.58)';
  ctx.lineWidth = Math.max(12, unit * 0.42);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = 'rgba(111,232,145,0.58)';
  ctx.lineWidth = Math.max(7, unit * 0.24);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = 'rgba(231,255,210,0.82)';
  ctx.lineWidth = Math.max(2, unit * 0.045);
  if (ctx.setLineDash) ctx.setLineDash([unit * 0.18, unit * 0.12]);
  ctx.beginPath();
  ctx.moveTo(start.x + nx * unit * 0.12, start.y + ny * unit * 0.12);
  ctx.lineTo(end.x + nx * unit * 0.12, end.y + ny * unit * 0.12);
  ctx.moveTo(start.x - nx * unit * 0.12, start.y - ny * unit * 0.12);
  ctx.lineTo(end.x - nx * unit * 0.12, end.y - ny * unit * 0.12);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);

  (item.nodes || []).forEach(function (node, index) {
    var nodePulse = index === item.sinkIndex ? 1 : 0;
    drawGravityFieldNode(ctx, node, unit, nodePulse);
  });

  ctx.strokeStyle = 'rgba(22,84,45,0.86)';
  ctx.fillStyle = 'rgba(22,84,45,0.86)';
  ctx.lineWidth = Math.max(5, unit * 0.15);
  ctx.beginPath();
  ctx.moveTo(arrowCenter.x - ux * unit * 0.42, arrowCenter.y - uy * unit * 0.42);
  ctx.lineTo(arrowCenter.x + ux * unit * 0.38, arrowCenter.y + uy * unit * 0.38);
  ctx.stroke();
  traceArrowHead(
    ctx,
    { x: arrowCenter.x + ux * unit * 0.38, y: arrowCenter.y + uy * unit * 0.38 },
    angle,
    unit * 0.24,
    0.66,
  );
  ctx.fill();

  ctx.strokeStyle = 'rgba(241,255,199,0.96)';
  ctx.fillStyle = 'rgba(241,255,199,0.96)';
  ctx.lineWidth = Math.max(2.2, unit * 0.06);
  ctx.beginPath();
  ctx.moveTo(arrowCenter.x - ux * unit * 0.36, arrowCenter.y - uy * unit * 0.36);
  ctx.lineTo(arrowCenter.x + ux * unit * 0.31, arrowCenter.y + uy * unit * 0.31);
  ctx.stroke();
  traceArrowHead(
    ctx,
    { x: arrowCenter.x + ux * unit * 0.31, y: arrowCenter.y + uy * unit * 0.31 },
    angle,
    unit * 0.17,
    0.64,
  );
  ctx.fill();
  ctx.restore();
}

function drawGravityFieldNode(ctx, center, unit, pulse) {
  var radius = unit * (0.16 + pulse * 0.03);
  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.fillStyle = pulse ? 'rgba(232,255,210,0.42)' : 'rgba(101,221,132,0.3)';
  ctx.strokeStyle = pulse ? 'rgba(255,255,238,0.94)' : 'rgba(188,249,174,0.78)';
  ctx.lineWidth = Math.max(1.6, unit * 0.04);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLockedAxisIcon(ctx, item, layout) {
  var unit = layout.unit;
  if (item.start && item.end) {
    return;
  }
  var vector = item.vector || { x: 1, y: 0 };
  var length = vectorLength(vector) || 1;
  var ux = vector.x / length;
  var uy = vector.y / length;
  var nx = -uy;
  var ny = ux;
  var center = item.center;
  var half = unit * 0.56;
  var radius = unit * 0.18;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(57,45,55,0.82)';
  ctx.lineWidth = Math.max(4, unit * 0.1);
  ctx.beginPath();
  ctx.moveTo(center.x - ux * half, center.y - uy * half);
  ctx.lineTo(center.x + ux * half, center.y + uy * half);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(245,229,223,0.84)';
  ctx.lineWidth = Math.max(1.6, unit * 0.04);
  if (ctx.setLineDash) ctx.setLineDash([unit * 0.12, unit * 0.08]);
  ctx.beginPath();
  ctx.moveTo(center.x - ux * half, center.y - uy * half);
  ctx.lineTo(center.x + ux * half, center.y + uy * half);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(77,62,72,0.92)';
  ctx.strokeStyle = 'rgba(255,244,232,0.88)';
  ctx.lineWidth = Math.max(1.3, unit * 0.032);
  roundedDiamond(ctx, center, ux, uy, nx, ny, radius * 1.4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawLockedAxisField(ctx, item, layout) {
  var unit = layout.unit;
  var start = item.start;
  var end = item.end;
  var vector = {
    x: end.x - start.x,
    y: end.y - start.y,
  };
  var length = vectorLength(vector) || 1;
  var ux = vector.x / length;
  var uy = vector.y / length;
  var nx = -uy;
  var ny = ux;
  var center = item.center || {
    x: (start.x + end.x) * 0.5,
    y: (start.y + end.y) * 0.5,
  };
  var t = Date.now() / 420;
  var pulse = (Math.sin(t) + 1) * 0.5;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(122,22,34,0.62)';
  ctx.lineWidth = Math.max(12, unit * 0.42);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = 'rgba(237,71,84,0.58)';
  ctx.lineWidth = Math.max(7, unit * 0.24);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  ctx.strokeStyle = 'rgba(255,216,216,0.84)';
  ctx.lineWidth = Math.max(2, unit * 0.045);
  if (ctx.setLineDash) ctx.setLineDash([unit * 0.16, unit * 0.1]);
  ctx.beginPath();
  ctx.moveTo(start.x + nx * unit * 0.12, start.y + ny * unit * 0.12);
  ctx.lineTo(end.x + nx * unit * 0.12, end.y + ny * unit * 0.12);
  ctx.moveTo(start.x - nx * unit * 0.12, start.y - ny * unit * 0.12);
  ctx.lineTo(end.x - nx * unit * 0.12, end.y - ny * unit * 0.12);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);

  (item.nodes || []).forEach(function (node) {
    drawLockedAxisNode(ctx, node, unit, pulse);
  });

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(111,24,36,0.92)';
  ctx.strokeStyle = 'rgba(255,235,230,0.9)';
  ctx.lineWidth = Math.max(1.4, unit * 0.034);
  roundedDiamond(ctx, center, ux, uy, nx, ny, unit * (0.25 + pulse * 0.025));
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,235,230,0.92)';
  ctx.lineWidth = Math.max(2, unit * 0.052);
  ctx.beginPath();
  ctx.moveTo(center.x - nx * unit * 0.15, center.y - ny * unit * 0.15);
  ctx.lineTo(center.x + nx * unit * 0.15, center.y + ny * unit * 0.15);
  ctx.moveTo(center.x - ux * unit * 0.16, center.y - uy * unit * 0.16);
  ctx.lineTo(center.x + ux * unit * 0.16, center.y + uy * unit * 0.16);
  ctx.stroke();
  ctx.restore();
}

function drawLockedAxisNode(ctx, center, unit, pulse) {
  var radius = unit * (0.14 + pulse * 0.018);
  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.fillStyle = 'rgba(255,116,126,0.34)';
  ctx.strokeStyle = 'rgba(255,230,230,0.82)';
  ctx.lineWidth = Math.max(1.4, unit * 0.035);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWormholeTunnels(ctx, pairs, layout) {
  if (!pairs || !pairs.length) return;
  pairs.forEach(function (pair) {
    if (!pair.fromItem || !pair.toItem) return;
    var palette = getWormholePalette(pair.id);
    var center = layout.center;
    var revealAlpha = pair.revealAlpha == null ? 1 : pair.revealAlpha;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.7 * revealAlpha;
    ctx.strokeStyle = palette.tunnelShadow;
    ctx.lineWidth = Math.max(5, layout.unit * 0.16);
    ctx.beginPath();
    ctx.moveTo(pair.fromItem.center.x, pair.fromItem.center.y);
    ctx.quadraticCurveTo(center.x, center.y, pair.toItem.center.x, pair.toItem.center.y);
    ctx.stroke();

    ctx.globalAlpha = 0.78 * revealAlpha;
    ctx.strokeStyle = palette.tunnel;
    ctx.lineWidth = Math.max(2, layout.unit * 0.055);
    if (ctx.setLineDash) ctx.setLineDash([layout.unit * 0.18, layout.unit * 0.12]);
    ctx.beginPath();
    ctx.moveTo(pair.fromItem.center.x, pair.fromItem.center.y);
    ctx.quadraticCurveTo(center.x, center.y, pair.toItem.center.x, pair.toItem.center.y);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);

    ctx.globalAlpha = 0.24 * revealAlpha;
    ctx.fillStyle = palette.inner;
    ctx.beginPath();
    ctx.arc(center.x, center.y, layout.unit * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawFoldDoorLinks(ctx, pairs, layout) {
  if (!pairs || !pairs.length) return;
  pairs.forEach(function (pair) {
    if (!pair.fromItem || !pair.toItem) return;
    var revealAlpha = pair.revealAlpha == null ? 1 : pair.revealAlpha;
    var center = layout.center;
    ctx.save();
    ctx.globalAlpha = 0.68 * revealAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(88,53,18,0.32)';
    ctx.lineWidth = Math.max(5, layout.unit * 0.14);
    ctx.beginPath();
    ctx.moveTo(pair.fromItem.center.x, pair.fromItem.center.y);
    ctx.quadraticCurveTo(center.x, center.y - layout.unit * 0.28, pair.toItem.center.x, pair.toItem.center.y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,222,146,0.68)';
    ctx.lineWidth = Math.max(2, layout.unit * 0.048);
    if (ctx.setLineDash) ctx.setLineDash([layout.unit * 0.2, layout.unit * 0.1]);
    ctx.beginPath();
    ctx.moveTo(pair.fromItem.center.x, pair.fromItem.center.y);
    ctx.quadraticCurveTo(center.x, center.y - layout.unit * 0.28, pair.toItem.center.x, pair.toItem.center.y);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    ctx.restore();
  });
}

function drawWormholeIcon(ctx, item) {
  var palette = getWormholePalette(item.wormholeId);
  var center = item.center;
  var radius = item.unit * 0.29;
  var t = Date.now() / 1000;
  var revealAlpha = item.revealAlpha == null ? 1 : item.revealAlpha;
  ctx.save();
  ctx.globalAlpha = item.forceVisible
    ? 0.48 * revealAlpha
    : Math.min(1, item.faceAlpha + 0.34) * revealAlpha;
  ctx.fillStyle = palette.fill;
  traceInsetPolygon(ctx, item.polygon, item.center, item.forceVisible ? 0.76 : 0.68);
  ctx.fill();

  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = Math.max(2.8, item.unit * 0.09);
  traceInsetPolygon(ctx, item.polygon, item.center, item.forceVisible ? 0.76 : 0.68);
  ctx.stroke();

  ctx.strokeStyle = palette.markerStroke;
  ctx.lineWidth = Math.max(1.2, item.unit * 0.026);
  traceInsetPolygon(ctx, item.polygon, item.center, item.forceVisible ? 0.66 : 0.58);
  ctx.stroke();

  ctx.fillStyle = palette.depth;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = Math.max(4, item.unit * 0.105);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 1.04, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = palette.outer;
  ctx.lineWidth = Math.max(2.2, item.unit * 0.052);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = palette.rimLight;
  ctx.lineWidth = Math.max(1.3, item.unit * 0.024);
  ctx.beginPath();
  ctx.arc(center.x - radius * 0.08, center.y - radius * 0.1, radius * 0.62, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();

  ctx.strokeStyle = palette.inner;
  ctx.lineWidth = Math.max(1.5, item.unit * 0.032);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.58, t * 1.8, t * 1.8 + Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 0.28, -t * 2.2, -t * 2.2 + Math.PI * 1.25);
  ctx.stroke();
  ctx.restore();
}

function drawFoldDoorIcon(ctx, item) {
  var center = item.center;
  var unit = item.unit;
  var basis = getPolygonBasis(item.polygon);
  var revealAlpha = item.revealAlpha == null ? 1 : item.revealAlpha;
  var hingeAxis = item.hingeAxis || '';
  var axisVector = getAxisVector(hingeAxis);
  var hingeVector = axisVector ? projectVectorToScreen(axisVector) : basis.v;
  if (!hingeVector) hingeVector = basis.v;
  var baseNormal = roundVector(item.normal || item.sticker.normal);
  var foldDir = item.foldDir == null ? 1 : item.foldDir;
  var sideNormal = hingeAxis ? rotateRubikQuarter(baseNormal, hingeAxis, foldDir) : baseNormal;
  var sideVector = projectVectorToScreen(sideNormal) || basis.u;
  var hingeCenter = {
    x: center.x + sideVector.x * unit * 0.36,
    y: center.y + sideVector.y * unit * 0.36,
  };
  var hingeA = {
    x: hingeCenter.x - hingeVector.x * unit * 0.48,
    y: hingeCenter.y - hingeVector.y * unit * 0.48,
  };
  var hingeB = {
    x: hingeCenter.x + hingeVector.x * unit * 0.48,
    y: hingeCenter.y + hingeVector.y * unit * 0.48,
  };
  var t = Date.now() / 620;
  var pulse = 0.5 + Math.sin(t) * 0.5;
  var floatOffset = Math.sin(t * 1.7) * unit * 0.055;
  var arcRadius = unit * 0.34;
  var arrowStart = {
    x: center.x - sideVector.x * arcRadius * 0.58 + sideVector.x * floatOffset,
    y: center.y - sideVector.y * arcRadius * 0.58 + sideVector.y * floatOffset,
  };
  var arrowEnd = {
    x: center.x + sideVector.x * arcRadius * (0.82 + pulse * 0.12) + sideVector.x * floatOffset,
    y: center.y + sideVector.y * arcRadius * (0.82 + pulse * 0.12) + sideVector.y * floatOffset,
  };
  var arrowControl = {
    x: center.x - hingeVector.x * unit * 0.16 + sideVector.x * floatOffset,
    y: center.y - hingeVector.y * unit * 0.16 + sideVector.y * floatOffset,
  };
  var arrowAngle = Math.atan2(sideVector.y, sideVector.x);

  ctx.save();
  ctx.globalAlpha = (item.forceVisible ? 0.52 : Math.min(1, item.faceAlpha + 0.32)) * revealAlpha;
  ctx.fillStyle = 'rgba(255,199,104,0.18)';
  traceInsetPolygon(ctx, item.polygon, item.center, 0.72);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,198,95,0.28)';
  ctx.shadowBlur = unit * 0.11;
  ctx.strokeStyle = 'rgba(58,35,14,0.92)';
  ctx.lineWidth = Math.max(4.2, unit * 0.12);
  ctx.beginPath();
  ctx.moveTo(hingeA.x, hingeA.y);
  ctx.lineTo(hingeB.x, hingeB.y);
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,245,188,0.96)';
  ctx.lineWidth = Math.max(2, unit * 0.052);
  ctx.beginPath();
  ctx.moveTo(hingeA.x, hingeA.y);
  ctx.lineTo(hingeB.x, hingeB.y);
  ctx.stroke();

  ctx.fillStyle = 'rgba(62,36,13,0.88)';
  ctx.beginPath();
  ctx.arc(hingeA.x, hingeA.y, Math.max(2.4, unit * 0.08), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hingeB.x, hingeB.y, Math.max(2.4, unit * 0.08), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(76,43,12,0.86)';
  ctx.fillStyle = 'rgba(255,239,151,0.98)';
  ctx.lineWidth = Math.max(2.5, unit * 0.07);
  ctx.beginPath();
  ctx.moveTo(arrowStart.x, arrowStart.y);
  ctx.quadraticCurveTo(
    arrowControl.x,
    arrowControl.y,
    arrowEnd.x,
    arrowEnd.y,
  );
  ctx.stroke();
  traceArrowHead(ctx, arrowEnd, arrowAngle, unit * 0.16, 0.68);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,251,207,0.82)';
  ctx.fillStyle = 'rgba(255,251,207,0.86)';
  ctx.lineWidth = Math.max(1.4, unit * 0.038);
  ctx.beginPath();
  ctx.moveTo(arrowStart.x, arrowStart.y);
  ctx.quadraticCurveTo(
    arrowControl.x,
    arrowControl.y,
    arrowEnd.x,
    arrowEnd.y,
  );
  ctx.stroke();
  traceArrowHead(ctx, arrowEnd, arrowAngle, unit * 0.11, 0.66);
  ctx.fill();
  ctx.restore();
}

function drawWormholeTeleport(ctx, state, canvasSize, options) {
  var teleport = state.teleport;
  var layout = getRubikLayout(canvasSize, state.size);
  var fromItem = getSlotItem(teleport.from, canvasSize, 'teleport', state.size, 0.32, true);
  var toItem = getSlotItem(teleport.to, canvasSize, 'teleport', state.size, 0.32, true);
  if (!fromItem || !toItem) return;
  var t = easeInOutCubic(teleport.progress || 0);
  var mid = {
    x: layout.center.x,
    y: layout.center.y,
  };
  var center = getQuadraticPoint(fromItem.center, mid, toItem.center, t);
  var unit = Math.min(fromItem.unit, toItem.unit);
  var palette = getWormholePalette(teleport.id);

  ctx.save();
  ctx.strokeStyle = palette.tunnelShadow;
  ctx.lineWidth = Math.max(4, unit * 0.13);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.quadraticCurveTo(mid.x, mid.y, toItem.center.x, toItem.center.y);
  ctx.stroke();

  ctx.strokeStyle = palette.trail;
  ctx.lineWidth = Math.max(2, unit * 0.045);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.quadraticCurveTo(mid.x, mid.y, center.x, center.y);
  ctx.stroke();

  ctx.globalAlpha = 0.92;
  drawWormholeIcon(ctx, fromItem);
  drawWormholeIcon(ctx, toItem);
  ctx.restore();

  drawCatSticker(ctx, center, unit, false, 1, 1, options);
}

function drawGravityMove(ctx, state, canvasSize, options) {
  var move = state.gravityMove;
  if (!move) return;
  var fromItem = getSlotItem(move.from, canvasSize, 'gravity-from', state.size, 0.32, true);
  var toItem = getSlotItem(move.to, canvasSize, 'gravity-to', state.size, 0.32, true);
  if (!fromItem || !toItem) return;
  var t = easeInOutCubic(move.progress || 0);
  var center = mixPoint(fromItem.center, toItem.center, t);
  var unit = Math.min(fromItem.unit, toItem.unit);
  var dx = toItem.center.x - fromItem.center.x;
  var dy = toItem.center.y - fromItem.center.y;
  var angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(18,58,88,0.26)';
  ctx.lineWidth = Math.max(5, unit * 0.13);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.lineTo(toItem.center.x, toItem.center.y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(152,229,255,0.66)';
  ctx.lineWidth = Math.max(2, unit * 0.052);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.lineTo(center.x, center.y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(152,229,255,0.74)';
  traceArrowHead(ctx, center, angle, unit * 0.12, 0.66);
  ctx.fill();
  ctx.restore();

  drawCatSticker(ctx, center, unit, false, 1, 1, options);
}

function drawFoldMove(ctx, state, canvasSize, options) {
  var move = state.foldMove;
  if (!move) return;
  if (move.mode === 'hinge') {
    drawHingeFoldMove(ctx, state, canvasSize, options);
    return;
  }
  var layout = getRubikLayout(canvasSize, state.size);
  var fromItem = getSlotItem(move.from, canvasSize, 'fold-from', state.size, 0.34, true);
  var toItem = getSlotItem(move.to, canvasSize, 'fold-to', state.size, 0.34, true);
  if (!fromItem || !toItem) return;
  var t = easeInOutCubic(move.progress || 0);
  var mid = {
    x: layout.center.x,
    y: layout.center.y - layout.unit * 0.36,
  };
  var center = getQuadraticPoint(fromItem.center, mid, toItem.center, t);
  var unit = Math.min(fromItem.unit, toItem.unit);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(84,50,19,0.28)';
  ctx.lineWidth = Math.max(5, unit * 0.14);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.quadraticCurveTo(mid.x, mid.y, toItem.center.x, toItem.center.y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,226,150,0.76)';
  ctx.lineWidth = Math.max(2, unit * 0.052);
  ctx.beginPath();
  ctx.moveTo(fromItem.center.x, fromItem.center.y);
  ctx.quadraticCurveTo(mid.x, mid.y, center.x, center.y);
  ctx.stroke();
  drawFoldDoorIcon(ctx, fromItem);
  drawFoldDoorIcon(ctx, toItem);
  ctx.restore();

  drawCatSticker(ctx, center, unit, false, 1, 1, options);
}

function drawHingeFoldMove(ctx, state, canvasSize, options) {
  var move = state.foldMove;
  var fromItem = getSlotItem(move.from, canvasSize, 'fold-hinge-from', state.size, 0, true);
  var toItem = getSlotItem(move.to, canvasSize, 'fold-hinge-to', state.size, 0, true);
  if (!fromItem || !toItem) return;
  var t = easeInOutCubic(move.progress || 0);
  var panel = getHingedPanelFrame(fromItem, toItem, t);
  var unit = Math.min(fromItem.unit, toItem.unit);
  var center = panel ? getPolygonCenter2d(panel.polygon) : mixPoint(fromItem.center, toItem.center, t);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = 'rgba(255,225,152,0.28)';
  traceInsetPolygon(ctx, toItem.polygon, toItem.center, 0.72);
  ctx.fill();

  if (panel) {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(255,198,98,0.52)';
    tracePolygon(ctx, panel.polygon);
    ctx.fill();

    ctx.strokeStyle = 'rgba(72,43,18,0.76)';
    ctx.lineWidth = Math.max(2.5, unit * 0.065);
    tracePolygon(ctx, panel.polygon);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,242,181,0.86)';
    ctx.lineWidth = Math.max(1.5, unit * 0.034);
    ctx.beginPath();
    ctx.moveTo(panel.hinge[0].x, panel.hinge[0].y);
    ctx.lineTo(panel.hinge[1].x, panel.hinge[1].y);
    ctx.stroke();
  }
  ctx.restore();

  drawCatSticker(ctx, center, unit, false, 1, 1, options);
}

function getHingedPanelFrame(fromItem, toItem, t) {
  var fromPolygon = fromItem.polygon;
  var toPolygon = toItem.polygon;
  var threshold = fromItem.unit * 0.06;
  var shared = [];
  var fromFar = [];
  var toSharedIndexes = {};
  fromPolygon.forEach(function (point, index) {
    var matchedIndex = -1;
    var matchedDistance = Infinity;
    toPolygon.forEach(function (targetPoint, targetIndex) {
      var distance = getDistance(point, targetPoint);
      if (distance < matchedDistance) {
        matchedDistance = distance;
        matchedIndex = targetIndex;
      }
    });
    if (matchedDistance <= threshold && shared.length < 2) {
      shared.push({
        point: point,
        fromIndex: index,
        toIndex: matchedIndex,
      });
      toSharedIndexes[matchedIndex] = true;
    } else {
      fromFar.push(point);
    }
  });
  if (shared.length !== 2 || fromFar.length !== 2) return null;
  var toFar = toPolygon.filter(function (_point, index) {
    return !toSharedIndexes[index];
  });
  if (toFar.length !== 2) return null;

  var pairedToFar = pairFarEdgePoints(fromFar, toFar);
  var animatedFarA = mixPoint(fromFar[0], pairedToFar[0], t);
  var animatedFarB = mixPoint(fromFar[1], pairedToFar[1], t);
  var hinge = [shared[0].point, shared[1].point];
  return {
    hinge: hinge,
    polygon: [
      hinge[0],
      hinge[1],
      animatedFarB,
      animatedFarA,
    ],
  };
}

function pairFarEdgePoints(source, target) {
  var direct =
    getDistance(source[0], target[0]) + getDistance(source[1], target[1]);
  var flipped =
    getDistance(source[0], target[1]) + getDistance(source[1], target[0]);
  return direct <= flipped
    ? [target[0], target[1]]
    : [target[1], target[0]];
}

function getWormholePalette(id) {
  if (id === 'violet') {
    return {
      fill: 'rgba(129,102,222,0.24)',
      depth: 'rgba(35,24,80,0.58)',
      outline: 'rgba(31,18,74,0.86)',
      markerStroke: 'rgba(247,238,255,0.78)',
      outer: 'rgba(224,214,255,0.9)',
      rimLight: 'rgba(255,245,255,0.72)',
      inner: 'rgba(161,126,255,0.9)',
      trail: 'rgba(198,176,255,0.5)',
      tunnel: 'rgba(174,146,255,0.5)',
      tunnelShadow: 'rgba(43,26,88,0.34)',
    };
  }
  return {
    fill: 'rgba(75,183,235,0.22)',
    depth: 'rgba(16,54,78,0.58)',
    outline: 'rgba(8,37,56,0.86)',
    markerStroke: 'rgba(232,253,255,0.78)',
    outer: 'rgba(210,244,255,0.92)',
    rimLight: 'rgba(248,255,255,0.74)',
    inner: 'rgba(88,205,255,0.88)',
    trail: 'rgba(144,224,255,0.52)',
    tunnel: 'rgba(104,218,255,0.5)',
    tunnelShadow: 'rgba(17,58,82,0.34)',
  };
}

function getQuadraticPoint(a, b, c, t) {
  var inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * b.x + t * t * c.x,
    y: inv * inv * a.y + 2 * inv * t * b.y + t * t * c.y,
  };
}

function drawSticker(ctx, item) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = item.unit * 0.08;
  ctx.shadowOffsetY = item.unit * 0.035;
  ctx.globalAlpha = item.sticker.kind === 'cat'
    ? Math.min(0.78, item.faceAlpha + 0.16)
    : item.faceAlpha;
  ctx.fillStyle = getStickerFill(item);
  var isLockedSticker = item.lockedAxis && item.sticker.kind !== 'cat';
  if (isLockedSticker) {
    ctx.fillStyle = getLockedStickerFill(item);
  } else if (item.gravityField && item.sticker.kind !== 'cat') {
    ctx.fillStyle = getGravityStickerFill(item);
  }
  ctx.strokeStyle = item.sticker.kind === 'cat'
    ? 'rgba(255,255,255,0.92)'
    : isLockedSticker
      ? 'rgba(129,28,38,0.82)'
      : item.gravityField
        ? 'rgba(28,86,126,0.72)'
      : 'rgba(71,45,32,0.68)';
  ctx.lineWidth = item.sticker.kind === 'cat'
    ? Math.max(2, item.unit * 0.035)
    : (isLockedSticker || item.gravityField)
      ? Math.max(1.5, item.unit * 0.034)
      : Math.max(1, item.unit * 0.022);
  tracePolygon(ctx, item.polygon);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = item.sticker.kind === 'cat'
    ? 'rgba(255,240,184,0.56)'
    : isLockedSticker
      ? 'rgba(255,232,232,0.48)'
      : item.gravityField
        ? 'rgba(222,250,255,0.42)'
      : 'rgba(255,244,208,0.18)';
  ctx.lineWidth = Math.max(1, item.unit * 0.012);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.88);
  ctx.stroke();
  if (isLockedSticker) {
    ctx.fillStyle = 'rgba(255,94,104,0.18)';
    traceInsetPolygon(ctx, item.polygon, item.center, 0.72);
    ctx.fill();
  } else if (item.gravityField && item.sticker.kind !== 'cat') {
    ctx.fillStyle = 'rgba(120,224,255,0.18)';
    traceInsetPolygon(ctx, item.polygon, item.center, 0.72);
    ctx.fill();
  }
  ctx.restore();
}

function drawGoalSticker(ctx, item, alphaScale) {
  var board = getInsetPolygon(item.polygon, item.center, 0.72);
  var inner = getInsetPolygon(item.polygon, item.center, 0.48);
  var highlight = getInsetPolygon(item.polygon, item.center, 0.58).map(function (point) {
    return mixPoint(point, board[0], 0.12);
  });
  var basis = getPolygonBasis(board);
  var palette = getGoalBoardPalette(item);
  var alpha = alphaScale == null ? 1 : alphaScale;

  ctx.save();
  ctx.globalAlpha = Math.min(1, item.faceAlpha + 0.26) * alpha * (item.goalLocked ? 0.46 : 1);
  ctx.fillStyle = palette.underlay;
  traceRoundedPolygon(ctx, getInsetPolygon(item.polygon, item.center, 0.84), Math.max(3, item.unit * 0.09));
  ctx.fill();

  ctx.shadowColor = item.goalLocked ? 'rgba(30,34,42,0.18)' : 'rgba(0,0,0,0.24)';
  ctx.shadowBlur = item.unit * (item.goalLocked ? 0.035 : 0.09);
  ctx.shadowOffsetY = item.unit * (item.goalLocked ? 0.012 : 0.03);
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = palette.stroke;
  ctx.lineWidth = Math.max(1.5, item.unit * 0.03);
  traceRoundedPolygon(ctx, board, Math.max(3, item.unit * 0.1));
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = palette.highlight;
  traceRoundedPolygon(ctx, highlight, Math.max(2, item.unit * 0.045));
  ctx.fill();

  ctx.strokeStyle = palette.innerStroke;
  ctx.lineWidth = Math.max(1, item.unit * 0.018);
  traceRoundedPolygon(ctx, inner, Math.max(2, item.unit * 0.06));
  ctx.stroke();

  drawPawPrintOnPlane(ctx, item.center, basis.u, basis.v, item.unit * 0.3);
  if (item.goalLocked) {
    drawLockedGoalOverlay(ctx, item, board, inner, basis, alpha);
  }
  ctx.restore();
}

function drawBackSideGoalSticker(ctx, item) {
  var pulse = (Math.sin(Date.now() / 260) + 1) * 0.5;
  var alpha = item.goalLocked ? 0.34 + pulse * 0.08 : 0.6 + pulse * 0.16;
  var radius = item.unit * (0.54 + pulse * 0.04);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = item.goalLocked ? 'rgba(75,82,94,0.16)' : 'rgba(255,244,204,0.2)';
  ctx.strokeStyle = item.goalLocked ? 'rgba(174,184,196,0.56)' : 'rgba(255,238,166,0.72)';
  ctx.lineWidth = Math.max(2, item.unit * 0.04);
  traceRoundedPolygon(ctx, getInsetPolygon(item.polygon, item.center, 0.92), Math.max(3, item.unit * 0.11));
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = item.goalLocked ? 'rgba(206,216,224,0.4)' : 'rgba(255,238,166,0.55)';
  ctx.lineWidth = Math.max(1.5, item.unit * 0.025);
  ctx.beginPath();
  ctx.arc(item.center.x, item.center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawGoalSticker(ctx, item, item.goalLocked ? 0.52 : 0.78);
}

function drawLockedGoalOverlay(ctx, item, board, inner, basis, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * 1.18);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(45,50,60,0.48)';
  traceRoundedPolygon(ctx, board, Math.max(3, item.unit * 0.1));
  ctx.fill();

  ctx.fillStyle = 'rgba(216,222,229,0.28)';
  traceRoundedPolygon(ctx, inner, Math.max(2, item.unit * 0.06));
  ctx.fill();

  drawLockedGoalStripes(ctx, item, board, basis);
  drawLockedGoalSeal(ctx, item, basis);
  ctx.restore();
}

function drawLockedGoalStripes(ctx, item, board, basis) {
  var half = item.unit * 0.34;
  var stripeGap = item.unit * 0.18;
  var stripeLength = item.unit * 0.86;

  ctx.save();
  traceRoundedPolygon(ctx, board, Math.max(3, item.unit * 0.1));
  ctx.clip();
  ctx.strokeStyle = 'rgba(246,248,250,0.54)';
  ctx.lineWidth = Math.max(1.2, item.unit * 0.026);
  ctx.lineCap = 'round';
  for (var i = -2; i <= 2; i++) {
    var start = addPlaneOffset(item.center, basis.u, basis.v, -half + i * stripeGap, half);
    var end = addPlaneOffset(item.center, basis.u, basis.v, -half + i * stripeGap + stripeLength, -half);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLockedGoalSeal(ctx, item, basis) {
  var center = item.center;
  var radius = item.unit * 0.22;
  var shackleTop = addPlaneOffset(center, basis.u, basis.v, 0, -item.unit * 0.16);
  var shackleLeft = addPlaneOffset(center, basis.u, basis.v, -item.unit * 0.12, -item.unit * 0.01);
  var shackleRight = addPlaneOffset(center, basis.u, basis.v, item.unit * 0.12, -item.unit * 0.01);

  ctx.save();
  ctx.fillStyle = 'rgba(41,47,58,0.56)';
  tracePlaneCircle(ctx, center, basis.u, basis.v, radius, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,247,216,0.82)';
  ctx.lineWidth = Math.max(1.5, item.unit * 0.034);
  tracePlaneCircle(ctx, center, basis.u, basis.v, radius, 28);
  ctx.stroke();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,247,216,0.9)';
  ctx.lineWidth = Math.max(1.5, item.unit * 0.036);
  ctx.beginPath();
  ctx.moveTo(shackleLeft.x, shackleLeft.y);
  ctx.quadraticCurveTo(shackleTop.x, shackleTop.y, shackleRight.x, shackleRight.y);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,247,216,0.92)';
  var body = [
    addPlaneOffset(center, basis.u, basis.v, -item.unit * 0.15, -item.unit * 0.02),
    addPlaneOffset(center, basis.u, basis.v, item.unit * 0.15, -item.unit * 0.02),
    addPlaneOffset(center, basis.u, basis.v, item.unit * 0.15, item.unit * 0.17),
    addPlaneOffset(center, basis.u, basis.v, -item.unit * 0.15, item.unit * 0.17),
  ];
  traceRoundedPolygon(ctx, body, Math.max(1.5, item.unit * 0.035));
  ctx.fill();
  ctx.restore();
}

function drawCatSticker(ctx, center, unit, completed, faceAlpha, normalDepth, options) {
  var t = Date.now() / 1000;
  var size = unit * (completed ? 0.62 : 0.54);
  var bob = Math.sin(t * 4) * unit * 0.012;
  var isBehind = normalDepth < 0.05;

  ctx.save();
  ctx.globalAlpha = isBehind ? 0.82 : 1;
  ctx.translate(center.x, center.y + bob);
  if (isBehind) {
    ctx.fillStyle = 'rgba(255,232,171,0.24)';
    ctx.beginPath();
    ctx.arc(0, size * 0.1, size * 0.98, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.72, size * 0.72, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  renderCubAvatar(ctx, size, {
    accessoryId: options.accessoryId,
    expressionId: options.expressionId,
    isHovered: !isBehind,
    lookOffset: { x: 0, y: 0 },
    time: t,
  });
  ctx.restore();
}

function drawCompletionPulse(ctx, state, canvasSize) {
  var center = getGoalItem(state, canvasSize);
  if (!center) return;
  var t = Date.now() / 1000;
  var r = center.unit * (0.56 + Math.sin(t * 5) * 0.05);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,238,168,0.48)';
  ctx.lineWidth = Math.max(2, center.unit * 0.035);
  ctx.beginPath();
  ctx.arc(center.center.x, center.center.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawScratchLines(ctx, center, radius) {
  [-0.35, 0, 0.35].forEach(function (offset) {
    ctx.beginPath();
    ctx.moveTo(center.x - radius * 0.68 + offset * radius, center.y - radius * 0.62);
    ctx.quadraticCurveTo(
      center.x - radius * 0.14 + offset * radius,
      center.y,
      center.x + radius * 0.44 + offset * radius,
      center.y + radius * 0.58,
    );
    ctx.stroke();
  });
}

function drawPawPrint(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#7b4b21';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.28, size * 0.38, size * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  [
    { x: -0.42, y: -0.16, r: 0.18 },
    { x: -0.14, y: -0.36, r: 0.19 },
    { x: 0.16, y: -0.36, r: 0.19 },
    { x: 0.44, y: -0.16, r: 0.18 },
  ].forEach(function (toe) {
    ctx.beginPath();
    ctx.arc(toe.x * size, toe.y * size, toe.r * size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(255,246,209,0.28)';
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, size * 0.18, size * 0.12, size * 0.07, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPawPrintOnPlane(ctx, center, u, v, size) {
  var point = function (x, y) {
    var flippedY = -y;
    return {
      x: center.x + u.x * x * size + v.x * flippedY * size,
      y: center.y + u.y * x * size + v.y * flippedY * size,
    };
  };
  var axisAngle = Math.atan2(u.y, u.x);
  var sx = Math.max(0.45, vectorLength(u));
  var sy = Math.max(0.45, vectorLength(v));

  ctx.save();
  ctx.strokeStyle = '#7b4b21';
  ctx.lineWidth = Math.max(1.4, size * 0.1);
  var pad = point(0, 0.28);
  ctx.beginPath();
  ctx.ellipse(pad.x, pad.y, size * 0.38 * sx, size * 0.3 * sy, axisAngle, 0, Math.PI * 2);
  ctx.stroke();

  [
    { x: -0.42, y: -0.16, r: 0.18 },
    { x: -0.14, y: -0.36, r: 0.19 },
    { x: 0.16, y: -0.36, r: 0.19 },
    { x: 0.44, y: -0.16, r: 0.18 },
  ].forEach(function (toe) {
    var p = point(toe.x, toe.y);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, toe.r * size * sx, toe.r * size * sy, axisAngle, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

function RubikScratchSuccessAnimation(goalItem, catItem, options) {
  this.goalItem = goalItem;
  this.catItem = catItem;
  this.accessoryId = options.accessoryId || '';
  this.expressionId = options.expressionId || '';
  this.startTime = Date.now();
  this.duration = 920;
  this.t = 0;
}

RubikScratchSuccessAnimation.prototype.update = function () {
  this.t = Math.min(1, (Date.now() - this.startTime) / this.duration);
};

RubikScratchSuccessAnimation.prototype.render = function (ctx) {
  var item = this.goalItem || this.catItem;
  if (!item) return;
  var t = this.t || 0;
  var pop = 0.76 + 0.24 * easeOutBack(Math.min(1, t * 1.22));
  var yLift = -item.unit * 0.22 * easeOutCubic(t);
  var alpha = Math.min(1, 0.38 + t * 1.4);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(item.center.x, item.center.y + yLift);
  ctx.scale(pop, pop);
  ctx.translate(-item.center.x, -item.center.y);

  drawGoalSticker(ctx, item, alpha);

  ctx.save();
  ctx.translate(item.center.x, item.center.y - item.unit * 0.3);
  renderCubAvatar(ctx, item.unit * 0.72, {
    accessoryId: this.accessoryId,
    expressionId: this.expressionId || 'joy',
    isHovered: true,
    lookOffset: { x: 0, y: 0 },
    time: Date.now() / 1000,
  });
  ctx.restore();

  if (t < 1) {
    renderRubikSuccessBurst(ctx, item.center, item.unit, t);
    renderRewardSuccessBurst(ctx, item.center, item.unit * 1.1, t, {
      accessoryId: this.accessoryId,
      expressionId: this.expressionId,
    });
  }

  ctx.restore();
};

function renderRubikSuccessBurst(ctx, center, unit, t) {
  var ease = easeOutCubic(t);
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, unit * 0.035);
  for (var i = 0; i < 8; i++) {
    var angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    var inner = unit * (0.42 + ease * 0.12);
    var outer = unit * (0.62 + ease * 0.48);
    ctx.strokeStyle = i % 2 ? '#fff1b8' : '#8d5620';
    ctx.beginPath();
    ctx.moveTo(center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner);
    ctx.lineTo(center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function traceRoundRect(ctx, x, y, width, height, radius) {
  var r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function traceRoundedPolygon(ctx, points, radius) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  points.forEach(function (point, index) {
    var prev = points[(index + points.length - 1) % points.length];
    var next = points[(index + 1) % points.length];
    var prevLength = getDistance(point, prev);
    var nextLength = getDistance(point, next);
    var r = Math.min(radius, prevLength * 0.34, nextLength * 0.34);
    var from = {
      x: point.x + (prev.x - point.x) / (prevLength || 1) * r,
      y: point.y + (prev.y - point.y) / (prevLength || 1) * r,
    };
    var to = {
      x: point.x + (next.x - point.x) / (nextLength || 1) * r,
      y: point.y + (next.y - point.y) / (nextLength || 1) * r,
    };
    if (index === 0) {
      ctx.moveTo(from.x, from.y);
    } else {
      ctx.lineTo(from.x, from.y);
    }
    ctx.quadraticCurveTo(point.x, point.y, to.x, to.y);
  });
  ctx.closePath();
}

function getInsetPolygon(points, center, scale) {
  return points.map(function (point) {
    return {
      x: center.x + (point.x - center.x) * scale,
      y: center.y + (point.y - center.y) * scale,
    };
  });
}

function getPolygonBasis(points) {
  var ux = ((points[1].x - points[0].x) + (points[2].x - points[3].x)) / 2;
  var uy = ((points[1].y - points[0].y) + (points[2].y - points[3].y)) / 2;
  var vx = ((points[3].x - points[0].x) + (points[2].x - points[1].x)) / 2;
  var vy = ((points[3].y - points[0].y) + (points[2].y - points[1].y)) / 2;
  return {
    u: normalize2d({ x: ux, y: uy }),
    v: normalize2d({ x: vx, y: vy }),
  };
}

function mixPoint(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function getAxisVector(axis) {
  if (axis === 'x') return { x: 1, y: 0, z: 0 };
  if (axis === 'y') return { x: 0, y: 1, z: 0 };
  if (axis === 'z') return { x: 0, y: 0, z: 1 };
  return null;
}

function projectVectorToScreen(vector) {
  if (!vector) return null;
  var projected = {
    x:
      vector.x * AXIS_BASIS.x.x +
      vector.y * AXIS_BASIS.y.x +
      vector.z * AXIS_BASIS.z.x,
    y:
      vector.x * AXIS_BASIS.x.y +
      vector.y * AXIS_BASIS.y.y +
      vector.z * AXIS_BASIS.z.y,
  };
  return vectorLength(projected) > 0.001 ? normalize2d(projected) : null;
}

function normalize2d(vector) {
  var length = vectorLength(vector) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function vectorLength(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

function getDistance(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function extendScreenLine(start, end, amount) {
  var dx = end.x - start.x;
  var dy = end.y - start.y;
  var length = Math.sqrt(dx * dx + dy * dy) || 1;
  var ux = dx / length;
  var uy = dy / length;
  return {
    start: {
      x: start.x - ux * amount,
      y: start.y - uy * amount,
    },
    end: {
      x: end.x + ux * amount,
      y: end.y + uy * amount,
    },
  };
}

function getMidpoint3d(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function offsetCorners(corners, normal, amount) {
  return corners.map(function (corner) {
    return {
      x: corner.x + normal.x * amount,
      y: corner.y + normal.y * amount,
      z: corner.z + normal.z * amount,
    };
  });
}

function getStickerFill(item) {
  if (item.sticker.kind === 'cat') {
    return '#ffe4a5';
  }
  var base = FACE_COLORS[vectorKey(roundVector(item.normal))] || '#b78f62';
  var light = Math.max(0.72, Math.min(1, item.normalDepth * 0.24 + 0.8));
  return shadeHex(base, light);
}

function getGravityStickerFill(item) {
  var depth = Math.max(0.6, Math.min(1, item.normalDepth * 0.22 + 0.86));
  return rgbaFromHex(shadeHex('#7fe37b', depth), Math.min(0.78, item.faceAlpha + 0.22));
}

function getLockedStickerFill(item) {
  var depth = Math.max(0.62, Math.min(1, item.normalDepth * 0.2 + 0.84));
  return rgbaFromHex(shadeHex('#ef6a72', depth), Math.min(0.8, item.faceAlpha + 0.24));
}

function getGoalBoardPalette(item) {
  var base = FACE_COLORS[vectorKey(roundVector(item.normal))] || '#f1b55f';
  var light = Math.max(0.82, Math.min(1.08, item.normalDepth * 0.22 + 0.92));
  if (item.goalLocked) {
    var lockedLight = Math.max(0.78, Math.min(1.02, item.normalDepth * 0.12 + 0.86));
    return {
      underlay: 'rgba(70,78,92,0.2)',
      fill: shadeHex('#9aa3ad', lockedLight),
      stroke: 'rgba(55,62,74,0.78)',
      highlight: 'rgba(246,248,250,0.22)',
      innerStroke: 'rgba(244,248,252,0.34)',
    };
  }
  return {
    underlay: rgbaFromHex(base, 0.22),
    fill: shadeHex(base, light),
    stroke: shadeHex(base, 0.54),
    highlight: rgbaFromHex('#fff6d1', 0.42),
    innerStroke: rgbaFromHex(shadeHex(base, 0.55), 0.34),
  };
}

function getFaceAlpha(depth, normalDepth, layout) {
  var depthRatio = (depth + layout.maxDepth) / (layout.maxDepth * 2 || 1);
  var alpha = 0.18 + depthRatio * 0.27 + Math.max(0, normalDepth) * 0.18;
  return Math.max(0.16, Math.min(0.68, alpha));
}

function getStickerItems(state, canvasSize, turn) {
  var layout = getRubikLayout(canvasSize, state.size);
  var items = [];
  state.cubies.forEach(function (cubie) {
    cubie.stickers.forEach(function (sticker) {
      if (sticker.hidden && sticker.kind !== 'cat') return;
      var item = getStickerItem(cubie, sticker, turn, layout);
      if (item && item.visible) {
        item.gravityField = getActiveGravityFieldForPosition(state, cubie.position);
        item.lockedAxis = getActiveLockedAxisForPosition(state, cubie.position);
        items.push(item);
      }
    });
  });
  return items;
}

function getActiveGravityFieldForPosition(state, position) {
  if (!state || !state.gravityAxes || !position) return null;
  for (var i = 0; i < state.gravityAxes.length; i++) {
    var gravity = state.gravityAxes[i];
    if (!isRequiresButtonSatisfied(state, gravity)) continue;
    if (isPositionInsideGravityField(gravity, position)) {
      return gravity;
    }
  }
  return null;
}

function getActiveLockedAxisForPosition(state, position) {
  if (!state || !state.lockedAxes || !position) return null;
  for (var i = 0; i < state.lockedAxes.length; i++) {
    var lock = state.lockedAxes[i];
    if (isRequiresButtonSatisfied(state, lock)) continue;
    if (isPositionInsideLockedAxis(lock, position)) {
      return lock;
    }
  }
  return null;
}

function isPositionInsideLockedAxis(lock, position) {
  if (!lock || !position) return false;
  if (lock.layer == null) return true;
  return position[lock.axis] === lock.layer;
}

function isPositionInsideGravityField(gravity, position) {
  var fixed = gravity && gravity.fixed;
  if (!fixed) return false;
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

function getGoalItem(state, canvasSize) {
  if (!state.goal) return null;
  var item = getSlotItem(state.goal, canvasSize, 'goal', state.size, 0.34, true);
  if (item) {
    item.isBackSideGoal = item.normalDepth <= -0.42 || !item.visible;
    item.goalLocked = !isRequiresButtonSatisfied(state, state.goal);
  }
  return item;
}

function getWormholeItems(state, canvasSize) {
  var items = [];
  (state.wormholes || []).forEach(function (wormhole) {
    var revealAlpha = getMechanicRevealAlpha(state, wormhole);
    if (revealAlpha <= 0) return;
    [wormhole.from, wormhole.to].forEach(function (slot) {
      var item = getSlotItem(slot, canvasSize, 'wormhole', state.size, 0.32, true);
      if (item) {
        item.wormholeId = wormhole.id || '';
        item.revealAlpha = revealAlpha;
        items.push(item);
      }
    });
  });
  return items;
}

function getForcedTurnItems(state, canvasSize) {
  return (state.forcedTurns || [])
    .map(function (forcedTurn) {
      var revealAlpha = getMechanicRevealAlpha(state, forcedTurn);
      if (revealAlpha <= 0) return null;
      var item = getSlotItem(forcedTurn, canvasSize, 'forced', state.size, 0.34, true);
      if (!item || !forcedTurn.turn) return null;
      var turn = normalizeForcedTurn(forcedTurn);
      var turnedItem = getSlotItem(
        forcedTurn,
        canvasSize,
        'forced',
        state.size,
        0.34,
        true,
        {
          axis: turn.axis,
          layer: turn.layer,
          dir: turn.dir,
          progress: 1,
        },
      );
      item.slotKey = getSlotKey(forcedTurn);
      item.forcedTurnId = forcedTurn.id || '';
      item.revealAlpha = revealAlpha;
      item.arrowVector = turnedItem ? {
        x: turnedItem.center.x - item.center.x,
        y: turnedItem.center.y - item.center.y,
      } : null;
      return item;
    })
    .filter(Boolean);
}

function getPawButtonItems(state, canvasSize) {
  return (state.pawButtons || [])
    .map(function (button) {
      var active = !!(state.buttonStates && state.buttonStates[button.id || '']);
      var item = getSlotItem(button, canvasSize, 'paw-button', state.size, 0.24, true);
      if (!item) return null;
      item.slotKey = getSlotKey(button);
      item.buttonId = button.id || '';
      item.buttonActive = active;
      return item;
    })
    .filter(Boolean);
}

function getStickyItems(state, canvasSize) {
  return (state.stickyStickers || [])
    .map(function (sticky) {
      var item = getSlotItem(sticky, canvasSize, 'sticky', state.size, 0.33, true);
      if (!item) return null;
      item.slotKey = getSlotKey(sticky);
      return item;
    })
    .filter(Boolean);
}

function getGravityAxisItems(state, canvasSize) {
  var layout = getRubikLayout(canvasSize, state.size);
  return (state.gravityAxes || [])
    .filter(function (gravity) {
      return isRequiresButtonSatisfied(state, gravity);
    })
    .map(function (gravity) {
      var basis = AXIS_BASIS[gravity.axis] || AXIS_BASIS.y;
      var dir = gravity.dir == null || gravity.dir >= 0 ? 1 : -1;
      var coords = getCubeCoordValues(state.size);
      var line = getGravityAxisLine(gravity, coords);
      if (line) {
        var forceStart3d = dir < 0 ? line.maxPoint : line.minPoint;
        var forceEnd3d = dir < 0 ? line.minPoint : line.maxPoint;
        var nodes = coords.map(function (coord) {
          var point = clonePoint3d(line.minPoint);
          point[gravity.axis] = coord;
          return projectPoint(point, layout);
        });
        return {
          id: gravity.id || '',
          axis: gravity.axis,
          dir: dir,
          start: projectPoint(forceStart3d, layout),
          end: projectPoint(forceEnd3d, layout),
          nodes: nodes,
          sinkIndex: dir < 0 ? 0 : nodes.length - 1,
          vector: {
            x: basis.x * dir,
            y: basis.y * dir,
          },
        };
      }
      var offset = layout.unit * state.size * 1.05;
      return {
        id: gravity.id || '',
        axis: gravity.axis,
        dir: dir,
        center: {
          x: layout.center.x + basis.x * offset * dir,
          y: layout.center.y + basis.y * offset * dir,
        },
        vector: {
          x: basis.x * dir,
          y: basis.y * dir,
        },
      };
    });
}

function getGravityAxisLine(gravity, coords) {
  var fixed = gravity && gravity.fixed;
  if (!fixed) return null;
  var minPoint = { x: 0, y: 0, z: 0 };
  var maxPoint = { x: 0, y: 0, z: 0 };
  ['x', 'y', 'z'].forEach(function (axis) {
    if (axis === gravity.axis) {
      minPoint[axis] = coords[0];
      maxPoint[axis] = coords[coords.length - 1];
    } else {
      var value = fixed[axis] != null ? fixed[axis] : 0;
      minPoint[axis] = value;
      maxPoint[axis] = value;
    }
  });
  return {
    minPoint: minPoint,
    maxPoint: maxPoint,
  };
}

function getCubeCoordValues(size) {
  var cubeSize = Math.max(2, size || 2);
  var coords = [];
  var start = -(cubeSize - 1);
  for (var i = 0; i < cubeSize; i++) {
    coords.push(start + i * 2);
  }
  return coords;
}

function clonePoint3d(point) {
  return {
    x: point.x,
    y: point.y,
    z: point.z,
  };
}

function getLockedAxisItems(state, canvasSize) {
  var layout = getRubikLayout(canvasSize, state.size);
  return (state.lockedAxes || [])
    .filter(function (lock) {
      return !isRequiresButtonSatisfied(state, lock);
    })
    .map(function (lock) {
      var basis = AXIS_BASIS[lock.axis] || AXIS_BASIS.y;
      var layer = lock.layer == null ? 0 : lock.layer;
      var lineHalf = layout.unit * Math.max(1.2, state.size * 0.92);
      var center = {
        x: layout.center.x + basis.x * layout.unit * layer,
        y: layout.center.y + basis.y * layout.unit * layer,
      };
      var start = {
        x: center.x - basis.x * lineHalf,
        y: center.y - basis.y * lineHalf,
      };
      var end = {
        x: center.x + basis.x * lineHalf,
        y: center.y + basis.y * lineHalf,
      };
      var coords = getCubeCoordValues(state.size);
      var nodeCount = Math.max(1, coords.length - 1);
      var nodes = coords.map(function (_coord, index) {
        var t = coords.length === 1 ? 0.5 : index / nodeCount;
        return {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        };
      });
      return {
        id: lock.id || '',
        axis: lock.axis,
        layer: layer,
        center: center,
        start: start,
        end: end,
        nodes: nodes,
        vector: basis,
      };
    });
}

function getFoldDoorItems(state, canvasSize) {
  var items = [];
  (state.foldDoors || []).forEach(function (foldDoor) {
    var revealAlpha = getMechanicRevealAlpha(state, foldDoor);
    if (revealAlpha <= 0) return;
    var slots = [foldDoor.from || foldDoor];
    slots.forEach(function (slot) {
      var item = getSlotItem(slot, canvasSize, 'fold-door', state.size, 0.34, true);
      if (item) {
        item.foldDoorId = foldDoor.id || '';
        item.revealAlpha = revealAlpha;
        item.hingeAxis = foldDoor.hingeAxis || '';
        item.foldDir = foldDoor.dir == null ? 1 : foldDoor.dir;
        items.push(item);
      }
    });
  });
  return items;
}

function getWormholePairItems(state, canvasSize) {
  return (state.wormholes || [])
    .map(function (wormhole) {
      var revealAlpha = getMechanicRevealAlpha(state, wormhole);
      if (revealAlpha <= 0) return null;
      return {
        id: wormhole.id || '',
        revealAlpha: revealAlpha,
        fromItem: getSlotItem(wormhole.from, canvasSize, 'wormhole', state.size, 0.32, true),
        toItem: getSlotItem(wormhole.to, canvasSize, 'wormhole', state.size, 0.32, true),
      };
    })
    .filter(function (pair) {
      return pair && pair.fromItem && pair.toItem;
    });
}

function getFoldDoorPairItems(state, canvasSize) {
  return (state.foldDoors || [])
    .map(function (foldDoor) {
      if (!foldDoor.from || !foldDoor.to) return null;
      var revealAlpha = getMechanicRevealAlpha(state, foldDoor);
      if (revealAlpha <= 0) return null;
      return {
        id: foldDoor.id || '',
        revealAlpha: revealAlpha,
        fromItem: getSlotItem(foldDoor.from, canvasSize, 'fold-door', state.size, 0.34, true),
        toItem: getSlotItem(foldDoor.to, canvasSize, 'fold-door', state.size, 0.34, true),
      };
    })
    .filter(function (pair) {
      return pair && pair.fromItem && pair.toItem;
    });
}

function getSlotItem(slot, canvasSize, kind, size, lift, forceVisible, turn) {
  if (!slot) return null;
  var layout = getRubikLayout(canvasSize, size || 2);
  var fakeCubie = { id: kind || 'slot', position: slot.position };
  var fakeSticker = { kind: kind || 'slot', normal: slot.normal, lift: lift || 0 };
  var item = getStickerItem(fakeCubie, fakeSticker, turn || null, layout);
  if (!item || (!item.visible && !forceVisible)) return null;
  item.forceVisible = !!forceVisible && !item.visible;
  return item;
}

function getSlotKey(slot) {
  return vectorKey(slot.position) + '|' + vectorKey(slot.normal);
}

function normalizeForcedTurn(forcedTurn) {
  var axis = forcedTurn.turn.axis;
  return {
    axis: axis,
    layer: forcedTurn.turn.layer != null ? forcedTurn.turn.layer : forcedTurn.position[axis],
    dir: forcedTurn.turn.dir,
  };
}

function isRequiresButtonSatisfied(state, mechanic) {
  var requiresButton = mechanic && mechanic.requiresButton;
  if (!requiresButton) return true;
  var ids = Array.isArray(requiresButton) ? requiresButton : [requiresButton];
  for (var i = 0; i < ids.length; i++) {
    if (!state.buttonStates || !state.buttonStates[ids[i]]) return false;
  }
  return true;
}

function getMechanicRevealAlpha(state, mechanic) {
  var requiresButton = mechanic && mechanic.requiresButton;
  if (!requiresButton) return 1;
  var ids = Array.isArray(requiresButton) ? requiresButton : [requiresButton];
  var firstActivatedAt = null;
  for (var i = 0; i < ids.length; i++) {
    if (!state.buttonStates || !state.buttonStates[ids[i]]) return 0;
    var activatedAt = state.buttonActivatedAt && state.buttonActivatedAt[ids[i]];
    if (!firstActivatedAt || activatedAt < firstActivatedAt) {
      firstActivatedAt = activatedAt;
    }
  }
  if (!firstActivatedAt) return 1;
  return Math.max(0, Math.min(1, (Date.now() - firstActivatedAt) / 720));
}

function getStickerItem(cubie, sticker, turn, layout) {
  var corners = getStickerCorners(cubie.position, sticker.normal);
  if (sticker.lift) {
    corners = offsetCorners(corners, sticker.normal, sticker.lift);
  }
  var turnedCorners = corners.map(function (corner) {
    return getTurnedPoint(corner, cubie, turn);
  });
  var normal = getTurnedNormal(sticker.normal, cubie, turn);
  var normalDepth = dot(normalizeVector(normal), VIEW_VECTOR);
  var visible = normalDepth > -0.42 || sticker.kind === 'cat';
  var hitVisible = normalDepth > 0.05;
  var polygon = turnedCorners.map(function (corner) {
    return projectPoint(corner, layout);
  });
  var center = getPolygonCenter2d(polygon);
  var center3d = getPolygonCenter3d(turnedCorners);
  var depth = dot(center3d, VIEW_VECTOR);
  return {
    cubie: cubie,
    sticker: sticker,
    normal: normal,
    normalDepth: normalDepth,
    polygon: polygon,
    center: center,
    depth: depth,
    faceAlpha: getFaceAlpha(depth, normalDepth, layout),
    hitVisible: hitVisible,
    visible: visible,
    unit: layout.unit,
  };
}

function getTurnedPoint(point, cubie, turn) {
  if (!getIsCubieAffected(cubie, turn)) return point;
  return rotateVector(point, turn.axis, turn.dir * easeTurn(turn.progress) * Math.PI / 2);
}

function getTurnedNormal(normal, cubie, turn) {
  if (!getIsCubieAffected(cubie, turn)) return normal;
  return rotateVector(normal, turn.axis, turn.dir * easeTurn(turn.progress) * Math.PI / 2);
}

function getIsCubieAffected(cubie, turn) {
  return !!turn && cubie && cubie.position && cubie.position[turn.axis] === turn.layer;
}

function getStickerCorners(position, normal) {
  var x = position.x;
  var y = position.y;
  var z = position.z;
  var h = HALF_CUBIE;

  if (Math.abs(normal.x) > 0.5) {
    var px = x + normal.x * h;
    return [
      { x: px, y: y - h, z: z - h },
      { x: px, y: y + h, z: z - h },
      { x: px, y: y + h, z: z + h },
      { x: px, y: y - h, z: z + h },
    ];
  }

  if (Math.abs(normal.y) > 0.5) {
    var py = y + normal.y * h;
    return [
      { x: x - h, y: py, z: z - h },
      { x: x + h, y: py, z: z - h },
      { x: x + h, y: py, z: z + h },
      { x: x - h, y: py, z: z + h },
    ];
  }

  var pz = z + normal.z * h;
  return [
    { x: x - h, y: y - h, z: pz },
    { x: x + h, y: y - h, z: pz },
    { x: x + h, y: y + h, z: pz },
    { x: x - h, y: y + h, z: pz },
  ];
}

function getRubikLayout(canvasSize, size) {
  var width = canvasSize && canvasSize.width ? canvasSize.width : 375;
  var height = canvasSize && canvasSize.height ? canvasSize.height : 600;
  var cubeSize = Math.max(2, size || 2);
  var horizontalFactor = cubeSize === 4 ? 4.34 : 4.75;
  var verticalFactor = cubeSize === 4 ? 3.86 : 4.1;
  var verticalPadding = cubeSize === 4 ? 2.25 : 2.6;
  var unit = Math.min(
    width / (cubeSize * horizontalFactor),
    height / (cubeSize * verticalFactor + verticalPadding),
    46,
  );
  return {
    center: {
      x: width / 2,
      y: height * (cubeSize >= 5 ? 0.48 : 0.5),
    },
    unit: unit,
    size: cubeSize,
    maxDepth: cubeSize * Math.sqrt(3),
    guideRadius: unit * cubeSize * 1.68,
    shadowOffsetY: unit * cubeSize * 1.12,
    shadowRadiusX: unit * cubeSize * 1.5,
    shadowRadiusY: unit * cubeSize * 0.42,
  };
}

function projectPoint(point, layout) {
  return {
    x:
      layout.center.x +
      layout.unit * (point.x * AXIS_BASIS.x.x + point.y * AXIS_BASIS.y.x + point.z * AXIS_BASIS.z.x),
    y:
      layout.center.y +
      layout.unit * (point.x * AXIS_BASIS.x.y + point.y * AXIS_BASIS.y.y + point.z * AXIS_BASIS.z.y),
  };
}

function rotateVector(vector, axis, angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  if (axis === 'x') {
    return {
      x: vector.x,
      y: vector.y * cos - vector.z * sin,
      z: vector.y * sin + vector.z * cos,
    };
  }
  if (axis === 'y') {
    return {
      x: vector.x * cos + vector.z * sin,
      y: vector.y,
      z: -vector.x * sin + vector.z * cos,
    };
  }
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
    z: vector.z,
  };
}

function roundVector(vector) {
  return {
    x: Math.round(vector.x),
    y: Math.round(vector.y),
    z: Math.round(vector.z),
  };
}

function normalizeVector(vector) {
  var length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function easeTurn(t) {
  return easeInOutCubic(t);
}

function getPolygonCenter2d(points) {
  var total = points.reduce(function (acc, point) {
    acc.x += point.x;
    acc.y += point.y;
    return acc;
  }, { x: 0, y: 0 });
  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function getPolygonCenter3d(points) {
  var total = points.reduce(function (acc, point) {
    acc.x += point.x;
    acc.y += point.y;
    acc.z += point.z;
    return acc;
  }, { x: 0, y: 0, z: 0 });
  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function pointInPolygon(point, polygon) {
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i].x;
    var yi = polygon[i].y;
    var xj = polygon[j].x;
    var yj = polygon[j].y;
    var intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function tracePolygon(ctx, points) {
  ctx.beginPath();
  points.forEach(function (point, index) {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
}

function traceInsetPolygon(ctx, points, center, scale) {
  ctx.beginPath();
  points.forEach(function (point, index) {
    var x = center.x + (point.x - center.x) * scale;
    var y = center.y + (point.y - center.y) * scale;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
}

function shadeHex(hex, strength) {
  if (hex.indexOf('rgb(') === 0) return hex;
  var raw = hex.replace('#', '');
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  r = Math.max(0, Math.min(255, Math.round(r * strength)));
  g = Math.max(0, Math.min(255, Math.round(g * strength)));
  b = Math.max(0, Math.min(255, Math.round(b * strength)));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function rgbaFromHex(hex, alpha) {
  if (hex.indexOf('rgb(') === 0) {
    return hex.replace('rgb(', 'rgba(').replace(')', ',' + alpha + ')');
  }
  var raw = hex.replace('#', '');
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function easeOutCubic(t) {
  var d = 1 - Math.max(0, Math.min(1, t));
  return 1 - d * d * d;
}

function easeInOutCubic(t) {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
  t = Math.max(0, Math.min(1, t));
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function getRubikFaceNormals() {
  return FACE_NORMALS.slice();
}
