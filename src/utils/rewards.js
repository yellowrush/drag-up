import { GameStorage } from './storage.js';

export const ACCESSORIES = [
  {
    id: 'red-bow',
    name: '\u7ea2\u8272\u8774\u8776\u7ed3',
    requiredScore: 20,
    description: '\u8033\u8fb9\u5c0f\u8774\u8776\u7ed3',
    unlockType: 'score',
  },
  {
    id: 'gold-bell',
    name: '\u91d1\u8272\u94c3\u94db',
    requiredScore: 50,
    description: '\u80f8\u524d\u4e00\u9897\u5c0f\u94c3\u94db',
    unlockType: 'score',
  },
  {
    id: 'pixel-gamepad-pin',
    name: '\u50cf\u7d20\u624b\u67c4\u53d1\u5361',
    requiredScore: 85,
    description: '\u50cf\u7d20\u5c0f\u624b\u67c4\uff0c\u901a\u5173\u65f6\u8df3\u51fa\u5f69\u8272\u65b9\u5757',
    unlockType: 'score',
  },
  {
    id: 'blue-cap',
    name: '\u732b\u811a\u5370\u53d1\u5361',
    requiredScore: 100,
    description: '\u522b\u5728\u8033\u8fb9\u7684\u5c0f\u53d1\u5361',
    unlockType: 'score',
  },
  {
    id: 'blue-collar-bell',
    name: '\u84dd\u9886\u5706\u94c3',
    requiredScore: 120,
    description: '\u84dd\u8272\u9879\u5708\u6302\u4e00\u9897\u5706\u5706\u91d1\u94c3',
    unlockType: 'score',
  },
  {
    id: 'star-crown',
    name: '\u661f\u661f\u738b\u51a0',
    requiredScore: 180,
    description: '\u95ea\u4eae\u7684\u4e09\u661f\u738b\u51a0',
    unlockType: 'score',
  },
  {
    id: 'patrol-cap',
    name: '\u5de1\u903b\u8b66\u5e3d',
    requiredScore: 240,
    description: '\u6d77\u84dd\u5e3d\u6a90\u548c\u91d1\u8272\u661f\u5fbd',
    unlockType: 'score',
  },
  {
    id: 'magic-hat',
    name: '\u62a4\u58eb\u5e3d',
    requiredScore: 300,
    description: '\u5e26\u7ea2\u8272\u5341\u5b57\u7684\u5c0f\u5e3d',
    unlockType: 'score',
  },
  {
    id: 'lucky-scarf',
    name: '\u5e78\u8fd0\u56f4\u5dfe',
    description: '\u8fde\u7eed\u7b7e\u5230 7 \u5929',
    unlockType: 'task',
    unlockTaskId: 'checkin-7',
  },
  {
    id: 'box-medal',
    name: '\u76d2\u5b50\u5956\u724c',
    description: '\u732b\u7bb1\u5b50\u5168\u901a',
    unlockType: 'task',
    unlockTaskId: 'complete-cat-box',
  },
  {
    id: 'yarn-pompom',
    name: '\u6bdb\u7ebf\u7ed2\u7403',
    description: '\u6bdb\u7ebf\u7403\u5168\u901a',
    unlockType: 'task',
    unlockTaskId: 'complete-yarn-ball',
  },
];

export const EXPRESSIONS = [
  {
    id: 'sleepy',
    name: '\u772f\u773c',
    requiredScore: 10,
    description: '\u773c\u775b\u7b11\u6210\u5c0f\u5f27\u7ebf',
    unlockType: 'score',
  },
  {
    id: 'joy',
    name: '\u5f00\u5fc3',
    requiredScore: 30,
    description: '\u5706\u5706\u773c\u548c\u5c0f\u7b11\u8138',
    unlockType: 'score',
  },
  {
    id: 'night-spark',
    name: '\u591c\u5f71\u5927\u773c',
    requiredScore: 40,
    description: '\u9ed1\u4eae\u5c0f\u8138\uff0c\u773c\u775b\u50cf\u591c\u91cc\u53d1\u5149',
    unlockType: 'score',
  },
  {
    id: 'surprised',
    name: '\u60ca\u8bb6',
    requiredScore: 70,
    description: '\u7741\u5927\u773c\u775b\u548c\u5c0f\u5706\u5634',
    unlockType: 'score',
  },
  {
    id: 'angry',
    name: '\u751f\u6c14',
    requiredScore: 130,
    description: '\u9f13\u8138\u5c0f\u4e0d\u670d',
    unlockType: 'score',
  },
  {
    id: 'round-blue-smile',
    name: '\u5706\u84dd\u7b11\u8138',
    requiredScore: 160,
    description: '\u84dd\u767d\u5706\u8138\u548c\u5f00\u6717\u7b11\u53e3',
    unlockType: 'score',
  },
  {
    id: 'proud',
    name: '\u5f97\u610f',
    requiredScore: 220,
    description: '\u95ea\u5149\u5c0f\u9a84\u50b2',
    unlockType: 'score',
  },
  {
    id: 'wink',
    name: '\u7728\u773c',
    description: '\u8fde\u7eed\u7b7e\u5230 3 \u5929',
    unlockType: 'task',
    unlockTaskId: 'checkin-3',
  },
  {
    id: 'sparkle-eyes',
    name: '\u95ea\u95ea\u773c',
    description: '\u732b\u6293\u677f\u5168\u901a',
    unlockType: 'task',
    unlockTaskId: 'complete-cat-scratcher',
  },
  {
    id: 'friend-heart',
    name: '\u597d\u53cb\u7231\u5fc3',
    description: '\u5206\u4eab\u5c0f\u6e38\u620f\u83b7\u5f97',
    unlockType: 'task',
    unlockTaskId: 'share-minigame',
  },
];

export const STICKERS = [
  {
    id: 'cat-box-10',
    name: '奶牛猫贴纸',
    icon: '🐄',
    description: '猫箱子第 10 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-10',
  },
  {
    id: 'cat-box-20',
    name: '橘猫贴纸',
    icon: '🍊',
    description: '猫箱子第 20 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-20',
  },
  {
    id: 'cat-box-30',
    name: '黑猫贴纸',
    icon: '🌙',
    description: '猫箱子第 30 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-30',
  },
  {
    id: 'cat-box-40',
    name: '三花猫贴纸',
    icon: '🎨',
    description: '猫箱子第 40 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-40',
  },
  {
    id: 'cat-box-50',
    name: '虎斑猫贴纸',
    icon: '🐯',
    description: '猫箱子第 50 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-50',
  },
  {
    id: 'cat-box-60',
    name: '布偶猫贴纸',
    icon: '🧶',
    description: '猫箱子第 60 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-box-60',
  },
  {
    id: 'cat-scratcher-10',
    name: '机械猫贴纸',
    icon: '🤖',
    description: '猫抓板第 10 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-scratcher-10',
  },
  {
    id: 'cat-scratcher-20',
    name: '魔法猫贴纸',
    icon: '✨',
    description: '猫抓板第 20 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-scratcher-20',
  },
  {
    id: 'cat-scratcher-30',
    name: '宇航猫贴纸',
    icon: '🚀',
    description: '猫抓板第 30 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-cat-scratcher-30',
  },
  {
    id: 'yarn-ball-10',
    name: '云朵猫贴纸',
    icon: '☁️',
    description: '毛线球第 10 关彩蛋',
    unlockType: 'task',
    unlockTaskId: 'milestone-yarn-ball-10',
  },
];

export const REWARD_TASKS = [
  {
    id: 'daily-checkin',
    type: 'checkin',
    name: '\u4eca\u65e5\u7b7e\u5230',
    description: '\u6bcf\u5929\u6765\u770b\u770b\u5c0f\u732b',
    rewardText: '+5 \u79ef\u5206',
    deferred: true,
  },
  {
    id: 'checkin-3',
    type: 'streak',
    name: '\u8fde\u7eed 3 \u5929',
    description: '\u9886\u53d6\u7728\u773c\u8868\u60c5',
    rewardText: '\u7728\u773c',
    requiredStreak: 3,
    rewardType: 'expression',
    rewardId: 'wink',
    deferred: true,
  },
  {
    id: 'checkin-7',
    type: 'streak',
    name: '\u8fde\u7eed 7 \u5929',
    description: '\u9886\u53d6\u5e78\u8fd0\u56f4\u5dfe',
    rewardText: '\u5e78\u8fd0\u56f4\u5dfe',
    requiredStreak: 7,
    rewardType: 'accessory',
    rewardId: 'lucky-scarf',
    deferred: true,
  },
  {
    id: 'complete-cat-box',
    type: 'world',
    name: '\u732b\u7bb1\u5b50\u5168\u901a',
    description: '\u5b8c\u6210\u6574\u4e2a\u732b\u7bb1\u5b50\u7cfb\u5217',
    rewardText: '\u76d2\u5b50\u5956\u724c',
    worldId: 'cat-box',
    rewardType: 'accessory',
    rewardId: 'box-medal',
  },
  {
    id: 'complete-cat-scratcher',
    type: 'world',
    name: '\u732b\u6293\u677f\u5168\u901a',
    description: '\u5b8c\u6210\u6574\u4e2a\u732b\u6293\u677f\u7cfb\u5217',
    rewardText: '\u95ea\u95ea\u773c',
    worldId: 'cat-scratcher',
    rewardType: 'expression',
    rewardId: 'sparkle-eyes',
  },
  {
    id: 'complete-yarn-ball',
    type: 'world',
    name: '\u6bdb\u7ebf\u7403\u5168\u901a',
    description: '\u5b8c\u6210\u6574\u4e2a\u6bdb\u7ebf\u7403\u7cfb\u5217',
    rewardText: '\u6bdb\u7ebf\u7ed2\u7403',
    worldId: 'yarn-ball',
    rewardType: 'accessory',
    rewardId: 'yarn-pompom',
  },
  {
    id: 'milestone-cat-box-10',
    type: 'level-milestone',
    name: '猫箱子第 10 关彩蛋',
    description: '通关自动获得奶牛猫贴纸',
    rewardText: '奶牛猫贴纸',
    worldId: 'cat-box',
    levelNumber: 10,
    rewardType: 'sticker',
    rewardId: 'cat-box-10',
  },
  {
    id: 'milestone-cat-box-20',
    type: 'level-milestone',
    name: '猫箱子第 20 关彩蛋',
    description: '通关自动获得橘猫贴纸',
    rewardText: '橘猫贴纸',
    worldId: 'cat-box',
    levelNumber: 20,
    rewardType: 'sticker',
    rewardId: 'cat-box-20',
  },
  {
    id: 'milestone-cat-box-30',
    type: 'level-milestone',
    name: '猫箱子第 30 关彩蛋',
    description: '通关自动获得黑猫贴纸',
    rewardText: '黑猫贴纸',
    worldId: 'cat-box',
    levelNumber: 30,
    rewardType: 'sticker',
    rewardId: 'cat-box-30',
  },
  {
    id: 'milestone-cat-box-40',
    type: 'level-milestone',
    name: '猫箱子第 40 关彩蛋',
    description: '通关自动获得三花猫贴纸',
    rewardText: '三花猫贴纸',
    worldId: 'cat-box',
    levelNumber: 40,
    rewardType: 'sticker',
    rewardId: 'cat-box-40',
  },
  {
    id: 'milestone-cat-box-50',
    type: 'level-milestone',
    name: '猫箱子第 50 关彩蛋',
    description: '通关自动获得虎斑猫贴纸',
    rewardText: '虎斑猫贴纸',
    worldId: 'cat-box',
    levelNumber: 50,
    rewardType: 'sticker',
    rewardId: 'cat-box-50',
  },
  {
    id: 'milestone-cat-box-60',
    type: 'level-milestone',
    name: '猫箱子第 60 关彩蛋',
    description: '通关自动获得布偶猫贴纸',
    rewardText: '布偶猫贴纸',
    worldId: 'cat-box',
    levelNumber: 60,
    rewardType: 'sticker',
    rewardId: 'cat-box-60',
  },
  {
    id: 'milestone-cat-scratcher-10',
    type: 'level-milestone',
    name: '猫抓板第 10 关彩蛋',
    description: '通关自动获得机械猫贴纸',
    rewardText: '机械猫贴纸',
    worldId: 'cat-scratcher',
    levelNumber: 10,
    rewardType: 'sticker',
    rewardId: 'cat-scratcher-10',
  },
  {
    id: 'milestone-cat-scratcher-20',
    type: 'level-milestone',
    name: '猫抓板第 20 关彩蛋',
    description: '通关自动获得魔法猫贴纸',
    rewardText: '魔法猫贴纸',
    worldId: 'cat-scratcher',
    levelNumber: 20,
    rewardType: 'sticker',
    rewardId: 'cat-scratcher-20',
  },
  {
    id: 'milestone-cat-scratcher-30',
    type: 'level-milestone',
    name: '猫抓板第 30 关彩蛋',
    description: '通关自动获得宇航猫贴纸',
    rewardText: '宇航猫贴纸',
    worldId: 'cat-scratcher',
    levelNumber: 30,
    rewardType: 'sticker',
    rewardId: 'cat-scratcher-30',
  },
  {
    id: 'milestone-yarn-ball-10',
    type: 'level-milestone',
    name: '毛线球第 10 关彩蛋',
    description: '通关自动获得云朵猫贴纸',
    rewardText: '云朵猫贴纸',
    worldId: 'yarn-ball',
    levelNumber: 10,
    rewardType: 'sticker',
    rewardId: 'yarn-ball-10',
  },
  {
    id: 'share-minigame',
    type: 'share',
    name: '\u5206\u4eab\u5c0f\u6e38\u620f',
    description: '\u628a\u5c0f\u732b\u5173\u5361\u5206\u4eab\u7ed9\u670b\u53cb',
    rewardText: '\u597d\u53cb\u7231\u5fc3',
    rewardType: 'expression',
    rewardId: 'friend-heart',
  },
];

const REWARD_STATE_KEY = 'rewardStateV1';
const CURRENT_REWARD_VERSION = 5;
const MAX_LEVEL_SCORE = 10;
const MIN_LEVEL_SCORE = 1;
const FREE_ACTIONS = 1;
const DRAG_PENALTY = 1;
const ROTATE_PENALTY = 1;
const DAILY_CHECKIN_POINTS = 5;

function normalizeLevelScore(score) {
  return Math.max(
    MIN_LEVEL_SCORE,
    Math.min(MAX_LEVEL_SCORE, Math.round(Number(score) || 0)),
  );
}

function normalizeLevelId(levelId) {
  return String(levelId || '').trim().slice(0, 48);
}

function applyAutoMilestoneRewards(state, context) {
  REWARD_TASKS.forEach(function (task) {
    if (!task || task.type !== 'level-milestone') return;
    if (isTaskClaimed(state, task.id)) return;
    var taskState = getTaskState(task, state, context || {});
    if (!taskState.ready) return;
    grantTaskReward(state, task);
    addUnique(state.claimedTaskIds, task.id);
  });
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

export function getStickerById(id) {
  return STICKERS.find(function (item) {
    return item.id === id;
  });
}

export function getRewardTaskById(id) {
  return REWARD_TASKS.find(function (task) {
    return task.id === id;
  });
}

export function isScoreReward(item) {
  return !!item && item.unlockType !== 'task' && Number(item.requiredScore) > 0;
}

export function getRewardSourceText(item) {
  if (!item) return '';
  if (isScoreReward(item)) return item.requiredScore + ' \u79ef\u5206';
  if (item.unlockTaskId) {
    var task = getRewardTaskById(item.unlockTaskId);
    if (task && task.deferred) {
      return task.name + '\u83b7\u5f97\uff08\u7a0d\u540e\u5f00\u653e\uff09';
    }
    return task ? task.name : item.description || '';
  }
  return item.description || '';
}

function createDefaultState() {
  return {
    version: CURRENT_REWARD_VERSION,
    levelScores: {},
    totalScore: 0,
    bonusPoints: 0,
    ownedAccessoryIds: [],
    equippedAccessoryId: '',
    ownedExpressionIds: [],
    equippedExpressionId: '',
    ownedStickerIds: [],
    checkin: {
      lastDate: '',
      streak: 0,
    },
    claimedTaskIds: [],
    shareMinigameCompleted: false,
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

  var levelTotal = getLevelScoreTotal(state.levelScores);
  var rawBonus = Math.max(0, Math.round(Number(raw.bonusPoints) || 0));
  if (raw.bonusPoints == null && Number(raw.totalScore) > levelTotal) {
    rawBonus = Math.round(Number(raw.totalScore) - levelTotal);
  }
  state.bonusPoints = rawBonus;

  if (raw.checkin && typeof raw.checkin === 'object') {
    state.checkin.lastDate = normalizeDateString(raw.checkin.lastDate);
    state.checkin.streak = Math.max(0, Math.round(Number(raw.checkin.streak) || 0));
  }

  if (Array.isArray(raw.claimedTaskIds)) {
    raw.claimedTaskIds.forEach(function (id) {
      if (getRewardTaskById(id) && state.claimedTaskIds.indexOf(id) === -1) {
        state.claimedTaskIds.push(id);
      }
    });
  }

  state.shareMinigameCompleted =
    !!raw.shareMinigameCompleted ||
    state.claimedTaskIds.indexOf('share-minigame') !== -1;

  if (state.shareMinigameCompleted && state.claimedTaskIds.indexOf('share-minigame') === -1) {
    state.claimedTaskIds.push('share-minigame');
  }

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

  if (Array.isArray(raw.ownedStickerIds)) {
    raw.ownedStickerIds.forEach(function (id) {
      if (getStickerById(id) && state.ownedStickerIds.indexOf(id) === -1) {
        state.ownedStickerIds.push(id);
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

  state.totalScore = levelTotal + state.bonusPoints;

  return state;
}

function cloneState(state) {
  return {
    version: CURRENT_REWARD_VERSION,
    levelScores: { ...state.levelScores },
    totalScore: state.totalScore,
    bonusPoints: state.bonusPoints || 0,
    ownedAccessoryIds: state.ownedAccessoryIds.slice(),
    equippedAccessoryId: state.equippedAccessoryId || '',
    ownedExpressionIds: state.ownedExpressionIds.slice(),
    equippedExpressionId: state.equippedExpressionId || '',
    ownedStickerIds: state.ownedStickerIds.slice(),
    checkin: {
      lastDate: state.checkin && state.checkin.lastDate ? state.checkin.lastDate : '',
      streak: state.checkin ? Number(state.checkin.streak) || 0 : 0,
    },
    claimedTaskIds: state.claimedTaskIds.slice(),
    shareMinigameCompleted: !!state.shareMinigameCompleted,
  };
}

function getLevelScoreTotal(levelScores) {
  return Object.keys(levelScores || {}).reduce(function (total, levelId) {
    return total + (Number(levelScores[levelId]) || 0);
  }, 0);
}

function normalizeDateString(value) {
  var text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function getTodayString() {
  var now = new Date();
  var year = now.getFullYear();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function getYesterdayString() {
  var date = new Date();
  date.setDate(date.getDate() - 1);
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function addUnique(list, id) {
  if (!id || list.indexOf(id) !== -1) return false;
  list.push(id);
  return true;
}

function grantTaskReward(state, task) {
  if (!task || !task.rewardType || !task.rewardId) return false;
  if (task.rewardType === 'accessory' && getAccessoryById(task.rewardId)) {
    var addedAccessory = addUnique(state.ownedAccessoryIds, task.rewardId);
    if (addedAccessory && !state.equippedAccessoryId) {
      state.equippedAccessoryId = task.rewardId;
    }
    return true;
  }
  if (task.rewardType === 'expression' && getExpressionById(task.rewardId)) {
    var addedExpression = addUnique(state.ownedExpressionIds, task.rewardId);
    if (addedExpression && !state.equippedExpressionId) {
      state.equippedExpressionId = task.rewardId;
    }
    return true;
  }
  if (task.rewardType === 'sticker' && getStickerById(task.rewardId)) {
    return addUnique(state.ownedStickerIds, task.rewardId);
  }
  return false;
}

function getWorldProgress(task, context) {
  var worlds = (context && context.levelWorlds) || [];
  var completedLevels = (context && context.completedLevels) || [];
  var world = worlds.find(function (item) {
    return item.id === task.worldId;
  });
  var levels = world && Array.isArray(world.levels) ? world.levels : [];
  var completedCount = levels.reduce(function (total, level) {
    return total + (completedLevels.indexOf(level.id) !== -1 ? 1 : 0);
  }, 0);
  return {
    completed: completedCount,
    total: levels.length,
    ready: levels.length > 0 && completedCount >= levels.length,
  };
}

function getLevelMilestoneProgress(task, context) {
  var worlds = (context && context.levelWorlds) || [];
  var completedLevels = (context && context.completedLevels) || [];
  var world = worlds.find(function (item) {
    return item.id === task.worldId;
  });
  var levels = world && Array.isArray(world.levels) ? world.levels : [];
  var levelNumber = Math.max(1, Math.round(Number(task.levelNumber) || 0));
  var targetLevel = levels[levelNumber - 1];
  var completed =
    !!targetLevel && completedLevels.indexOf(targetLevel.id) !== -1;
  return {
    completed: completed ? 1 : 0,
    total: targetLevel ? 1 : 0,
    ready: !!targetLevel && completed,
    targetLabel: '第 ' + levelNumber + ' 关',
  };
}

function isTaskClaimed(state, taskId) {
  return state.claimedTaskIds.indexOf(taskId) !== -1;
}

function getTaskState(task, state, context) {
  var claimed = isTaskClaimed(state, task.id);
  var today = getTodayString();
  var ready = false;
  var action = '';
  var actionText = '\u672a\u5b8c\u6210';
  var statusText = task.rewardText || '';

  if (task.type === 'checkin') {
    var checkedToday = state.checkin.lastDate === today;
    ready = !checkedToday;
    action = checkedToday ? '' : 'checkin';
    actionText = checkedToday ? '\u5df2\u7b7e\u5230' : '\u7b7e\u5230';
    statusText = checkedToday
      ? '\u8fde\u7eed ' + state.checkin.streak + ' \u5929'
      : '\u4eca\u5929\u53ef\u9886 ' + DAILY_CHECKIN_POINTS + ' \u79ef\u5206';
  } else if (task.type === 'streak') {
    ready = state.checkin.streak >= task.requiredStreak;
    action = claimed ? '' : 'claim';
    actionText = claimed ? '\u5df2\u9886\u53d6' : ready ? '\u9886\u53d6' : '\u672a\u5b8c\u6210';
    statusText = Math.min(state.checkin.streak, task.requiredStreak) + '/' + task.requiredStreak + ' \u5929';
  } else if (task.type === 'world') {
    var progress = getWorldProgress(task, context);
    ready = progress.ready;
    action = claimed ? '' : 'claim';
    actionText = claimed ? '\u5df2\u9886\u53d6' : ready ? '\u9886\u53d6' : '\u672a\u5b8c\u6210';
    statusText = progress.completed + '/' + progress.total + ' \u5173';
  } else if (task.type === 'share') {
    ready = !!(context && context.canShareMinigame);
    action = claimed ? '' : 'share';
    actionText = claimed ? '\u5df2\u9886\u53d6' : ready ? '\u5206\u4eab\u5c0f\u6e38\u620f' : '\u53bb\u5c0f\u6e38\u620f';
    statusText = claimed
      ? '\u5df2\u5b8c\u6210'
      : ready
        ? '\u5206\u4eab\u540e\u9886\u53d6'
        : '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u5206\u4eab';
  } else if (task.type === 'level-milestone') {
    var milestone = getLevelMilestoneProgress(task, context);
    ready = milestone.ready;
    action = '';
    actionText = claimed ? '\u5df2\u9886\u53d6' : '\u901a\u5173\u81ea\u52a8\u9886\u53d6';
    statusText = milestone.ready ? '\u5df2\u901a\u5173' : milestone.targetLabel;
  }

  return {
    id: task.id,
    type: task.type,
    name: task.name,
    description: task.description,
    rewardText: task.rewardText,
    rewardType: task.rewardType || '',
    rewardId: task.rewardId || '',
    statusText: statusText,
    action: action,
    actionText: actionText,
    ready: ready,
    claimed: claimed || (task.type === 'checkin' && !ready),
    canTap: !!action && (task.type === 'share' || ready),
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

  recordLevelResult(levelId, stats, context) {
    var state = this.getState();
    var score = normalizeLevelScore(
      Number(stats && stats.score) || calculateLevelScore(stats),
    );
    var previousBest = Number(state.levelScores[levelId]) || 0;
    var claimedBefore = state.claimedTaskIds.length;
    var stickersBefore = state.ownedStickerIds.length;

    if (score > previousBest) {
      state.levelScores[levelId] = score;
    }

    applyAutoMilestoneRewards(state, context || {});
    var milestoneChanged =
      claimedBefore !== state.claimedTaskIds.length ||
      stickersBefore !== state.ownedStickerIds.length;
    var isNewBest = score > previousBest;

    if (isNewBest || milestoneChanged) {
      return {
        state: this.saveState(state),
        score: score,
        previousBest: previousBest,
        addedScore: isNewBest ? score - previousBest : 0,
        isNewBest: isNewBest,
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

  claimDailyCheckin() {
    var state = this.getState();
    var today = getTodayString();
    if (state.checkin.lastDate === today) {
      return { ok: false, state: cloneState(state), reason: 'today' };
    }
    state.checkin.streak =
      state.checkin.lastDate === getYesterdayString()
        ? (Number(state.checkin.streak) || 0) + 1
        : 1;
    state.checkin.lastDate = today;
    state.bonusPoints = (Number(state.bonusPoints) || 0) + DAILY_CHECKIN_POINTS;
    return {
      ok: true,
      state: this.saveState(state),
      points: DAILY_CHECKIN_POINTS,
      streak: state.checkin.streak,
    };
  },

  getTaskStates(context) {
    var state = this.getState();
    return REWARD_TASKS.filter(function (task) {
      return !task.deferred;
    }).map(function (task) {
      return getTaskState(task, state, context || {});
    });
  },

  claimTaskReward(taskId, context) {
    var task = getRewardTaskById(taskId);
    var state = this.getState();
    if (!task || task.deferred || task.type === 'checkin' || task.type === 'share') {
      return { ok: false, state: cloneState(state), reason: 'missing' };
    }
    if (isTaskClaimed(state, task.id)) {
      return { ok: true, state: cloneState(state), reason: 'claimed' };
    }
    var taskState = getTaskState(task, state, context || {});
    if (!taskState.ready) {
      return { ok: false, state: cloneState(state), reason: 'locked' };
    }
    grantTaskReward(state, task);
    addUnique(state.claimedTaskIds, task.id);
    return { ok: true, state: this.saveState(state), reason: 'claimed' };
  },

  completeShareMinigame() {
    var task = getRewardTaskById('share-minigame');
    var state = this.getState();
    if (isTaskClaimed(state, 'share-minigame')) {
      return { ok: true, state: cloneState(state), reason: 'claimed' };
    }
    state.shareMinigameCompleted = true;
    grantTaskReward(state, task);
    addUnique(state.claimedTaskIds, 'share-minigame');
    return { ok: true, state: this.saveState(state), reason: 'claimed' };
  },

  redeemAccessory(accessoryId) {
    var accessory = getAccessoryById(accessoryId);
    var state = this.getState();
    if (!accessory) {
      return { ok: false, state: cloneState(state), reason: 'missing' };
    }
    if (!isScoreReward(accessory)) {
      return { ok: false, state: cloneState(state), reason: 'task' };
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
    if (!isScoreReward(expression)) {
      return { ok: false, state: cloneState(state), reason: 'task' };
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
