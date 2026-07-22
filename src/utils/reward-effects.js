export function renderRewardSuccessBurst(ctx, center, radius, t, options) {
  if (!ctx || !center) return;
  options = options || {};
  var key = getRewardEffectKey(options.accessoryId, options.expressionId);
  if (!key) return;

  ctx.save();
  ctx.translate(center.x || 0, center.y || 0);
  if (key === 'hearts') {
    renderHeartBurst(ctx, radius, t);
  } else if (key === 'bell') {
    renderBellRings(ctx, radius, t);
  } else if (key === 'ribbon' || key === 'scarf') {
    renderRibbonSwirls(ctx, radius, t, key === 'scarf' ? '#78c7a2' : '#f25d6a');
  } else if (key === 'paw') {
    renderPawSparkles(ctx, radius, t);
  } else if (key === 'crown' || key === 'sparkle' || key === 'proud') {
    renderStarBurst(ctx, radius, t);
  } else if (key === 'cross') {
    renderCrossSparkles(ctx, radius, t);
  } else if (key === 'medal') {
    renderMedalGlow(ctx, radius, t);
  } else if (key === 'yarn') {
    renderYarnLoops(ctx, radius, t);
  } else if (key === 'steam') {
    renderSteamPuffs(ctx, radius, t);
  } else if (key === 'wink') {
    renderWinkPop(ctx, radius, t);
  } else if (key === 'pixel') {
    renderPixelConfetti(ctx, radius, t);
  } else if (key === 'badge') {
    renderBadgeGlints(ctx, radius, t);
  } else if (key === 'moon') {
    renderMoonGlints(ctx, radius, t);
  } else if (key === 'bubble') {
    renderBubblePop(ctx, radius, t);
  }
  ctx.restore();
}

function getRewardEffectKey(accessoryId, expressionId) {
  if (expressionId === 'friend-heart') return 'hearts';
  if (expressionId === 'night-spark') return 'moon';
  if (expressionId === 'round-blue-smile') return 'bubble';
  if (accessoryId === 'red-bow') return 'ribbon';
  if (accessoryId === 'gold-bell') return 'bell';
  if (accessoryId === 'blue-collar-bell') return 'bell';
  if (accessoryId === 'pixel-gamepad-pin') return 'pixel';
  if (accessoryId === 'patrol-cap') return 'badge';
  if (accessoryId === 'blue-cap') return 'paw';
  if (accessoryId === 'star-crown') return 'crown';
  if (accessoryId === 'magic-hat') return 'cross';
  if (accessoryId === 'lucky-scarf') return 'scarf';
  if (accessoryId === 'box-medal') return 'medal';
  if (accessoryId === 'yarn-pompom') return 'yarn';
  if (expressionId === 'angry') return 'steam';
  if (expressionId === 'proud' || expressionId === 'sparkle-eyes') return 'sparkle';
  if (expressionId === 'wink') return 'wink';
  return '';
}

function renderHeartBurst(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.88);
  for (var i = 0; i < 7; i++) {
    var angle = -Math.PI * 0.9 + i * Math.PI * 0.3;
    var distance = radius * (0.25 + ease * (0.52 + (i % 2) * 0.12));
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle + Math.PI / 2);
    drawHeart(ctx, 0, 0, radius * (0.08 + (i % 3) * 0.01), i % 2 ? '#ff8ca6' : '#ffd0db');
    ctx.restore();
  }
}

function renderBellRings(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.strokeStyle = '#ffd95c';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.lineCap = 'round';
  [-1, 1].forEach(function (side) {
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(side * radius * 0.2, -radius * 0.06, radius * (0.34 + ease * 0.36 + i * 0.13), -0.55, 0.55);
      ctx.stroke();
    }
  });
}

function renderRibbonSwirls(ctx, radius, t, color) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.82);
  ctx.lineWidth = Math.max(2, radius * 0.04);
  ctx.lineCap = 'round';
  for (var i = 0; i < 8; i++) {
    var angle = (Math.PI * 2 * i) / 8 + t * Math.PI * 0.8;
    var distance = radius * (0.18 + ease * 0.58);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle);
    ctx.strokeStyle = i % 2 ? '#fff0b8' : color;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.08, 0);
    ctx.quadraticCurveTo(0, -radius * 0.09, radius * 0.09, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function renderPawSparkles(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t);
  for (var i = 0; i < 6; i++) {
    var angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    var distance = radius * (0.22 + ease * 0.56);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle + Math.PI / 2);
    drawTinyPaw(ctx, radius * 0.07);
    ctx.restore();
  }
}

function renderStarBurst(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
  for (var i = 0; i < 9; i++) {
    var angle = (Math.PI * 2 * i) / 9 - Math.PI / 2;
    var distance = radius * (0.22 + ease * 0.62);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle + t * Math.PI);
    drawSpark(ctx, radius * (0.07 + (i % 2) * 0.025), i % 2 ? '#fff4b8' : '#ffd95c');
    ctx.restore();
  }
}

function renderCrossSparkles(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t);
  ctx.lineCap = 'round';
  for (var i = 0; i < 6; i++) {
    var angle = (Math.PI * 2 * i) / 6;
    var distance = radius * (0.2 + ease * 0.58);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.strokeStyle = i % 2 ? '#ffdfe6' : '#e4474e';
    ctx.lineWidth = Math.max(2, radius * 0.035);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.07, 0);
    ctx.lineTo(radius * 0.07, 0);
    ctx.moveTo(0, -radius * 0.07);
    ctx.lineTo(0, radius * 0.07);
    ctx.stroke();
    ctx.restore();
  }
}

function renderMedalGlow(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.85);
  ctx.strokeStyle = '#ffe8af';
  ctx.lineWidth = Math.max(2, radius * 0.04);
  for (var i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.28 + ease * 0.45 + i * 0.1), 0, Math.PI * 2);
    ctx.stroke();
  }
  renderStarBurst(ctx, radius * 0.85, t);
}

function renderYarnLoops(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.8);
  ctx.strokeStyle = '#ff9fc2';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  for (var i = 0; i < 5; i++) {
    var angle = (Math.PI * 2 * i) / 5 + t * Math.PI;
    var distance = radius * (0.18 + ease * 0.52);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.13, radius * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function renderSteamPuffs(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
  ctx.fillStyle = 'rgba(255, 218, 206, 0.82)';
  for (var i = 0; i < 5; i++) {
    var x = (i - 2) * radius * 0.13;
    var y = -radius * (0.35 + ease * (0.28 + i * 0.025));
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.055 + (i % 2) * 0.018), 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderWinkPop(ctx, radius, t) {
  renderStarBurst(ctx, radius, t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.86);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(radius * 0.28, -radius * 0.36);
  ctx.quadraticCurveTo(radius * 0.4, -radius * 0.28, radius * 0.52, -radius * 0.36);
  ctx.stroke();
}

function renderPixelConfetti(ctx, radius, t) {
  var ease = easeOutCubic(t);
  var colors = ['#5865ff', '#7ef0b4', '#ffe46e', '#ff7fa0'];
  ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
  for (var i = 0; i < 10; i++) {
    var angle = (Math.PI * 2 * i) / 10 + t * 0.7;
    var distance = radius * (0.18 + ease * (0.48 + (i % 3) * 0.06));
    var size = radius * (0.045 + (i % 2) * 0.012);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle + t * Math.PI);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

function renderBadgeGlints(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.88);
  ctx.strokeStyle = '#ffd95c';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.lineCap = 'round';
  for (var i = 0; i < 6; i++) {
    var angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    var distance = radius * (0.2 + ease * 0.58);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    ctx.rotate(angle);
    drawSpark(ctx, radius * 0.075, i % 2 ? '#fff4b8' : '#ffd95c');
    ctx.restore();
  }
  ctx.strokeStyle = '#8ed6ff';
  ctx.beginPath();
  ctx.arc(0, 0, radius * (0.24 + ease * 0.38), 0, Math.PI * 2);
  ctx.stroke();
}

function renderMoonGlints(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
  ctx.fillStyle = 'rgba(126,232,255,0.28)';
  ctx.strokeStyle = '#7ee8ff';
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.beginPath();
  ctx.arc(radius * 0.12, -radius * 0.12, radius * (0.16 + ease * 0.08), -0.9, 1.7);
  ctx.arc(radius * 0.2, -radius * 0.15, radius * (0.16 + ease * 0.08), 1.8, -0.6, true);
  ctx.fill();
  for (var i = 0; i < 6; i++) {
    var angle = (Math.PI * 2 * i) / 6 + t;
    var distance = radius * (0.22 + ease * 0.52);
    ctx.save();
    ctx.translate(Math.cos(angle) * distance, Math.sin(angle) * distance);
    drawSpark(ctx, radius * 0.055, i % 2 ? '#ffffff' : '#7ee8ff');
    ctx.restore();
  }
}

function renderBubblePop(ctx, radius, t) {
  var ease = easeOutCubic(t);
  ctx.globalAlpha = Math.max(0, 1 - t * 0.86);
  ctx.strokeStyle = '#8ed6ff';
  ctx.fillStyle = 'rgba(142,214,255,0.16)';
  ctx.lineWidth = Math.max(2, radius * 0.028);
  for (var i = 0; i < 8; i++) {
    var angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    var distance = radius * (0.18 + ease * 0.54);
    var size = radius * (0.055 + (i % 3) * 0.018);
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawHeart(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.82);
  ctx.bezierCurveTo(x - size * 1.6, y - size * 0.18, x - size * 0.86, y - size * 1.18, x, y - size * 0.48);
  ctx.bezierCurveTo(x + size * 0.86, y - size * 1.18, x + size * 1.6, y - size * 0.18, x, y + size * 0.82);
  ctx.fill();
}

function drawTinyPaw(ctx, size) {
  ctx.fillStyle = '#7b4b21';
  fillEllipse(ctx, 0, size * 0.35, size * 0.55, size * 0.5);
  fillEllipse(ctx, -size * 0.72, -size * 0.12, size * 0.28, size * 0.35);
  fillEllipse(ctx, -size * 0.2, -size * 0.52, size * 0.3, size * 0.38);
  fillEllipse(ctx, size * 0.34, -size * 0.52, size * 0.3, size * 0.38);
  fillEllipse(ctx, size * 0.86, -size * 0.12, size * 0.28, size * 0.35);
}

function drawSpark(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.32);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.stroke();
}

function fillEllipse(ctx, x, y, radiusX, radiusY) {
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function easeOutCubic(t) {
  var d = 1 - t;
  return 1 - d * d * d;
}
