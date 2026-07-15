import { GameEngine } from './game-engine.js';
import { GameStorage } from './storage.js';
import { LEVEL_MAP, LEVELS } from './levels-data.js';
import { RubikScratchEngine } from './rubik-scratch-engine.js';
import {
  RUBIK_SCRATCH_LEVEL_MAP,
  RUBIK_SCRATCH_LEVELS,
} from './rubik-scratch-levels.js';

export class PlayEngine {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.canvasSize = { width: 0, height: 0 };
    this._canvasLeft = 0;
    this._canvasTop = 0;
    this._touchHitOffsetY = 0;
    this.engineKind = '';
    this.engine = null;
    this.equippedAccessoryId = '';
    this.equippedExpressionId = '';

    this.onLevelComplete = null;
    this.onLevelLoad = null;
    this.onInstructionChange = null;
  }

  get maze() {
    return this.engine && this.engine.maze
      ? this.engine.maze
      : { id: '', instruction: '' };
  }

  get canvasLeft() {
    return this._canvasLeft;
  }

  set canvasLeft(value) {
    this._canvasLeft = value || 0;
    if (this.engine) this.engine.canvasLeft = this._canvasLeft;
  }

  get canvasTop() {
    return this._canvasTop;
  }

  set canvasTop(value) {
    this._canvasTop = value || 0;
    if (this.engine) this.engine.canvasTop = this._canvasTop;
  }

  get touchHitOffsetY() {
    return this._touchHitOffsetY;
  }

  set touchHitOffsetY(value) {
    this._touchHitOffsetY = value || 0;
    if (this.engine) this.engine.touchHitOffsetY = this._touchHitOffsetY;
  }

  setupCanvas(width, height) {
    this.canvasSize.width = width;
    this.canvasSize.height = height;
    if (!this.engine) return;
    this.syncEngineSurface();
    this.engine.setupCanvas(width, height);
  }

  loadCurrentLevel() {
    var currentLevelId = GameStorage.getCurrentLevel();
    if (RUBIK_SCRATCH_LEVEL_MAP[currentLevelId]) {
      this.loadLevel(currentLevelId);
      return;
    }
    if (LEVEL_MAP[currentLevelId]) {
      this.loadLevel(currentLevelId);
      return;
    }
    this.loadLevel(LEVELS[0].id);
  }

  loadLevel(levelId) {
    if (RUBIK_SCRATCH_LEVEL_MAP[levelId]) {
      this.ensureEngine('scratch');
      this.engine.loadLevel(levelId);
      return;
    }
    if (!LEVEL_MAP[levelId]) {
      levelId = LEVELS[0].id;
    }
    this.ensureEngine('box');
    this.engine.loadLevel(levelId);
  }

  ensureEngine(kind) {
    if (this.engine && this.engineKind === kind) {
      this.syncEngineSurface();
      return;
    }
    if (this.engine && this.engine.destroy) {
      this.engine.destroy();
    }
    this.engineKind = kind;
    this.engine = kind === 'scratch'
      ? new RubikScratchEngine(this.canvas, this.ctx)
      : new GameEngine(this.canvas, this.ctx);
    this.syncEngineCallbacks();
    this.syncEngineSurface();
    this.engine.setupCanvas(this.canvasSize.width, this.canvasSize.height);
    this.engine.setEquippedAccessory(this.equippedAccessoryId);
    this.engine.setEquippedExpression(this.equippedExpressionId);
  }

  syncEngineCallbacks() {
    var self = this;
    this.engine.onLevelComplete = function (stats) {
      if (self.onLevelComplete) {
        self.onLevelComplete(stats);
      }
    };
    this.engine.onLevelLoad = function (levelId) {
      if (self.onLevelLoad) {
        self.onLevelLoad(levelId);
      }
    };
    this.engine.onInstructionChange = function (text) {
      if (self.onInstructionChange) {
        self.onInstructionChange(text);
      }
    };
  }

  syncEngineSurface() {
    if (!this.engine) return;
    this.engine.canvas = this.canvas;
    this.engine.ctx = this.ctx;
    this.engine.canvasLeft = this._canvasLeft;
    this.engine.canvasTop = this._canvasTop;
    this.engine.touchHitOffsetY = this._touchHitOffsetY;
  }

  update() {
    if (this.engine && this.engine.update) {
      this.engine.update();
    }
  }

  render() {
    if (this.engine && this.engine.render) {
      this.engine.render();
    }
  }

  handlePointerDown(pointer) {
    if (this.engine && this.engine.handlePointerDown) {
      this.engine.handlePointerDown(pointer);
    }
  }

  handlePointerMove(pointer) {
    if (this.engine && this.engine.handlePointerMove) {
      this.engine.handlePointerMove(pointer);
    }
  }

  handlePointerUp(pointer) {
    if (this.engine && this.engine.handlePointerUp) {
      this.engine.handlePointerUp(pointer);
    }
  }

  setEquippedAccessory(accessoryId) {
    this.equippedAccessoryId = accessoryId || '';
    if (this.engine && this.engine.setEquippedAccessory) {
      this.engine.setEquippedAccessory(this.equippedAccessoryId);
    }
  }

  setEquippedExpression(expressionId) {
    this.equippedExpressionId = expressionId || '';
    if (this.engine && this.engine.setEquippedExpression) {
      this.engine.setEquippedExpression(this.equippedExpressionId);
    }
  }

  undoLastTurn() {
    if (this.engine && this.engine.undoLastTurn) {
      return this.engine.undoLastTurn();
    }
    return false;
  }

  destroy() {
    if (this.engine && this.engine.destroy) {
      this.engine.destroy();
    }
    this.engine = null;
    this.engineKind = '';
  }
}

export function getIsScratchRuntimeLevel(levelId) {
  return !!RUBIK_SCRATCH_LEVEL_MAP[levelId];
}

export function getFirstScratchRuntimeLevelId() {
  return RUBIK_SCRATCH_LEVELS[0].id;
}
