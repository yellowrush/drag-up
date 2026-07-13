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

const CAT_EXPRESSIONS = {
  idle: {
    eyeScaleY: 1,
    mouthOffsetY: 0,
    blink: true,
    rightEyeClosed: false,
    mouthOpen: false,
  },
  happy: {
    eyeScaleY: 0.96,
    mouthOffsetY: -1.2,
    blink: true,
    rightEyeClosed: false,
    mouthOpen: false,
  },
  dragging: {
    eyeScaleY: 1,
    mouthOffsetY: -1.2,
    blink: false,
    rightEyeClosed: true,
    mouthOpen: true,
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
  const expression = options?.isDragging
    ? CAT_EXPRESSIONS.dragging
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

  renderCatIcon(ctx, gridSize, expression, t, lookOffset);

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

function renderCatIcon(ctx, gridSize, expression, t, lookOffset) {
  const scale = gridSize / 58;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-64, -72);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  renderShadow(ctx);
  renderEars(ctx);
  renderHead(ctx);
  renderBodyOutline(ctx);
  renderEyes(ctx, expression, t, lookOffset);
  renderNoseAndMouth(ctx, expression);

  ctx.restore();
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

  const maxOffset = 5;
  const strength = Math.min(1, distance / (gridSize * 1.4));
  return {
    x: (dx / distance) * maxOffset * strength,
    y: (dy / distance) * maxOffset * strength,
  };
}

function renderEyes(ctx, expression, t, lookOffset) {
  const blink = expression.blink && Math.sin(t * 3.1) > 0.965;
  const eyeScaleY = blink ? 0.12 : expression.eyeScaleY;

  renderEye(ctx, 43, 74, eyeScaleY, lookOffset);
  if (expression.rightEyeClosed) {
    renderClosedEye(ctx, 85, 74);
  } else {
    renderEye(ctx, 85, 74, eyeScaleY, lookOffset);
  }
}

function renderEye(ctx, x, y, scaleY, lookOffset) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, scaleY);

  ctx.fillStyle = CAT_FACE.eye;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CAT_FACE.pupil;
  ctx.beginPath();
  ctx.arc(6 + lookOffset.x, lookOffset.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderClosedEye(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = CAT_FACE.eye;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 1);
  ctx.quadraticCurveTo(x, y + 7, x + 10, y + 1);
  ctx.stroke();
  ctx.restore();
}

function renderNoseAndMouth(ctx, expression) {
  const mouthOffsetY = expression.mouthOffsetY;

  ctx.save();
  ctx.fillStyle = CAT_FACE.nose;
  ctx.beginPath();
  ctx.moveTo(58, 84);
  ctx.quadraticCurveTo(64, 79, 70, 84);
  ctx.quadraticCurveTo(64, 91, 58, 84);
  ctx.fill();

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
