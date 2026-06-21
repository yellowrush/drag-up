// FlyWheel class - rotation physics system
// Migrated from original game's FlyWheel function

const TAU = Math.PI * 2

export class FlyWheel {
  constructor(props = {}) {
    this.angle = 0
    this.friction = 0.95
    this.velocity = 0
    
    // Apply props
    for (const prop in props) {
      this[prop] = props[prop]
    }
  }

  // Update physics integration
  integrate() {
    this.velocity *= this.friction
    this.angle += this.velocity
    this.normalizeAngle()
  }

  // Apply force to wheel
  applyForce(force) {
    this.velocity += force
  }

  // Normalize angle to 0-TAU range
  normalizeAngle() {
    this.angle = ((this.angle % TAU) + TAU) % TAU
  }

  // Set angle with smooth transition
  setAngle(theta) {
    let velo = theta - this.angle
    
    // Handle angle wrapping
    if (velo > TAU / 2) {
      velo -= TAU
    } else if (velo < -TAU / 2) {
      velo += TAU
    }
    
    const force = velo - this.velocity
    this.applyForce(force)
  }

  // Get current angle
  getAngle() {
    return this.angle
  }

  // Reset wheel state
  reset() {
    this.angle = 0
    this.velocity = 0
  }
}
