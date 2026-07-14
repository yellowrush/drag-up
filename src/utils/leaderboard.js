import { GameStorage } from './storage.js';
import { CLOUD_ENV_ID, LEADERBOARD_LIMIT } from './leaderboard-config.js';

const PROFILE_KEY = 'leaderboardProfileV1';
const LOCAL_PLAYER_NAME = '\u672c\u5730\u73a9\u5bb6';
const ANONYMOUS_PLAYER_NAME = '\u533f\u540d\u73a9\u5bb6';
const MAX_LEVEL_SCORE = 10;
const MIN_LEVEL_SCORE = 1;

let cloudInitPromise = null;
let cloudReady = false;
let cloudBlockedReason = '';
const warnedLeaderboardMessages = {};

function getWx() {
  return typeof wx !== 'undefined' ? wx : null;
}

function logLeaderboard(message, detail) {
  if (typeof console === 'undefined' || typeof console.log !== 'function') return;
  console.log('[leaderboard] ' + message, detail || '');
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

function warnLeaderboard(message, detail, key) {
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
  if (key) {
    if (warnedLeaderboardMessages[key]) return;
    warnedLeaderboardMessages[key] = true;
  }
  console.warn('[leaderboard] ' + message, detail || '');
}

function getCloudErrorMessage(err) {
  if (!err) return '';
  return String(err.errMsg || err.message || err);
}

function getCloudErrorReason(err) {
  var message = getCloudErrorMessage(err);
  if (/INVALID_ENV|Environment not found|-501000/.test(message)) {
    return 'invalid-env';
  }
  if (/function not found|FUNCTION_NOT_FOUND|not exist/i.test(message)) {
    return 'function-not-found';
  }
  return 'network';
}

function getPrivacyErrorReason(err) {
  var message = getCloudErrorMessage(err);
  if (/announce your privacy usage|privacy usage|errno:\s*1026|1026/.test(message)) {
    return 'privacy-undeclared';
  }
  if (/privacy/i.test(message)) {
    return 'privacy-required';
  }
  return 'cancelled';
}

async function ensurePrivacyAuthorized(interactive) {
  var w = getWx();
  if (!w || typeof w.getPrivacySetting !== 'function') {
    return { ok: true, reason: 'unsupported' };
  }
  return new Promise(function (resolve) {
    w.getPrivacySetting({
      success: function (res) {
        if (!res || !res.needAuthorization) {
          resolve({ ok: true, reason: 'ready' });
          return;
        }
        if (!interactive || typeof w.requirePrivacyAuthorize !== 'function') {
          resolve({ ok: false, reason: 'privacy-required' });
          return;
        }
        w.requirePrivacyAuthorize({
          success: function () {
            resolve({ ok: true, reason: 'authorized' });
          },
          fail: function (err) {
            var reason = getPrivacyErrorReason(err);
            warnLeaderboard('privacy authorization failed', err, 'privacy-authorize-failed');
            resolve({ ok: false, reason: reason, error: err });
          },
        });
      },
      fail: function (err) {
        var reason = getPrivacyErrorReason(err);
        if (reason === 'privacy-undeclared') {
          warnLeaderboard('privacy usage is not declared in mp backend', err, 'privacy-undeclared');
          resolve({ ok: false, reason: reason, error: err });
          return;
        }
        resolve({ ok: true, reason: 'privacy-setting-unavailable' });
      },
    });
  });
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
  var nickname = String(profile.nickname || '').trim().slice(0, 24);
  var avatarUrl = String(profile.avatarUrl || '').trim().slice(0, 300);
  if (!nickname && !avatarUrl) return null;
  if (nickname === LOCAL_PLAYER_NAME || nickname === ANONYMOUS_PLAYER_NAME) return null;
  return {
    nickname: nickname,
    avatarUrl: avatarUrl,
    authorized: profile.authorized !== false,
  };
}

function getStoredProfile() {
  return cleanProfile(GameStorage.get(PROFILE_KEY));
}

function saveProfile(profile) {
  var cleaned = cleanProfile(profile);
  if (cleaned) {
    var saved = {
      nickname: cleaned.nickname,
      avatarUrl: cleaned.avatarUrl,
      authorized: true,
      updatedAt: Date.now(),
    };
    GameStorage.set(PROFILE_KEY, saved);
    return saved;
  }
  return null;
}

function getAuthorizedProfile(profile) {
  return cleanProfile(profile) || getStoredProfile();
}

function profileFromUserInfo(userInfo) {
  if (!userInfo || typeof userInfo !== 'object') return null;
  var nickname = userInfo.nickName || userInfo.nickname || '';
  var avatarUrl = userInfo.avatarUrl || '';
  if (!nickname && !avatarUrl) return null;
  return saveProfile({
    nickname: nickname,
    avatarUrl: avatarUrl,
    authorized: true,
  });
}

async function refreshProfileFromCache() {
  var stored = getStoredProfile();
  if (stored) {
    return { ok: true, reason: 'stored', profile: stored };
  }
  var privacy = await ensurePrivacyAuthorized(false);
  if (!privacy.ok) {
    return { ok: false, reason: privacy.reason, profile: null };
  }
  var w = getWx();
  if (!w || typeof w.getUserInfo !== 'function') {
    return { ok: false, reason: 'unsupported', profile: null };
  }
  return new Promise(function (resolve) {
    w.getUserInfo({
      withCredentials: false,
      lang: 'zh_CN',
      success: function (res) {
        var profile = profileFromUserInfo(res && res.userInfo);
        if (profile) {
          resolve({ ok: true, reason: 'cached-user-info', profile: profile });
          return;
        }
        resolve({ ok: false, reason: 'empty-user-info', profile: null });
      },
      fail: function (err) {
        resolve({
          ok: false,
          reason: 'not-authorized',
          error: err,
          profile: getStoredProfile(),
        });
      },
    });
  });
}

async function initCloud() {
  if (!hasCloud()) {
    warnLeaderboard('wx.cloud.callFunction is unavailable', '', 'unsupported');
    return { ok: false, reason: 'unsupported' };
  }
  if (cloudBlockedReason) {
    return { ok: false, reason: cloudBlockedReason };
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
  var initResult = await initCloud();
  if (initResult && initResult.ok === false) {
    logLeaderboard('callFunction skipped: ' + name, initResult);
    return initResult;
  }
  return new Promise(function (resolve, reject) {
    var w = getWx();
    logLeaderboard('callFunction start: ' + name, data || {});
    w.cloud.callFunction({
      name: name,
      data: data || {},
      success: function (res) {
        var result = res && res.result ? res.result : {};
        if (result && result.ok === false) {
          warnLeaderboard(
            'callFunction returned error: ' + name + ' (' + (result.reason || 'unknown') + ')',
            result.errMsg || result,
            'result:' + name + ':' + (result.reason || 'unknown'),
          );
        } else {
          logLeaderboard('callFunction success: ' + name, result);
        }
        resolve(result);
      },
      fail: function (err) {
        var reason = getCloudErrorReason(err);
        var message = getCloudErrorMessage(err);
        if (reason === 'invalid-env') {
          cloudBlockedReason = reason;
        }
        warnLeaderboard(
          'callFunction failed: ' + name + ' (' + reason + ')',
          message,
          reason + ':' + name,
        );
        resolve({ ok: false, reason: reason, errMsg: message });
      },
    });
  });
}

async function syncScore(levelScores, profile) {
  if (!hasCloud()) {
    logLeaderboard('syncScore skipped: cloud unsupported');
    return { ok: false, reason: 'unsupported' };
  }
  if (cloudBlockedReason) {
    logLeaderboard('syncScore skipped: cloud blocked', cloudBlockedReason);
    return { ok: false, reason: cloudBlockedReason };
  }
  var cleanedProfile = getAuthorizedProfile(profile);
  if (!cleanedProfile) {
    logLeaderboard('syncScore skipped: profile required');
    return { ok: false, reason: 'profile-required' };
  }
  var scores = normalizeLeaderboardScores(levelScores);
  logLeaderboard('syncScore payload', {
    scoreCount: scores.length,
    localTotalScore: scores.reduce(function (total, item) {
      return total + (Number(item.score) || 0);
    }, 0),
    nickname: cleanedProfile.nickname || '',
    hasAvatar: !!cleanedProfile.avatarUrl,
  });
  return callCloudFunction('syncLeaderboardScore', {
    scores: scores,
    nickname: cleanedProfile.nickname || '',
    avatarUrl: cleanedProfile.avatarUrl || '',
    authorized: true,
  });
}

async function getLeaderboard(limit) {
  if (!hasCloud()) {
    return { ok: false, reason: 'unsupported', rows: [], self: null };
  }
  if (cloudBlockedReason) {
    return { ok: false, reason: cloudBlockedReason, rows: [], self: null };
  }
  return callCloudFunction('getLeaderboard', {
    limit: Math.max(1, Math.min(LEADERBOARD_LIMIT, Number(limit) || LEADERBOARD_LIMIT)),
  });
}

function attachSyncResult(result, syncResult) {
  if (!syncResult || syncResult.ok === false) return result;
  return {
    ...(result || {}),
    syncedScores: syncResult.scores || [],
    syncedTotalScore: Number(syncResult.totalScore) || 0,
  };
}

async function syncAndFetch(levelScores, options) {
  var profile = getAuthorizedProfile(options && options.profile);
  logLeaderboard('syncAndFetch start', {
    hasProfile: !!profile,
    localLevelCount: levelScores && typeof levelScores === 'object'
      ? Object.keys(levelScores).length
      : 0,
  });
  var syncResult = profile
    ? await syncScore(levelScores, profile)
    : { ok: false, reason: 'profile-required' };
  logLeaderboard('syncAndFetch sync result', syncResult);
  if (syncResult && syncResult.ok === false && syncResult.reason === 'invalid-env') {
    return syncResult;
  }
  var result = await getLeaderboard(options && options.limit);
  logLeaderboard('syncAndFetch leaderboard result', {
    ok: result && result.ok,
    rowCount: result && result.rows ? result.rows.length : 0,
    hasSelf: !!(result && result.self),
    reason: result && result.reason,
  });
  if (result && result.ok === false) {
    return result;
  }
  if (syncResult && syncResult.ok === false) {
    if (syncResult.reason === 'profile-required') {
      return {
        ...(result || {}),
        ok: true,
        noUser: true,
        self: null,
      };
    }
    if (syncResult.reason === 'missing-openid') {
      return syncResult;
    }
    return syncResult;
  }
  return attachSyncResult(result, syncResult);
}

async function requestProfile() {
  var w = getWx();
  if (!w || typeof w.getUserProfile !== 'function') {
    warnLeaderboard('wx.getUserProfile is unavailable', '', 'profile-unsupported');
    return { ok: false, reason: 'unsupported', profile: null };
  }
  var privacy = await ensurePrivacyAuthorized(true);
  if (!privacy.ok) {
    return {
      ok: false,
      reason: privacy.reason,
      error: privacy.error,
      profile: getStoredProfile(),
    };
  }
  return new Promise(function (resolve) {
    w.getUserProfile({
      desc: '\u6392\u884c\u699c\u5c55\u793a',
      success: function (res) {
        var profile = profileFromUserInfo(res && res.userInfo);
        if (!profile) {
          warnLeaderboard('profile authorization returned empty userInfo', res, 'empty-user-info');
          resolve({ ok: false, reason: 'empty-user-info', profile: getStoredProfile() });
          return;
        }
        resolve({ ok: true, profile: profile });
      },
      fail: function (err) {
        var reason = getPrivacyErrorReason(err);
        warnLeaderboard('wx.getUserProfile failed', err, 'get-user-profile-failed');
        if (reason === 'privacy-undeclared') {
          resolve({
            ok: false,
            reason: reason,
            error: err,
            profile: getStoredProfile(),
          });
          return;
        }
        if (w && typeof w.getUserInfo === 'function') {
          w.getUserInfo({
            withCredentials: false,
            success: function (res) {
              var profile = profileFromUserInfo(res && res.userInfo);
              if (!profile) {
                warnLeaderboard('wx.getUserInfo returned empty userInfo', res, 'empty-get-user-info');
                resolve({ ok: false, reason: 'empty-user-info', profile: getStoredProfile() });
                return;
              }
              resolve({ ok: true, profile: profile });
            },
            fail: function (fallbackErr) {
              var fallbackReason = getPrivacyErrorReason(fallbackErr);
              warnLeaderboard('wx.getUserInfo failed after profile request', fallbackErr, 'fallback-get-user-info-failed');
              resolve({
                ok: false,
                reason: fallbackReason,
                error: fallbackErr || err,
                profile: getStoredProfile(),
              });
            },
          });
          return;
        }
        resolve({
          ok: false,
          reason: 'cancelled',
          error: err,
          profile: getStoredProfile(),
        });
      },
    });
  });
}

export const LeaderboardClient = {
  isSupported: hasCloud,
  init: initCloud,
  getStoredProfile: getStoredProfile,
  getAuthorizedProfile: getAuthorizedProfile,
  refreshProfileFromCache: refreshProfileFromCache,
  saveProfile: saveProfile,
  requestProfile: requestProfile,
  syncScore: syncScore,
  getLeaderboard: getLeaderboard,
  syncAndFetch: syncAndFetch,
};
