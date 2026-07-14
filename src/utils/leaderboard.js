import { GameStorage } from './storage.js';
import { CLOUD_ENV_ID, LEADERBOARD_LIMIT } from './leaderboard-config.js';

const PROFILE_KEY = 'leaderboardProfileV1';
const MAX_LEVEL_SCORE = 10;
const MIN_LEVEL_SCORE = 1;

let cloudInitPromise = null;
let cloudReady = false;

function getWx() {
  return typeof wx !== 'undefined' ? wx : null;
}

function getCloudEnv() {
  var w = getWx();
  if (CLOUD_ENV_ID) return CLOUD_ENV_ID;
  if (w && w.cloud && w.cloud.DYNAMIC_CURRENT_ENV) {
    return w.cloud.DYNAMIC_CURRENT_ENV;
  }
  return '';
}

function hasCloud() {
  var w = getWx();
  return !!(w && w.cloud && typeof w.cloud.callFunction === 'function');
}

function clampLevelScore(score) {
  var value = Math.round(Number(score) || 0);
  if (value < MIN_LEVEL_SCORE) return 0;
  if (value > MAX_LEVEL_SCORE) return MAX_LEVEL_SCORE;
  return value;
}

export function normalizeLeaderboardScores(levelScores) {
  var normalized = {};
  if (!levelScores || typeof levelScores !== 'object') {
    return [];
  }
  if (Array.isArray(levelScores)) {
    levelScores.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var levelId = String(item.levelId || item.id || '').trim().slice(0, 48);
      var score = clampLevelScore(item.score);
      if (levelId && score > 0) {
        normalized[levelId] = Math.max(Number(normalized[levelId]) || 0, score);
      }
    });
    return Object.keys(normalized).map(function (levelId) {
      return {
        levelId: levelId,
        score: normalized[levelId],
      };
    });
  }
  Object.keys(levelScores).forEach(function (levelId) {
    var safeLevelId = String(levelId || '').trim().slice(0, 48);
    var score = clampLevelScore(levelScores[levelId]);
    if (safeLevelId && score > 0) {
      normalized[safeLevelId] = Math.max(Number(normalized[safeLevelId]) || 0, score);
    }
  });
  return Object.keys(normalized).map(function (levelId) {
    return {
      levelId: levelId,
      score: normalized[levelId],
    };
  });
}

function cleanProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return {
    nickname: String(profile.nickname || '').slice(0, 24),
    avatarUrl: String(profile.avatarUrl || '').slice(0, 300),
  };
}

function getStoredProfile() {
  return cleanProfile(GameStorage.get(PROFILE_KEY));
}

function saveProfile(profile) {
  var cleaned = cleanProfile(profile);
  if (cleaned) {
    GameStorage.set(PROFILE_KEY, cleaned);
  }
  return cleaned;
}

async function initCloud() {
  if (!hasCloud()) {
    return { ok: false, reason: 'unsupported' };
  }
  if (cloudReady) {
    return { ok: true };
  }
  if (!cloudInitPromise) {
    cloudInitPromise = new Promise(function (resolve, reject) {
      try {
        var w = getWx();
        var options = { traceUser: true };
        var env = getCloudEnv();
        if (env) {
          options.env = env;
        }
        w.cloud.init(options);
        cloudReady = true;
        resolve({ ok: true });
      } catch (err) {
        reject(err);
      }
    });
  }
  return cloudInitPromise;
}

async function callCloudFunction(name, data) {
  await initCloud();
  return new Promise(function (resolve, reject) {
    var w = getWx();
    w.cloud.callFunction({
      name: name,
      data: data || {},
      success: function (res) {
        resolve(res && res.result ? res.result : {});
      },
      fail: reject,
    });
  });
}

async function syncScore(levelScores, profile) {
  if (!hasCloud()) {
    return { ok: false, reason: 'unsupported' };
  }
  var cleanedProfile = cleanProfile(profile) || getStoredProfile();
  return callCloudFunction('syncLeaderboardScore', {
    scores: normalizeLeaderboardScores(levelScores),
    nickname: cleanedProfile ? cleanedProfile.nickname : '',
    avatarUrl: cleanedProfile ? cleanedProfile.avatarUrl : '',
  });
}

async function getLeaderboard(limit) {
  if (!hasCloud()) {
    return { ok: false, reason: 'unsupported', rows: [], self: null };
  }
  return callCloudFunction('getLeaderboard', {
    limit: Math.max(1, Math.min(LEADERBOARD_LIMIT, Number(limit) || LEADERBOARD_LIMIT)),
  });
}

async function syncAndFetch(levelScores, options) {
  var profile = options && options.profile ? options.profile : getStoredProfile();
  await syncScore(levelScores, profile);
  return getLeaderboard(options && options.limit);
}

async function requestProfile() {
  var w = getWx();
  if (!w || typeof w.getUserProfile !== 'function') {
    return { ok: false, reason: 'unsupported', profile: null };
  }
  return new Promise(function (resolve) {
    w.getUserProfile({
      desc: '\u7528\u4e8e\u6392\u884c\u699c\u5c55\u793a\u5934\u50cf\u6635\u79f0',
      success: function (res) {
        var userInfo = (res && res.userInfo) || {};
        var profile = saveProfile({
          nickname: userInfo.nickName || '',
          avatarUrl: userInfo.avatarUrl || '',
        });
        resolve({ ok: true, profile: profile });
      },
      fail: function (err) {
        resolve({ ok: false, reason: 'cancelled', error: err, profile: null });
      },
    });
  });
}

export const LeaderboardClient = {
  isSupported: hasCloud,
  init: initCloud,
  getStoredProfile: getStoredProfile,
  saveProfile: saveProfile,
  requestProfile: requestProfile,
  syncScore: syncScore,
  getLeaderboard: getLeaderboard,
  syncAndFetch: syncAndFetch,
};
