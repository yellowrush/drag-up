export const SHARE_MINIGAME_QUERY = 'reward=share-minigame';
export const SHARE_MINIGAME_TITLE = '\u6765\u548c\u5c0f\u732b\u4e00\u8d77\u95ef\u5173\u5427';

export function getShareMinigamePayload() {
  return {
    title: SHARE_MINIGAME_TITLE,
    query: SHARE_MINIGAME_QUERY,
  };
}

export function isShareMinigameSupported() {
  return (
    typeof wx !== 'undefined' &&
    typeof wx.shareAppMessage === 'function'
  );
}

export function registerShareMinigame() {
  if (typeof wx === 'undefined') return false;
  if (typeof wx.showShareMenu === 'function') {
    try {
      wx.showShareMenu({
        withShareTicket: true,
      });
    } catch (e) {}
  }
  if (typeof wx.onShareAppMessage === 'function') {
    try {
      wx.onShareAppMessage(function () {
        return getShareMinigamePayload();
      });
    } catch (e) {}
  }
  return isShareMinigameSupported();
}

export function shareMinigame(callbacks) {
  callbacks = callbacks || {};
  if (!isShareMinigameSupported()) {
    if (callbacks.fail) callbacks.fail({ errMsg: 'shareAppMessage unavailable' });
    return { ok: false };
  }

  var failed = false;
  var granted = false;

  function grant(res) {
    if (granted) return;
    granted = true;
    if (callbacks.success) callbacks.success(res || {});
  }

  try {
    wx.shareAppMessage({
      ...getShareMinigamePayload(),
      success: function (res) {
        grant(res);
      },
      fail: function (err) {
        failed = true;
        if (callbacks.fail) callbacks.fail(err || {});
      },
      complete: function (res) {
        if (!failed) {
          grant(res);
        }
        if (callbacks.complete) callbacks.complete(res || {});
      },
    });
    return { ok: true };
  } catch (err) {
    if (callbacks.fail) callbacks.fail(err || {});
    return { ok: false, error: err };
  }
}
