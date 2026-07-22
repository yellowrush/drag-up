// Cub class - the player character (cat)
// Migrated from original game's cub object

export const Cub = {
  peg: null,
  offset: { x: 0, y: 0 },
  noon: null,
  three: null,
  six: null,
  nine: null,
};

// Orientation transformers for peg positions
const pegOrienter = {
  noon: (peg) => ({ ...peg }),
  three: (peg) => ({ x: peg.y, y: -peg.x }),
  six: (peg) => ({ x: -peg.x, y: -peg.y }),
  nine: (peg) => ({ x: -peg.y, y: peg.x }),
};

// Orientation transformers for offsets
const offsetOrienter = {
  noon: (offset) => ({ ...offset }),
  three: (offset) => ({ x: offset.y, y: -offset.x }),
  six: (offset) => ({ x: -offset.x, y: -offset.y }),
  nine: (offset) => ({ x: -offset.y, y: offset.x }),
};

const CAT_FACE = {
  fur: '#1b1b1b',
  outline: '#ffffff',
  innerEar: '#f4b0b7',
  eye: '#ffffff',
  pupil: '#111111',
  nose: '#f4b0b7',
  shadow: 'rgba(0,0,0,0.1)',
};

const ROUND_EYE_RADIUS = 17;
const ROUND_PUPIL_RADIUS = 8;
const ROUND_PUPIL_REST_X = 0;
const ROUND_PUPIL_LOOK_MAX_OFFSET = 7;
const ROUND_PUPIL_MAX_CENTER_DISTANCE =
  ROUND_EYE_RADIUS - ROUND_PUPIL_RADIUS - 0.5;

const CAT_EXPRESSIONS = {
  idle: {
    id: 'idle',
    eyeScaleY: 1,
    mouthOffsetY: 0,
    blink: true,
    rightEyeClosed: false,
    mouthOpen: false,
  },
  happy: {
    id: 'happy',
    eyeScaleY: 0.96,
    mouthOffsetY: -1.2,
    blink: true,
    rightEyeClosed: false,
    mouthOpen: false,
  },
  dragging: {
    id: 'dragging',
    eyeScaleY: 1,
    mouthOffsetY: -1.2,
    blink: false,
    rightEyeClosed: true,
    mouthOpen: true,
  },
  sleepy: {
    id: 'sleepy',
    eyeScaleY: 0.18,
    mouthOffsetY: -1,
    blink: false,
    eyeStyle: 'closed',
    mouthStyle: 'smile',
  },
  joy: {
    id: 'joy',
    eyeScaleY: 1.08,
    mouthOffsetY: -2,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'smile',
    cheek: true,
  },
  'night-spark': {
    id: 'night-spark',
    eyeScaleY: 1.12,
    mouthOffsetY: -1.4,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'smile',
    cheek: true,
    fuzzyFur: true,
  },
  surprised: {
    id: 'surprised',
    eyeScaleY: 1.15,
    mouthOffsetY: 0,
    blink: false,
    eyeStyle: 'wide',
    mouthStyle: 'o',
  },
  angry: {
    id: 'angry',
    eyeScaleY: 0.92,
    mouthOffsetY: 0,
    blink: false,
    eyeStyle: 'angry',
    mouthStyle: 'tiny-frown',
    angryMark: true,
    cheek: true,
  },
  'round-blue-smile': {
    id: 'round-blue-smile',
    eyeScaleY: 1.05,
    mouthOffsetY: -0.8,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'tongue',
    cheek: true,
    blueRoundFace: true,
  },
  proud: {
    id: 'proud',
    eyeScaleY: 1.05,
    mouthOffsetY: -1.2,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'proud-smile',
    proudSparkle: true,
    cheek: true,
  },
  wink: {
    id: 'wink',
    eyeScaleY: 1,
    mouthOffsetY: -1.4,
    blink: false,
    rightEyeClosed: true,
    mouthStyle: 'smile',
    cheek: true,
  },
  'sparkle-eyes': {
    id: 'sparkle-eyes',
    eyeScaleY: 1.1,
    mouthOffsetY: -1.4,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'smile',
    cheek: true,
    proudSparkle: true,
  },
  'friend-heart': {
    id: 'friend-heart',
    eyeScaleY: 1.02,
    mouthOffsetY: -1.4,
    blink: false,
    eyeStyle: 'round',
    mouthStyle: 'smile',
    cheek: true,
    heart: true,
  },
};

// Set cub's peg position
Cub.setPeg = function (peg, orientation) {
  const transformedPeg = pegOrienter[orientation](peg);
  this.peg = transformedPeg;

  this.noon = { x: transformedPeg.x, y: transformedPeg.y };
  this.three = { x: -transformedPeg.y, y: transformedPeg.x };
  this.six = { x: -transformedPeg.x, y: -transformedPeg.y };
  this.nine = { x: transformedPeg.y, y: -transformedPeg.x };
};

// Set cub's offset from peg
Cub.setOffset = function (offset, orientation) {
  this.offset = offsetOrienter[orientation](offset);
};

// Render cub on canvas
Cub.render = function (ctx, mazeCenter, gridSize, angle, isHovered, options) {
  const x = this.peg.x * gridSize + this.offset.x;
  const y = this.peg.y * gridSize + this.offset.y;
  const t = Date.now() / 1000;
  const cubCenter = getCubScreenCenter(mazeCenter, x, y, angle);
  const lookOffset = getLookOffset(options?.lookTarget, cubCenter, gridSize);

  ctx.save();
  ctx.translate(mazeCenter.x, mazeCenter.y);
  ctx.rotate(angle);
  ctx.translate(x, y);
  ctx.rotate(-angle);

  const breathe = Math.sin(t * 4) * 0.012;
  const hoverPulse = isHovered ? Math.sin(t * 8) * 0.018 : 0;
  const scale = 0.88 + breathe + (isHovered ? 0.12 : 0) + hoverPulse;
  ctx.translate(0, isHovered ? Math.sin(t * 6) * gridSize * 0.025 : 0);
  ctx.scale(scale, scale);

  renderCubAvatar(ctx, gridSize, {
    accessoryId: options?.accessoryId,
    expressionId: options?.expressionId,
    isDragging: options?.isDragging,
    isHovered: isHovered,
    lookOffset: lookOffset,
    time: t,
  });

  ctx.restore();
};

// Reset cub state
Cub.reset = function () {
  this.peg = null;
  this.offset = { x: 0, y: 0 };
  this.noon = null;
  this.three = null;
  this.six = null;
  this.nine = null;
};

export function renderCubAvatar(ctx, gridSize, options = {}) {
  const t = options.time || Date.now() / 1000;
  const equippedExpression = getEquippedExpression(options.expressionId);
  const expression = options.isDragging
    ? CAT_EXPRESSIONS.dragging
    : equippedExpression
      ? equippedExpression
      : options.isHovered
        ? CAT_EXPRESSIONS.happy
        : CAT_EXPRESSIONS.idle;

  renderCatIcon(
    ctx,
    gridSize,
    expression,
    t,
    options.lookOffset || { x: 0, y: 0 },
    options.accessoryId,
  );
}

function renderCatIcon(ctx, gridSize, expression, t, lookOffset, accessoryId) {
  const scale = gridSize / 58;
  const frame = getExpressionFrame(expression, t);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-64, -72);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  renderShadow(ctx);
  renderEars(ctx);
  renderHead(ctx);
  renderExpressionCoat(ctx, expression, frame);
  renderBodyOutline(ctx);
  renderExpressionFur(ctx, expression, frame);
  renderEyes(ctx, expression, lookOffset, frame);
  renderNoseAndMouth(ctx, expression, frame);
  renderExpressionEffects(ctx, expression, frame);
  renderAccessory(ctx, accessoryId);

  ctx.restore();
}

function getEquippedExpression(expressionId) {
  return CAT_EXPRESSIONS[expressionId] || null;
}

function getExpressionFrame(expression, t) {
  const frame = {
    eyeScaleY:
      expression.blink && Math.sin(t * 3.1) > 0.965
        ? 0.12
        : expression.eyeScaleY,
    eyeOffsetY: 0,
    pupilOffsetX: 0,
    pupilOffsetY: 0,
    closedCurveY: 7,
    mouthOffsetY: expression.mouthOffsetY,
    mouthScaleX: 1,
    mouthScaleY: 1,
    cheekAlpha: 0.72,
    effectAlpha: 1,
    effectScale: 1,
    effectOffsetX: 0,
    effectOffsetY: 0,
    browOffsetY: 0,
    sideSquint: 0.62,
    sideLook: 0,
  };

  if (expression.id === 'sleepy') {
    const sway = Math.sin(t * 1.45);
    frame.eyeOffsetY = sway * 0.8;
    frame.closedCurveY = 6.4 + Math.sin(t * 1.45 + 0.7) * 1.1;
    frame.mouthOffsetY += Math.sin(t * 1.25) * 0.45;
  } else if (expression.id === 'joy') {
    const bounce = Math.sin(t * 5.2);
    frame.eyeScaleY = Math.sin(t * 2.65) > 0.975 ? 0.18 : 1.08 + bounce * 0.04;
    frame.pupilOffsetY = -0.4 + bounce * 0.35;
    frame.mouthOffsetY += bounce * 0.35;
    frame.cheekAlpha = 0.56 + (Math.sin(t * 4.4) + 1) * 0.14;
    frame.effectScale = 0.88 + (Math.sin(t * 4.8) + 1) * 0.14;
    frame.effectOffsetY = Math.sin(t * 4.8) * 1.1;
  } else if (expression.id === 'night-spark') {
    const glint = Math.sin(t * 4.7);
    frame.eyeScaleY = 1.08 + glint * 0.035;
    frame.pupilOffsetY = -0.25 + glint * 0.2;
    frame.mouthOffsetY += Math.sin(t * 3.1) * 0.25;
    frame.cheekAlpha = 0.34 + (glint + 1) * 0.08;
    frame.effectScale = 0.88 + (Math.sin(t * 5.2) + 1) * 0.11;
    frame.effectOffsetY = Math.sin(t * 3.6) * 1.2;
  } else if (expression.id === 'surprised') {
    const pulse = Math.abs(Math.sin(t * 3.2));
    frame.eyeScaleY = 1.1 + pulse * 0.1;
    frame.mouthScaleX = 0.96 + pulse * 0.08;
    frame.mouthScaleY = 0.96 + pulse * 0.16;
    frame.effectAlpha = 0.72 + pulse * 0.28;
    frame.effectScale = 0.92 + pulse * 0.12;
    frame.effectOffsetY = -pulse * 1.4;
  } else if (expression.id === 'angry') {
    const simmer = Math.sin(t * 5.8);
    frame.browOffsetY = simmer * 0.45;
    frame.pupilOffsetX = simmer * 0.3;
    frame.effectOffsetX = Math.sin(t * 8) * 0.35;
    frame.effectOffsetY = Math.cos(t * 7) * 0.35;
    frame.effectAlpha = 0.82 + Math.abs(simmer) * 0.12;
    frame.cheekAlpha = 0.48 + Math.abs(simmer) * 0.12;
  } else if (expression.id === 'round-blue-smile') {
    const bounce = Math.sin(t * 4.1);
    frame.eyeScaleY = 1.04 + bounce * 0.035;
    frame.pupilOffsetY = -0.25 + bounce * 0.2;
    frame.mouthScaleY = 0.98 + Math.abs(bounce) * 0.08;
    frame.mouthOffsetY += bounce * 0.2;
    frame.cheekAlpha = 0.6 + (bounce + 1) * 0.1;
    frame.effectScale = 0.9 + (Math.sin(t * 4.5) + 1) * 0.1;
    frame.effectOffsetY = Math.sin(t * 3.3) * 1;
  } else if (expression.id === 'proud') {
    const bounce = Math.sin(t * 5.4);
    frame.mouthScaleX = 1.02 + Math.abs(bounce) * 0.04;
    frame.mouthScaleY = 1.06 + Math.abs(bounce) * 0.08;
    frame.mouthOffsetY += bounce * 0.24;
    frame.cheekAlpha = 0.58 + (bounce + 1) * 0.12;
    frame.effectScale = 0.92 + (Math.sin(t * 4.2) + 1) * 0.1;
    frame.effectOffsetX = Math.sin(t * 2.8) * 1.2;
    frame.effectOffsetY = Math.sin(t * 3.3) * 0.9;
  } else if (expression.id === 'wink') {
    const pop = Math.sin(t * 4.2);
    frame.pupilOffsetY = pop * 0.2;
    frame.mouthOffsetY += pop * 0.28;
    frame.cheekAlpha = 0.6 + (pop + 1) * 0.08;
    frame.effectScale = 0.92 + (Math.sin(t * 4.6) + 1) * 0.12;
  } else if (expression.id === 'sparkle-eyes') {
    const shine = Math.sin(t * 5);
    frame.eyeScaleY = 1.06 + shine * 0.035;
    frame.pupilOffsetY = -0.3 + shine * 0.25;
    frame.effectScale = 0.9 + (Math.sin(t * 4.8) + 1) * 0.12;
    frame.effectOffsetY = Math.sin(t * 4.8) * 1;
  } else if (expression.id === 'friend-heart') {
    const float = Math.sin(t * 3.5);
    frame.mouthOffsetY += float * 0.22;
    frame.cheekAlpha = 0.62 + (float + 1) * 0.12;
    frame.effectScale = 0.9 + (Math.sin(t * 4) + 1) * 0.12;
    frame.effectOffsetY = Math.sin(t * 3.2) * 1.1;
  }

  return frame;
}

function renderShadow(ctx) {
  ctx.save();
  ctx.fillStyle = CAT_FACE.shadow;
  ctx.beginPath();
  ctx.ellipse(64, 126, 42, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderEars(ctx) {
  ctx.save();

  ctx.strokeStyle = CAT_FACE.outline;
  ctx.fillStyle = CAT_FACE.fur;
  ctx.lineWidth = 7;

  traceLeftEar(ctx);
  ctx.stroke();
  traceRightEar(ctx);
  ctx.stroke();

  traceLeftEar(ctx);
  ctx.fill();
  traceRightEar(ctx);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.innerEar;
  ctx.beginPath();
  ctx.moveTo(31, 43);
  ctx.quadraticCurveTo(34, 25, 39, 16);
  ctx.quadraticCurveTo(46, 26, 47, 43);
  ctx.lineTo(31, 43);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(97, 43);
  ctx.quadraticCurveTo(94, 25, 89, 16);
  ctx.quadraticCurveTo(82, 26, 81, 43);
  ctx.lineTo(97, 43);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function renderHead(ctx) {
  ctx.save();

  ctx.strokeStyle = CAT_FACE.outline;
  ctx.fillStyle = CAT_FACE.fur;
  ctx.lineWidth = 7;

  traceHead(ctx);
  ctx.stroke();
  traceHead(ctx);
  ctx.fill();

  ctx.restore();
}

function renderExpressionCoat(ctx, expression, frame) {
  if (!expression.blueRoundFace) return;

  ctx.save();
  ctx.translate(0, frame.effectOffsetY * 0.18);

  ctx.fillStyle = '#4aa3ff';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 5;
  traceHead(ctx);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(64, 82, 35, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4aa3ff';
  ctx.beginPath();
  ctx.ellipse(64, 114, 32, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.beginPath();
  ctx.ellipse(49, 48, 9, 4, -0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function traceLeftEar(ctx) {
  ctx.beginPath();
  ctx.moveTo(24, 49);
  ctx.quadraticCurveTo(29, 19, 38, 6);
  ctx.quadraticCurveTo(51, 14, 53, 45);
  ctx.lineTo(24, 49);
  ctx.closePath();
}

function traceRightEar(ctx) {
  ctx.beginPath();
  ctx.moveTo(104, 49);
  ctx.quadraticCurveTo(99, 19, 90, 6);
  ctx.quadraticCurveTo(77, 14, 75, 45);
  ctx.lineTo(104, 49);
  ctx.closePath();
}

function traceHead(ctx) {
  ctx.beginPath();
  ctx.moveTo(64, 34);
  ctx.bezierCurveTo(92, 34, 108, 55, 111, 73);
  ctx.quadraticCurveTo(113, 76, 112, 79);
  ctx.lineTo(123, 76);
  ctx.lineTo(114, 84);
  ctx.lineTo(126, 86);
  ctx.lineTo(114, 91);
  ctx.lineTo(123, 98);
  ctx.lineTo(110, 97);
  ctx.bezierCurveTo(105, 112, 88, 119, 64, 119);
  ctx.bezierCurveTo(40, 119, 23, 112, 18, 97);
  ctx.lineTo(5, 98);
  ctx.lineTo(14, 91);
  ctx.lineTo(2, 86);
  ctx.lineTo(14, 84);
  ctx.lineTo(5, 76);
  ctx.lineTo(16, 79);
  ctx.quadraticCurveTo(15, 76, 17, 73);
  ctx.bezierCurveTo(20, 55, 36, 34, 64, 34);
  ctx.closePath();
}

function renderBodyOutline(ctx) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 113);
  ctx.quadraticCurveTo(64, 128, 98, 113);
  ctx.stroke();
  ctx.restore();
}

function renderAccessory(ctx, accessoryId) {
  if (accessoryId === 'red-bow') {
    renderRedBow(ctx);
  } else if (accessoryId === 'gold-bell') {
    renderGoldBell(ctx);
  } else if (accessoryId === 'pixel-gamepad-pin') {
    renderPixelGamepadPin(ctx);
  } else if (accessoryId === 'blue-cap') {
    renderPawHairpin(ctx);
  } else if (accessoryId === 'blue-collar-bell') {
    renderBlueCollarBell(ctx);
  } else if (accessoryId === 'star-crown') {
    renderStarCrown(ctx);
  } else if (accessoryId === 'patrol-cap') {
    renderPatrolCap(ctx);
  } else if (accessoryId === 'magic-hat') {
    renderNurseHat(ctx);
  } else if (accessoryId === 'lucky-scarf') {
    renderLuckyScarf(ctx);
  } else if (accessoryId === 'box-medal') {
    renderBoxMedal(ctx);
  } else if (accessoryId === 'yarn-pompom') {
    renderYarnPompom(ctx);
  }
}

function renderRedBow(ctx) {
  ctx.save();
  ctx.translate(39, 43);
  ctx.rotate(-0.22);
  ctx.fillStyle = '#e84b5f';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-2, 1);
  ctx.bezierCurveTo(-23, -13, -28, 13, -4, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.bezierCurveTo(29, -13, 32, 13, 9, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#b82f46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 4);
  ctx.quadraticCurveTo(-16, 3, -20, 8);
  ctx.moveTo(16, 4);
  ctx.quadraticCurveTo(22, 3, 25, 8);
  ctx.stroke();
  ctx.fillStyle = '#ffcad1';
  ctx.beginPath();
  ctx.arc(3, 5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd7de';
  ctx.beginPath();
  ctx.ellipse(-10, -2, 4, 2, -0.3, 0, Math.PI * 2);
  ctx.ellipse(16, -2, 4, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderGoldBell(ctx) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#f25d6a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(42, 112);
  ctx.quadraticCurveTo(64, 122, 86, 112);
  ctx.stroke();
  ctx.strokeStyle = '#ffd7de';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(45, 113);
  ctx.quadraticCurveTo(64, 120, 83, 113);
  ctx.stroke();

  ctx.fillStyle = '#f7c84b';
  ctx.strokeStyle = '#8c5b12';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(64, 117, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.beginPath();
  ctx.ellipse(60, 113, 3, 2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(57, 114);
  ctx.lineTo(71, 114);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(55, 118);
  ctx.quadraticCurveTo(64, 121, 73, 118);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(64, 122, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#8c5b12';
  ctx.fill();
  ctx.restore();
}

function renderPawHairpin(ctx) {
  ctx.save();
  ctx.translate(92, 51);
  ctx.rotate(0.34);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3.2;
  ctx.fillStyle = '#8ec5ff';
  ctx.beginPath();
  drawLocalRoundRect(ctx, -18, -7, 36, 14, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d9f0ff';
  ctx.beginPath();
  ctx.ellipse(-6, -3, 8, 2.6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd6df';
  ctx.strokeStyle = '#7f4f64';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(4, 1, 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  [
    { x: -2, y: -3, r: 2.1 },
    { x: 3, y: -5, r: 2.2 },
    { x: 8, y: -3, r: 2.1 },
    { x: 10, y: 2, r: 2 },
  ].forEach(function (pad) {
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawLocalRoundRect(ctx, x, y, w, h, radius) {
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawLocalStar(ctx, x, y, radius) {
  var innerRadius = radius * 0.46;
  ctx.beginPath();
  for (var i = 0; i < 10; i++) {
    var angle = -Math.PI / 2 + (Math.PI * i) / 5;
    var r = i % 2 === 0 ? radius : innerRadius;
    var px = x + Math.cos(angle) * r;
    var py = y + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function renderStarCrown(ctx) {
  ctx.save();
  ctx.fillStyle = '#ffd95c';
  ctx.strokeStyle = '#8d6418';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(36, 47);
  ctx.lineTo(44, 25);
  ctx.quadraticCurveTo(50, 35, 57, 43);
  ctx.lineTo(64, 20);
  ctx.lineTo(71, 43);
  ctx.quadraticCurveTo(78, 35, 84, 25);
  ctx.lineTo(92, 47);
  ctx.quadraticCurveTo(64, 56, 36, 47);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff1a5';
  ctx.beginPath();
  ctx.ellipse(64, 48, 19, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7fa0';
  [44, 64, 84].forEach(function (x) {
    ctx.beginPath();
    ctx.arc(x, x === 64 ? 28 : 31, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(60, 27, 1.4, 0, Math.PI * 2);
  ctx.arc(80, 31, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderNurseHat(ctx) {
  ctx.save();
  ctx.translate(64, 40);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3.5;
  ctx.fillStyle = '#fff8f8';
  ctx.beginPath();
  ctx.moveTo(-26, 6);
  ctx.quadraticCurveTo(-17, -18, 0, -12);
  ctx.quadraticCurveTo(17, -18, 26, 6);
  ctx.quadraticCurveTo(9, 14, -26, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffdfe6';
  ctx.beginPath();
  ctx.ellipse(0, 6, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e6a3b0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-21, 5);
  ctx.quadraticCurveTo(2, 11, 22, 5);
  ctx.stroke();
  ctx.fillStyle = '#e4474e';
  ctx.beginPath();
  drawLocalRoundRect(ctx, -3.5, -8, 7, 17, 2);
  ctx.fill();
  ctx.beginPath();
  drawLocalRoundRect(ctx, -8.5, -3, 17, 7, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-10, -4, 5, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderExpressionFur(ctx, expression, frame) {
  if (!expression.fuzzyFur) return;

  ctx.save();
  ctx.translate(frame.effectOffsetX * 0.35, frame.effectOffsetY * 0.25);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.fillStyle = CAT_FACE.fur;
  ctx.lineWidth = 3.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  [
    { points: [[43, 38], [47, 24], [52, 39]] },
    { points: [[53, 36], [57, 21], [62, 38]] },
    { points: [[63, 36], [67, 20], [72, 38]] },
    { points: [[73, 38], [79, 24], [82, 41]] },
    { points: [[24, 62], [10, 56], [24, 72]] },
    { points: [[23, 76], [9, 78], [25, 85]] },
    { points: [[104, 62], [118, 56], [104, 72]] },
    { points: [[105, 76], [119, 78], [103, 85]] },
    { points: [[37, 113], [27, 123], [47, 118]] },
    { points: [[91, 113], [101, 123], [81, 118]] },
  ].forEach(function (spike) {
    ctx.beginPath();
    ctx.moveTo(spike.points[0][0], spike.points[0][1]);
    ctx.lineTo(spike.points[1][0], spike.points[1][1]);
    ctx.lineTo(spike.points[2][0], spike.points[2][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 1.6;
  [
    { x1: 20, y1: 63, x2: 12, y2: 59 },
    { x1: 21, y1: 78, x2: 12, y2: 79 },
    { x1: 108, y1: 63, x2: 116, y2: 59 },
    { x1: 107, y1: 78, x2: 116, y2: 79 },
  ].forEach(function (line) {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  });

  ctx.restore();
}

function renderLuckyScarf(ctx) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#78c7a2';
  ctx.beginPath();
  ctx.ellipse(64, 110, 31, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#5cb68f';
  ctx.beginPath();
  ctx.moveTo(78, 111);
  ctx.quadraticCurveTo(92, 121, 86, 137);
  ctx.quadraticCurveTo(78, 134, 74, 118);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#e8fff4';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(49, 107);
  ctx.lineTo(80, 113);
  ctx.moveTo(82, 120);
  ctx.lineTo(79, 132);
  ctx.stroke();
  ctx.restore();
}

function renderBoxMedal(ctx) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.6;
  ctx.fillStyle = '#e84b5f';
  ctx.beginPath();
  ctx.moveTo(55, 104);
  ctx.lineTo(64, 119);
  ctx.lineTo(73, 104);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd95c';
  ctx.strokeStyle = '#8d6418';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(64, 121, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff1a5';
  ctx.beginPath();
  ctx.arc(60, 117, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8d6418';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(58, 123);
  ctx.lineTo(70, 123);
  ctx.stroke();
  ctx.restore();
}

function renderYarnPompom(ctx) {
  ctx.save();
  ctx.translate(93, 50);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.4;
  ctx.fillStyle = '#ff9fc2';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  for (var i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3.2, (Math.PI * i) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd0e0';
  ctx.beginPath();
  ctx.arc(-3, -3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderPixelGamepadPin(ctx) {
  ctx.save();
  ctx.translate(35, 52);
  ctx.rotate(-0.32);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.6;
  ctx.fillStyle = '#5865ff';
  ctx.beginPath();
  drawLocalRoundRect(ctx, -18, -8, 36, 16, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#7ef0b4';
  ctx.beginPath();
  drawLocalRoundRect(ctx, -13, -3, 10, 6, 1.8);
  ctx.fill();
  ctx.fillStyle = '#ffe46e';
  ctx.fillRect(-11, -6, 2.8, 12);
  ctx.fillRect(-15.5, -1.5, 12, 2.8);

  [
    { x: 7, y: -3, color: '#ff7fa0' },
    { x: 12, y: 2, color: '#7ee8ff' },
  ].forEach(function (button) {
    ctx.fillStyle = button.color;
    ctx.beginPath();
    ctx.arc(button.x, button.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-2, -5, 6, 2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderBlueCollarBell(ctx) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(38, 110);
  ctx.quadraticCurveTo(64, 124, 90, 110);
  ctx.stroke();

  ctx.strokeStyle = '#2d7cff';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(40, 110);
  ctx.quadraticCurveTo(64, 121, 88, 110);
  ctx.stroke();

  ctx.fillStyle = '#f7c84b';
  ctx.strokeStyle = '#8c5b12';
  ctx.lineWidth = 2.7;
  ctx.beginPath();
  ctx.arc(64, 118, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.beginPath();
  ctx.ellipse(60, 113, 3.6, 2.3, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8c5b12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(55, 115);
  ctx.lineTo(73, 115);
  ctx.moveTo(54, 119);
  ctx.quadraticCurveTo(64, 122.5, 74, 119);
  ctx.stroke();
  ctx.fillStyle = '#8c5b12';
  ctx.beginPath();
  ctx.arc(64, 124, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderPatrolCap(ctx) {
  ctx.save();
  ctx.translate(64, 42);
  ctx.rotate(-0.08);
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3.2;
  ctx.fillStyle = '#315aa6';
  ctx.beginPath();
  ctx.moveTo(-29, 5);
  ctx.quadraticCurveTo(-19, -16, 0, -18);
  ctx.quadraticCurveTo(20, -16, 29, 5);
  ctx.quadraticCurveTo(5, 14, -29, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#23447d';
  ctx.beginPath();
  ctx.ellipse(4, 7, 26, 7, 0.02, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd95c';
  ctx.strokeStyle = '#8d6418';
  ctx.lineWidth = 1.8;
  drawLocalStar(ctx, 0, -5, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-20, 4);
  ctx.quadraticCurveTo(0, 10, 22, 4);
  ctx.stroke();
  ctx.restore();
}

function getCubScreenCenter(mazeCenter, x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: mazeCenter.x + x * cos - y * sin,
    y: mazeCenter.y + x * sin + y * cos,
  };
}

function getLookOffset(lookTarget, cubCenter, gridSize) {
  if (!lookTarget) {
    return { x: 0, y: 0 };
  }

  const dx = lookTarget.x - cubCenter.x;
  const dy = lookTarget.y - cubCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (!distance) {
    return { x: 0, y: 0 };
  }

  const maxOffset = ROUND_PUPIL_LOOK_MAX_OFFSET;
  const strength = Math.min(1, distance / (gridSize * 1.4));
  return {
    x: (dx / distance) * maxOffset * strength,
    y: (dy / distance) * maxOffset * strength,
  };
}

function renderEyes(ctx, expression, lookOffset, frame) {
  if (expression.eyeStyle === 'closed') {
    renderClosedEye(ctx, 43, 74 + frame.eyeOffsetY, frame.closedCurveY);
    renderClosedEye(ctx, 85, 74 + frame.eyeOffsetY, frame.closedCurveY);
    return;
  }

  if (expression.eyeStyle === 'angry') {
    renderAngryEye(ctx, 43, 74, -1, frame);
    renderAngryEye(ctx, 85, 74, 1, frame);
    return;
  }

  if (expression.eyeStyle === 'side') {
    renderSideEye(ctx, 43, 74, -1, frame);
    renderSideEye(ctx, 85, 74, 1, frame);
    return;
  }

  if (expression.eyeStyle === 'proud') {
    renderProudWinkEye(ctx, 43, 74, frame);
    renderProudOpenEye(ctx, 85, 74, frame);
    return;
  }

  if (expression.eyeStyle === 'proud-happy') {
    renderProudHappyEye(ctx, 43, 74, frame);
    renderProudHappyEye(ctx, 85, 74, frame);
    return;
  }

  const animatedLookOffset = {
    x: lookOffset.x + frame.pupilOffsetX,
    y: lookOffset.y + frame.pupilOffsetY,
  };
  renderEye(ctx, 43, 74 + frame.eyeOffsetY, frame.eyeScaleY, animatedLookOffset);
  if (expression.rightEyeClosed) {
    renderClosedEye(ctx, 85, 74 + frame.eyeOffsetY, frame.closedCurveY);
  } else {
    renderEye(ctx, 85, 74 + frame.eyeOffsetY, frame.eyeScaleY, animatedLookOffset);
  }
}

function renderEye(ctx, x, y, scaleY, lookOffset) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, scaleY);

  ctx.fillStyle = CAT_FACE.eye;
  ctx.beginPath();
  ctx.arc(0, 0, ROUND_EYE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  const pupilCenter = constrainRoundPupilCenter({
    x: ROUND_PUPIL_REST_X + lookOffset.x,
    y: lookOffset.y,
  });

  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(
    pupilCenter.x,
    pupilCenter.y,
    ROUND_PUPIL_RADIUS,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.restore();
}

function constrainRoundPupilCenter(center) {
  const distance = Math.sqrt(center.x * center.x + center.y * center.y);
  if (distance <= ROUND_PUPIL_MAX_CENTER_DISTANCE || !distance) {
    return center;
  }

  const scale = ROUND_PUPIL_MAX_CENTER_DISTANCE / distance;
  return {
    x: center.x * scale,
    y: center.y * scale,
  };
}

function renderAngryEye(ctx, x, y, direction, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = CAT_FACE.eye;
  ctx.beginPath();
  ctx.ellipse(0, 1, 17, 15, direction * -0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(-6.4 * direction - frame.pupilOffsetX * direction * 0.5, 0.2, 7.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.fur;
  ctx.beginPath();
  if (direction < 0) {
    ctx.moveTo(-19, -15 + frame.browOffsetY);
    ctx.quadraticCurveTo(-2, -13 + frame.browOffsetY, 17, -5 + frame.browOffsetY);
    ctx.lineTo(17, -21);
    ctx.lineTo(-19, -21);
  } else {
    ctx.moveTo(-17, -5 + frame.browOffsetY);
    ctx.quadraticCurveTo(2, -13 + frame.browOffsetY, 19, -15 + frame.browOffsetY);
    ctx.lineTo(19, -21);
    ctx.lineTo(-17, -21);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ee8b73';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (direction < 0) {
    ctx.moveTo(-2, -15 + frame.browOffsetY);
    ctx.lineTo(12, -8 + frame.browOffsetY);
    ctx.moveTo(16, -15 + frame.browOffsetY);
    ctx.lineTo(19, -8 + frame.browOffsetY);
  } else {
    ctx.moveTo(2, -15 + frame.browOffsetY);
    ctx.lineTo(-12, -8 + frame.browOffsetY);
    ctx.moveTo(-16, -15 + frame.browOffsetY);
    ctx.lineTo(-19, -8 + frame.browOffsetY);
  }
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(direction < 0 ? 0 : -5, -6, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderSideEye(ctx, x, y, direction, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, frame.sideSquint);
  ctx.fillStyle = CAT_FACE.eye;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(7 * direction + frame.sideLook, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderClosedEye(ctx, x, y, curveY) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.eye;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 1);
  ctx.quadraticCurveTo(x, y + curveY, x + 10, y + 1);
  ctx.stroke();
  ctx.restore();
}

function renderNoseAndMouth(ctx, expression, frame) {
  const mouthOffsetY = frame.mouthOffsetY;
  ctx.save();

  if (expression.mouthStyle === 'tiny-frown') {
    renderAngryKittenMouth(ctx, mouthOffsetY);
    ctx.restore();
    return;
  }

  ctx.fillStyle = CAT_FACE.nose;
  ctx.beginPath();
  ctx.moveTo(58, 84);
  ctx.quadraticCurveTo(64, 79, 70, 84);
  ctx.quadraticCurveTo(64, 91, 58, 84);
  ctx.fill();

  if (expression.mouthStyle === 'o') {
    renderOMouth(ctx, frame);
    ctx.restore();
    return;
  }

  if (expression.mouthStyle === 'tongue') {
    renderTongueMouth(ctx, frame);
    ctx.restore();
    return;
  }

  if (expression.mouthStyle === 'proud-smile') {
    renderProudSmileMouth(ctx, frame);
    ctx.restore();
    return;
  }

  if (expression.mouthStyle === 'frown') {
    renderFrownMouth(ctx, mouthOffsetY);
    ctx.restore();
    return;
  }

  if (expression.mouthStyle === 'smirk') {
    renderSmirkMouth(ctx, mouthOffsetY);
    ctx.restore();
    return;
  }

  if (expression.mouthOpen) {
    renderOpenMouth(ctx);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 90 + mouthOffsetY);
  ctx.quadraticCurveTo(58, 98 + mouthOffsetY, 52, 92 + mouthOffsetY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(64, 90 + mouthOffsetY);
  ctx.quadraticCurveTo(70, 98 + mouthOffsetY, 76, 92 + mouthOffsetY);
  ctx.stroke();

  ctx.restore();
}

function renderOMouth(ctx, frame) {
  ctx.save();
  ctx.translate(64, 103);
  ctx.scale(frame.mouthScaleX, frame.mouthScaleY);
  ctx.fillStyle = '#111111';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function renderFrownMouth(ctx, mouthOffsetY) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.fillStyle = '#241214';
  ctx.beginPath();
  ctx.ellipse(64, 101 + mouthOffsetY, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4b0b7';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(48, 96 + mouthOffsetY, 5, 3, -0.1, 0, Math.PI * 2);
  ctx.ellipse(80, 96 + mouthOffsetY, 5, 3, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(57, 108 + mouthOffsetY);
  ctx.quadraticCurveTo(64, 104 + mouthOffsetY, 71, 108 + mouthOffsetY);
  ctx.stroke();
  ctx.restore();
}

function renderProudHappyEye(ctx, x, y, frame) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.eye;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 2);
  ctx.quadraticCurveTo(x, y - 9 - frame.effectScale * 0.7, x + 13, y + 2);
  ctx.stroke();

  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 7);
  ctx.quadraticCurveTo(x, y - 12, x + 8, y - 7);
  ctx.stroke();
  ctx.restore();
}

function renderTongueMouth(ctx, frame) {
  ctx.save();
  ctx.translate(64, 100 + frame.mouthOffsetY);
  ctx.scale(frame.mouthScaleX, frame.mouthScaleY);

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.7;
  ctx.beginPath();
  ctx.ellipse(0, 1, 8.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff7f8e';
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.quadraticCurveTo(0, 13, 5, 2);
  ctx.quadraticCurveTo(0, 6, -5, 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(0, 10);
  ctx.stroke();
  ctx.restore();
}

function renderProudSmileMouth(ctx, frame) {
  ctx.save();
  ctx.translate(64, 97 + frame.mouthOffsetY);
  ctx.scale(frame.mouthScaleX, frame.mouthScaleY);

  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(0, 2);
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(-6, 9, -13, 2);
  ctx.moveTo(0, 2);
  ctx.quadraticCurveTo(6, 9, 13, 2);
  ctx.stroke();

  ctx.fillStyle = '#ff7f8e';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 7);
  ctx.quadraticCurveTo(0, 17, 6, 7);
  ctx.quadraticCurveTo(0, 11, -6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function renderTinyFrownMouth(ctx, mouthOffsetY) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(64, 91 + mouthOffsetY);
  ctx.lineTo(64, 96 + mouthOffsetY);
  ctx.moveTo(64, 96 + mouthOffsetY);
  ctx.quadraticCurveTo(59, 91 + mouthOffsetY, 54, 96 + mouthOffsetY);
  ctx.moveTo(64, 96 + mouthOffsetY);
  ctx.quadraticCurveTo(69, 91 + mouthOffsetY, 74, 96 + mouthOffsetY);
  ctx.stroke();
  ctx.restore();
}

function renderAngryKittenMouth(ctx, mouthOffsetY) {
  ctx.save();
  ctx.fillStyle = '#ee9a8f';
  ctx.beginPath();
  ctx.moveTo(61, 88.5 + mouthOffsetY);
  ctx.lineTo(67, 88.5 + mouthOffsetY);
  ctx.quadraticCurveTo(69.5, 88.5 + mouthOffsetY, 69.5, 91 + mouthOffsetY);
  ctx.quadraticCurveTo(69.5, 93.5 + mouthOffsetY, 67, 93.5 + mouthOffsetY);
  ctx.lineTo(61, 93.5 + mouthOffsetY);
  ctx.quadraticCurveTo(58.5, 93.5 + mouthOffsetY, 58.5, 91 + mouthOffsetY);
  ctx.quadraticCurveTo(58.5, 88.5 + mouthOffsetY, 61, 88.5 + mouthOffsetY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#5a1c16';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(51, 105 + mouthOffsetY);
  ctx.quadraticCurveTo(64, 91 + mouthOffsetY, 77, 105 + mouthOffsetY);
  ctx.quadraticCurveTo(64, 98 + mouthOffsetY, 51, 105 + mouthOffsetY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#2b0907';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(54, 103 + mouthOffsetY);
  ctx.quadraticCurveTo(64, 95 + mouthOffsetY, 74, 103 + mouthOffsetY);
  ctx.stroke();
  ctx.restore();
}

function renderProudWinkEye(ctx, x, y, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = CAT_FACE.eye;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 1);
  ctx.quadraticCurveTo(0, -8 - frame.effectScale, 12, 1);
  ctx.stroke();
  ctx.restore();
}

function renderProudOpenEye(ctx, x, y, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = CAT_FACE.eye;
  ctx.beginPath();
  ctx.ellipse(0, -1, 16, 17, 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(2 + frame.pupilOffsetY * 0.8, 0 + frame.pupilOffsetY, 7.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(-4, -7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderSmirkMouth(ctx, mouthOffsetY) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(55, 94 + mouthOffsetY);
  ctx.quadraticCurveTo(66, 101 + mouthOffsetY, 79, 94 + mouthOffsetY);
  ctx.quadraticCurveTo(73, 99 + mouthOffsetY, 67, 99 + mouthOffsetY);
  ctx.stroke();
  ctx.restore();
}

function renderExpressionEffects(ctx, expression, frame) {
  if (expression.cheek) {
    ctx.save();
    ctx.fillStyle = `rgba(244, 140, 155, ${frame.cheekAlpha})`;
    ctx.beginPath();
    ctx.ellipse(31, 91, 8, 4, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(97, 91, 8, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (expression.id === 'joy' || expression.id === 'sparkle-eyes') {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.strokeStyle = '#f7c84b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.translate(0, frame.effectOffsetY);
    traceSparkle(ctx, 20, 48, 6 * frame.effectScale);
    traceSparkle(ctx, 106, 47, 5 * frame.effectScale);
    if (expression.id === 'sparkle-eyes') {
      traceSparkle(ctx, 43, 61, 4.5 * frame.effectScale);
      traceSparkle(ctx, 85, 61, 4.5 * frame.effectScale);
    }
    ctx.stroke();
    ctx.restore();
  }

  if (expression.angryMark) {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.translate(frame.effectOffsetX, frame.effectOffsetY);
    drawAngerIcon(ctx, 112, 42, 20 * frame.effectScale);
    ctx.restore();
  }

  if (expression.speedLines) {
    ctx.save();
    ctx.globalAlpha = 0.72 + Math.sin(Date.now() / 180) * 0.12;
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.translate(frame.effectOffsetX * 0.3, 0);
    ctx.beginPath();
    ctx.moveTo(7, 54);
    ctx.lineTo(-8, 54);
    ctx.moveTo(11, 66);
    ctx.lineTo(-10, 66);
    ctx.moveTo(14, 78);
    ctx.lineTo(-4, 78);
    ctx.stroke();
    ctx.restore();
  }

  if (expression.proudSparkle || expression.id === 'wink') {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.strokeStyle = expression.id === 'wink' ? '#ffffff' : '#ffd95c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.translate(0, frame.effectOffsetY);
    if (expression.id === 'proud') {
      traceSparkle(ctx, 18, 42, 4.5 * frame.effectScale);
      traceSparkle(ctx, 29, 55, 3.8 * frame.effectScale);
      traceSparkle(ctx, 23, 76, 3.2 * frame.effectScale);
      traceSparkle(ctx, 97, 40, 5.4 * frame.effectScale);
      traceSparkle(ctx, 113, 54, 4.6 * frame.effectScale);
      traceSparkle(ctx, 103, 72, 3.5 * frame.effectScale);
      traceSparkle(ctx, 119, 78, 2.8 * frame.effectScale);
    } else {
      traceSparkle(ctx, 105, 50, 5.5 * frame.effectScale);
    }
    if (expression.id === 'wink') {
      traceSparkle(ctx, 23, 52, 4.5 * frame.effectScale);
    }
    ctx.stroke();
    ctx.restore();
  }

  if (expression.id === 'night-spark') {
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 220) * 0.12;
    ctx.strokeStyle = '#7ee8ff';
    ctx.fillStyle = 'rgba(126,232,255,0.24)';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.translate(0, frame.effectOffsetY);
    traceSparkle(ctx, 24, 50, 4.5 * frame.effectScale);
    traceSparkle(ctx, 103, 53, 4.2 * frame.effectScale);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(110, 38, 7.5 * frame.effectScale, -0.8, 1.6);
    ctx.arc(114, 36, 7.2 * frame.effectScale, 1.7, -0.55, true);
    ctx.fill();
    ctx.restore();
  }

  if (expression.id === 'round-blue-smile') {
    ctx.save();
    ctx.globalAlpha = 0.54 + Math.sin(Date.now() / 260) * 0.12;
    ctx.strokeStyle = '#8ed6ff';
    ctx.fillStyle = 'rgba(142,214,255,0.18)';
    ctx.lineWidth = 2;
    ctx.translate(0, frame.effectOffsetY);
    [
      { x: 20, y: 53, r: 5 },
      { x: 108, y: 50, r: 4.5 },
      { x: 104, y: 104, r: 3.5 },
    ].forEach(function (bubble) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r * frame.effectScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  if (expression.heart) {
    ctx.save();
    ctx.globalAlpha = frame.cheekAlpha;
    ctx.fillStyle = '#ff8ca6';
    ctx.translate(0, frame.effectOffsetY);
    drawTinyHeart(ctx, 23, 52, 5.5 * frame.effectScale);
    drawTinyHeart(ctx, 105, 51, 5 * frame.effectScale);
    ctx.restore();
  }

  if (expression.id === 'surprised') {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.strokeStyle = '#f7a72c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.translate(0, frame.effectOffsetY);
    const surpriseReach = 17 * frame.effectScale;
    ctx.beginPath();
    ctx.moveTo(108, 41);
    ctx.lineTo(114, 41 - surpriseReach);
    ctx.moveTo(115, 51);
    ctx.lineTo(121, 47 - (frame.effectScale - 1) * 4);
    ctx.stroke();
    ctx.restore();
  }
}

function traceSparkle(ctx, x, y, size) {
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
}

function drawTinyHeart(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.7);
  ctx.bezierCurveTo(x - size * 1.4, y - size * 0.1, x - size * 0.7, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.7, y - size, x + size * 1.4, y - size * 0.1, x, y + size * 0.7);
  ctx.fill();
}

function drawAngerIcon(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  drawAngerIconStroke(ctx, size, '#7b2c2f', size * 0.16);
  drawAngerIconStroke(ctx, size, '#e4474e', size * 0.11);
  ctx.restore();
}

function drawAngerIconStroke(ctx, size, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(-size * 0.28, -size * 0.62);
  ctx.quadraticCurveTo(-size * 0.12, -size * 0.05, -size * 0.6, size * 0.12);
  ctx.moveTo(size * 0.32, -size * 0.58);
  ctx.quadraticCurveTo(size * 0.12, -size * 0.02, size * 0.58, size * 0.16);
  ctx.moveTo(-size * 0.46, size * 0.68);
  ctx.quadraticCurveTo(0, size * 0.32, size * 0.46, size * 0.68);
  ctx.stroke();
}

function renderOpenMouth(ctx) {
  ctx.save();

  ctx.fillStyle = '#111111';
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(64, 104, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e75b67';
  ctx.beginPath();
  ctx.ellipse(64, 109, 5, 3, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
