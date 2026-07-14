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
    eyeScaleY: 0.82,
    mouthOffsetY: 0,
    blink: false,
    eyeStyle: 'angry',
    mouthStyle: 'frown',
    angryMark: true,
  },
  proud: {
    id: 'proud',
    eyeScaleY: 0.62,
    mouthOffsetY: -1,
    blink: false,
    eyeStyle: 'side',
    mouthStyle: 'smirk',
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
  const equippedExpression = getEquippedExpression(options?.expressionId);
  const expression = options?.isDragging
    ? CAT_EXPRESSIONS.dragging
    : equippedExpression
      ? equippedExpression
    : isHovered
      ? CAT_EXPRESSIONS.happy
      : CAT_EXPRESSIONS.idle;
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

  renderCatIcon(
    ctx,
    gridSize,
    expression,
    t,
    lookOffset,
    options?.accessoryId,
  );

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
  renderBodyOutline(ctx);
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
  } else if (expression.id === 'surprised') {
    const pulse = Math.abs(Math.sin(t * 3.2));
    frame.eyeScaleY = 1.1 + pulse * 0.1;
    frame.mouthScaleX = 0.96 + pulse * 0.08;
    frame.mouthScaleY = 0.96 + pulse * 0.16;
    frame.effectAlpha = 0.72 + pulse * 0.28;
    frame.effectScale = 0.92 + pulse * 0.12;
    frame.effectOffsetY = -pulse * 1.4;
  } else if (expression.id === 'angry') {
    const jitter = Math.sin(t * 18);
    frame.browOffsetY = Math.sin(t * 10) * 0.7;
    frame.effectOffsetX = jitter * 0.75;
    frame.effectOffsetY = Math.cos(t * 15) * 0.55;
    frame.effectAlpha = 0.84 + Math.abs(jitter) * 0.16;
  } else if (expression.id === 'proud') {
    const glance = Math.sin(t * 1.8);
    frame.sideSquint = 0.55 + Math.sin(t * 2.3) * 0.045;
    frame.sideLook = glance * 1.6;
    frame.mouthOffsetY += Math.sin(t * 2.1) * 0.35;
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
  } else if (accessoryId === 'blue-cap') {
    renderPawHairpin(ctx);
  } else if (accessoryId === 'star-crown') {
    renderStarCrown(ctx);
  } else if (accessoryId === 'magic-hat') {
    renderNurseHat(ctx);
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
  ctx.roundRect?.(-18, -7, 36, 14, 7);
  if (!ctx.roundRect) {
    drawLocalRoundRect(ctx, -18, -7, 36, 14, 7);
  }
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
  ctx.roundRect?.(-3.5, -8, 7, 17, 2);
  if (!ctx.roundRect) {
    drawLocalRoundRect(ctx, -3.5, -8, 7, 17, 2);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect?.(-8.5, -3, 17, 7, 2);
  if (!ctx.roundRect) {
    drawLocalRoundRect(ctx, -8.5, -3, 17, 7, 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-10, -4, 5, 2, -0.4, 0, Math.PI * 2);
  ctx.fill();
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
  ctx.ellipse(0, 1, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(4 * direction, 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (direction < 0) {
    ctx.moveTo(-12, -16 + frame.browOffsetY);
    ctx.lineTo(12, -8 + frame.browOffsetY);
  } else {
    ctx.moveTo(-12, -8 + frame.browOffsetY);
    ctx.lineTo(12, -16 + frame.browOffsetY);
  }
  ctx.stroke();
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
  ctx.beginPath();
  ctx.moveTo(52, 99 + mouthOffsetY);
  ctx.quadraticCurveTo(64, 91 + mouthOffsetY, 76, 99 + mouthOffsetY);
  ctx.stroke();
  ctx.restore();
}

function renderSmirkMouth(ctx, mouthOffsetY) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(55, 94 + mouthOffsetY);
  ctx.quadraticCurveTo(66, 102 + mouthOffsetY, 80, 92 + mouthOffsetY);
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

  if (expression.id === 'joy') {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.strokeStyle = '#f7c84b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.translate(0, frame.effectOffsetY);
    traceSparkle(ctx, 20, 48, 6 * frame.effectScale);
    traceSparkle(ctx, 106, 47, 5 * frame.effectScale);
    ctx.stroke();
    ctx.restore();
  }

  if (expression.angryMark) {
    ctx.save();
    ctx.globalAlpha = frame.effectAlpha;
    ctx.strokeStyle = '#e4474e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.translate(frame.effectOffsetX, frame.effectOffsetY);
    ctx.beginPath();
    ctx.moveTo(102, 35);
    ctx.lineTo(112, 27);
    ctx.moveTo(108, 39);
    ctx.lineTo(116, 30);
    ctx.moveTo(106, 28);
    ctx.lineTo(115, 38);
    ctx.stroke();
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
