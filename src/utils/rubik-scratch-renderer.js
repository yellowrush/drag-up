import { renderCubAvatar } from './cub.js';

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
  var queue = items.map(function (item) {
    return { type: 'sticker', item: item, order: 0 };
  });
  if (goalItem && !options.hideGoal) {
    queue.push({ type: 'goal', item: goalItem, order: 1 });
  }

  drawRubikStage(ctx, layout, state);
  drawExtendedCubeEdges(ctx, layout, state);
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

  if (state.interaction && !state.turn) {
    drawRubikTurnGuides(ctx, state.interaction, layout);
  }

  items.forEach(function (item) {
    if (item.sticker.kind === 'cat' && !options.hideCat) {
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
  interaction.candidates.forEach(function (candidate) {
    drawTurnGuideArrow(
      ctx,
      candidate,
      layout.unit,
      getIsSameTurn(candidate, interaction.activeTurn),
      interaction.ambiguous,
    );
  });
  ctx.restore();
}

function drawTurnGuideArrow(ctx, candidate, unit, active, ambiguous) {
  var length = candidate.length || vectorLength(candidate.vector);
  if (!length) return;
  var ux = candidate.vector.x / length;
  var uy = candidate.vector.y / length;
  var startOffset = unit * (active ? 0.34 : 0.42);
  var guideLength = Math.max(unit * 0.36, Math.min(unit * 0.78, length * 0.33));
  var sx = candidate.start.x + ux * startOffset;
  var sy = candidate.start.y + uy * startOffset;
  var ex = sx + ux * guideLength;
  var ey = sy + uy * guideLength;
  var alpha = active ? (ambiguous ? 0.72 : 0.92) : 0.19;
  var color = active
    ? ambiguous ? 'rgba(255,205,118,' + alpha + ')' : 'rgba(255,246,188,' + alpha + ')'
    : 'rgba(255,255,255,' + alpha + ')';
  var head = unit * (active ? 0.14 : 0.1);
  var angle = Math.atan2(uy, ux);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, unit * (active ? 0.045 : 0.028));
  ctx.shadowColor = active ? 'rgba(255,226,150,0.38)' : 'transparent';
  ctx.shadowBlur = active ? unit * 0.08 : 0;
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
  ctx.strokeStyle = item.sticker.kind === 'cat'
    ? 'rgba(255,255,255,0.92)'
    : 'rgba(71,45,32,0.68)';
  ctx.lineWidth = item.sticker.kind === 'cat'
    ? Math.max(2, item.unit * 0.035)
    : Math.max(1, item.unit * 0.022);
  tracePolygon(ctx, item.polygon);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = item.sticker.kind === 'cat'
    ? 'rgba(255,240,184,0.56)'
    : 'rgba(255,244,208,0.18)';
  ctx.lineWidth = Math.max(1, item.unit * 0.012);
  traceInsetPolygon(ctx, item.polygon, item.center, 0.88);
  ctx.stroke();
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
  ctx.globalAlpha = Math.min(1, item.faceAlpha + 0.26) * alpha;
  ctx.fillStyle = palette.underlay;
  traceRoundedPolygon(ctx, getInsetPolygon(item.polygon, item.center, 0.84), Math.max(3, item.unit * 0.09));
  ctx.fill();

  ctx.shadowColor = 'rgba(0,0,0,0.24)';
  ctx.shadowBlur = item.unit * 0.09;
  ctx.shadowOffsetY = item.unit * 0.03;
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

function getGoalBoardPalette(item) {
  var base = FACE_COLORS[vectorKey(roundVector(item.normal))] || '#f1b55f';
  var light = Math.max(0.82, Math.min(1.08, item.normalDepth * 0.22 + 0.92));
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
      var item = getStickerItem(cubie, sticker, turn, layout);
      if (item && item.visible) {
        items.push(item);
      }
    });
  });
  return items;
}

function getGoalItem(state, canvasSize) {
  if (!state.goal) return null;
  var layout = getRubikLayout(canvasSize, state.size);
  var fakeCubie = { id: 'goal', position: state.goal.position };
  var fakeSticker = { kind: 'goal', normal: state.goal.normal, lift: 0.34 };
  var item = getStickerItem(fakeCubie, fakeSticker, null, layout);
  return item && item.visible ? item : null;
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
  var unit = Math.min(
    width / (cubeSize * 4.75),
    height / (cubeSize * 4.1 + 2.6),
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
  t = Math.max(0, Math.min(1, t || 0));
  return 1 - Math.pow(1 - t, 3);
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

function easeOutBack(t) {
  t = Math.max(0, Math.min(1, t));
  var c1 = 1.70158;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function getRubikFaceNormals() {
  return FACE_NORMALS.slice();
}
