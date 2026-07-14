import { GameStorage } from './storage.js';

export const ACCESSORIES = [
  {
    id: 'red-bow',
    name: '\u7ea2\u8272\u8774\u8776\u7ed3',
    requiredScore: 20,
    description: '\u8033\u8fb9\u5c0f\u8774\u8776\u7ed3',
  },
  {
    id: 'gold-bell',
    name: '\u91d1\u8272\u94c3\u94db',
    requiredScore: 50,
    description: '\u80f8\u524d\u4e00\u9897\u5c0f\u94c3\u94db',
  },
  {
    id: 'blue-cap',
    name: '\u732b\u811a\u5370\u53d1\u5361',
    requiredScore: 100,
    description: '\u522b\u5728\u8033\u8fb9\u7684\u5c0f\u53d1\u5361',
  },
  {
    id: 'star-crown',
    name: '\u661f\u661f\u738b\u51a0',
    requiredScore: 180,
    description: '\u95ea\u4eae\u7684\u4e09\u661f\u738b\u51a0',
  },
  {
    id: 'magic-hat',
    name: '\u62a4\u58eb\u5e3d',
    requiredScore: 300,
    description: '\u5e26\u7ea2\u8272\u5341\u5b57\u7684\u5c0f\u5e3d',
  },
];

export const EXPRESSIONS = [
  {
    id: 'sleepy',
    name: '\u772f\u773c',
    requiredScore: 10,
    description: '\u773c\u775b\u7b11\u6210\u5c0f\u5f27\u7ebf',
  },
  {
    id: 'joy',
    name: '\u5f00\u5fc3',
    requiredScore: 30,
    description: '\u5706\u5706\u773c\u548c\u5c0f\u7b11\u8138',
  },
  {
    id: 'surprised',
    name: '\u60ca\u8bb6',
    requiredScore: 70,
    description: '\u7741\u5927\u773c\u775b\u548c\u5c0f\u5706\u5634',
  },
  {
    id: 'angry',
    name: '\u751f\u6c14',
    requiredScore: 130,
    description: '\u659c\u7709\u548c\u9f13\u5634',
  },
  {
    id: 'proud',
    name: '\u5f97\u610f',
    requiredScore: 220,
    description: '\u534a\u772f\u773c\u548c\u5c0f\u7b11',
  },
];

const REWARD_STATE_KEY = 'rewardStateV1';
const CURRENT_REWARD_VERSION = 3;
const MAX_LEVEL_SCORE = 10;
const MIN_LEVEL_SCORE = 1;
const FREE_ACTIONS = 1;
const DRAG_PENALTY = 1;
const ROTATE_PENALTY = 1;

function normalizeLevelScore(score) {
  return Math.max(
    MIN_LEVEL_SCORE,
    Math.min(MAX_LEVEL_SCORE, Math.round(Number(score) || 0)),
  );
}

function normalizeLevelId(levelId) {
  return String(levelId || '').trim().slice(0, 48);
}

function normalizeScoreMap(levelScores, rawVersion) {
  var normalized = {};
  var version = Number(rawVersion) || CURRENT_REWARD_VERSION;

  function addScore(levelId, rawScore) {
    var safeLevelId = normalizeLevelId(levelId);
    var score = Number(rawScore) || 0;
    if (!safeLevelId || score <= 0) return;
    var normalizedScore = normalizeLevelScore(
      version < CURRENT_REWARD_VERSION && score > MAX_LEVEL_SCORE
        ? score / 100
        : score,
    );
    normalized[safeLevelId] = Math.max(
      Number(normalized[safeLevelId]) || 0,
      normalizedScore,
    );
  }

  if (!levelScores || typeof levelScores !== 'object') {
    return normalized;
  }

  if (Array.isArray(levelScores)) {
    levelScores.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      addScore(item.levelId || item.id, item.score);
    });
    return normalized;
  }

  Object.keys(levelScores).forEach(function (levelId) {
    addScore(levelId, levelScores[levelId]);
  });
  return normalized;
}

export function calculateLevelScore(stats) {
  var dragCount = Math.max(0, Number(stats && stats.dragCount) || 0);
  var rotateCount = Math.max(0, Number(stats && stats.rotateCount) || 0);
  var weightedActions = dragCount * DRAG_PENALTY + rotateCount * ROTATE_PENALTY;
  var penalty = Math.max(0, weightedActions - FREE_ACTIONS);
  return normalizeLevelScore(MAX_LEVEL_SCORE - penalty);
}

export function getAccessoryById(id) {
  return ACCESSORIES.find(function (item) {
    return item.id === id;
  });
}

export function getExpressionById(id) {
  return EXPRESSIONS.find(function (item) {
    return item.id === id;
  });
}

function createDefaultState() {
  return {
    version: CURRENT_REWARD_VERSION,
    levelScores: {},
    totalScore: 0,
    ownedAccessoryIds: [],
    equippedAccessoryId: '',
    ownedExpressionIds: [],
    equippedExpressionId: '',
  };
}

function normalizeState(raw) {
  var state = createDefaultState();
  state.version = CURRENT_REWARD_VERSION;
  if (!raw || typeof raw !== 'object') {
    return state;
  }

  var rawVersion = Number(raw.version) || 1;
  state.levelScores = normalizeScoreMap(raw.levelScores, rawVersion);

  if (Array.isArray(raw.ownedAccessoryIds)) {
    raw.ownedAccessoryIds.forEach(function (id) {
      if (getAccessoryById(id) && state.ownedAccessoryIds.indexOf(id) === -1) {
        state.ownedAccessoryIds.push(id);
      }
    });
  }

  if (Array.isArray(raw.ownedExpressionIds)) {
    raw.ownedExpressionIds.forEach(function (id) {
      if (getExpressionById(id) && state.ownedExpressionIds.indexOf(id) === -1) {
        state.ownedExpressionIds.push(id);
      }
    });
  }

  if (
    raw.equippedAccessoryId &&
    state.ownedAccessoryIds.indexOf(raw.equippedAccessoryId) !== -1
  ) {
    state.equippedAccessoryId = raw.equippedAccessoryId;
  }

  if (
    raw.equippedExpressionId &&
    state.ownedExpressionIds.indexOf(raw.equippedExpressionId) !== -1
  ) {
    state.equippedExpressionId = raw.equippedExpressionId;
  }

  state.totalScore = Object.keys(state.levelScores).reduce(function (
    total,
    levelId,
  ) {
    return total + state.levelScores[levelId];
  }, 0);

  return state;
}

function cloneState(state) {
  return {
    version: CURRENT_REWARD_VERSION,
    levelScores: { ...state.levelScores },
    totalScore: state.totalScore,
    ownedAccessoryIds: state.ownedAccessoryIds.slice(),
    equippedAccessoryId: state.equippedAccessoryId || '',
    ownedExpressionIds: state.ownedExpressionIds.slice(),
    equippedExpressionId: state.equippedExpressionId || '',
  };
}

export const RewardStorage = {
  getState() {
    return normalizeState(GameStorage.get(REWARD_STATE_KEY));
  },

  saveState(state) {
    var normalized = normalizeState(state);
    GameStorage.set(REWARD_STATE_KEY, normalized);
    return cloneState(normalized);
  },

  recordLevelResult(levelId, stats) {
    var state = this.getState();
    var score = normalizeLevelScore(
      Number(stats && stats.score) || calculateLevelScore(stats),
    );
    var previousBest = Number(state.levelScores[levelId]) || 0;

    if (score > previousBest) {
      state.levelScores[levelId] = score;
      return {
        state: this.saveState(state),
        score: score,
        previousBest: previousBest,
        addedScore: score - previousBest,
        isNewBest: true,
      };
    }

    return {
      state: cloneState(state),
      score: score,
      previousBest: previousBest,
      addedScore: 0,
      isNewBest: false,
    };
  },

  mergeLevelScores(levelScores) {
    var state = this.getState();
    var incomingScores = normalizeScoreMap(levelScores, CURRENT_REWARD_VERSION);
    var changed = false;

    Object.keys(incomingScores).forEach(function (levelId) {
      var score = incomingScores[levelId];
      var previousBest = Number(state.levelScores[levelId]) || 0;
      if (score > previousBest) {
        state.levelScores[levelId] = score;
        changed = true;
      }
    });

    if (!changed) {
      return { changed: false, state: cloneState(state) };
    }

    return { changed: true, state: this.saveState(state) };
  },

  redeemAccessory(accessoryId) {
    var accessory = getAccessoryById(accessoryId);
    var state = this.getState();
    if (!accessory) {
      return { ok: false, state: cloneState(state), reason: 'missing' };
    }
    if (state.ownedAccessoryIds.indexOf(accessoryId) !== -1) {
      return { ok: true, state: cloneState(state), reason: 'owned' };
    }
    if (state.totalScore < accessory.requiredScore) {
      return { ok: false, state: cloneState(state), reason: 'score' };
    }
    state.ownedAccessoryIds.push(accessoryId);
    if (!state.equippedAccessoryId) {
      state.equippedAccessoryId = accessoryId;
    }
    return { ok: true, state: this.saveState(state), reason: 'redeemed' };
  },

  equipAccessory(accessoryId) {
    var state = this.getState();
    if (!accessoryId) {
      state.equippedAccessoryId = '';
      return { ok: true, state: this.saveState(state) };
    }
    if (state.ownedAccessoryIds.indexOf(accessoryId) === -1) {
      return { ok: false, state: cloneState(state) };
    }
    state.equippedAccessoryId = accessoryId;
    return { ok: true, state: this.saveState(state) };
  },

  redeemExpression(expressionId) {
    var expression = getExpressionById(expressionId);
    var state = this.getState();
    if (!expression) {
      return { ok: false, state: cloneState(state), reason: 'missing' };
    }
    if (state.ownedExpressionIds.indexOf(expressionId) !== -1) {
      return { ok: true, state: cloneState(state), reason: 'owned' };
    }
    if (state.totalScore < expression.requiredScore) {
      return { ok: false, state: cloneState(state), reason: 'score' };
    }
    state.ownedExpressionIds.push(expressionId);
    if (!state.equippedExpressionId) {
      state.equippedExpressionId = expressionId;
    }
    return { ok: true, state: this.saveState(state), reason: 'redeemed' };
  },

  equipExpression(expressionId) {
    var state = this.getState();
    if (!expressionId) {
      state.equippedExpressionId = '';
      return { ok: true, state: this.saveState(state) };
    }
    if (state.ownedExpressionIds.indexOf(expressionId) === -1) {
      return { ok: false, state: cloneState(state) };
    }
    state.equippedExpressionId = expressionId;
    return { ok: true, state: this.saveState(state) };
  },
};
