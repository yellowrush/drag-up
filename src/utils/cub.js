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
Cub.render = function (ctx, mazeCenter, gridSize, angle, isHovered) {
  const drawCircle = (x, y, radius) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  };

  const x = this.peg.x * gridSize + this.offset.x;
  const y = this.peg.y * gridSize + this.offset.y;

  ctx.save();
  ctx.translate(mazeCenter.x, mazeCenter.y);
  ctx.rotate(angle);
  ctx.translate(x, y);
  ctx.rotate(-angle);

  // Set cub color (purple)
  ctx.fillStyle = 'rgba(230,77,140,1)';

  // Scale up when hovered
  const scale = isHovered ? 1.15 : 1;
  ctx.scale(scale, scale);

  // Draw main body (circle)
  drawCircle(0, 0, gridSize * 0.6);

  // Draw ears (two smaller circles)
  drawCircle(gridSize * -0.45, gridSize * -0.35, gridSize * 0.3);
  drawCircle(gridSize * 0.45, gridSize * -0.35, gridSize * 0.3);

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
