var SCORE_KEY = 'dragUpTotalScoreV1';
var MAX_ROWS = 10;
var state = {
  width: 280,
  height: 240,
  dpr: 1,
  selfScore: 0,
  selfCompletedCount: 0,
  selfUpdatedAt: 0,
};

function getSharedCanvas() {
  if (typeof wx === 'undefined' || typeof wx.getSharedCanvas !== 'function') {
    return null;
  }
  return wx.getSharedCanvas();
}

function setupCanvas(width, height, dpr) {
  var canvas = getSharedCanvas();
  if (!canvas) return null;
  state.width = Math.max(1, Math.round(Number(width) || state.width));
  state.height = Math.max(1, Math.round(Number(height) || state.height));
  state.dpr = Math.max(1, Number(dpr) || 1);
  var ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  return ctx;
}

function getKvValue(row, key) {
  var list = row && row.KVDataList;
  if (!Array.isArray(list)) return '';
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].key === key) return list[i].value || '';
  }
  return '';
}

function parseScore(row, key) {
  var raw = getKvValue(row, key || SCORE_KEY);
  if (!raw) return null;
  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    data = { totalScore: Number(raw) || 0 };
  }
  var totalScore = Math.max(
    0,
    Math.round(Number(data && data.totalScore) || 0),
  );
  if (totalScore <= 0) return null;
  return {
    openid: row.openid || row.openId || '',
    nickname: row.nickname || row.nickName || '\u5fae\u4fe1\u73a9\u5bb6',
    avatarUrl: row.avatarUrl || '',
    totalScore: totalScore,
    completedCount: Math.max(0, Math.round(Number(data.completedCount) || 0)),
    updatedAt: Math.max(0, Number(data.updatedAt) || 0),
  };
}

function sortRows(a, b) {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (b.completedCount !== a.completedCount)
    return b.completedCount - a.completedCount;
  return a.updatedAt - b.updatedAt;
}

function drawRoundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
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

function clear(ctx) {
  ctx.clearRect(0, 0, state.width, state.height);
}

function drawMessage(ctx, text) {
  clear(ctx);
  ctx.fillStyle = '#34344f';
  drawRoundRect(ctx, 0, 0, state.width, state.height, 8);
  ctx.fill();
  ctx.fillStyle = '#aeb0c8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, state.width / 2, state.height / 2);
}

function getErrorText(err) {
  if (!err) return '';
  return String(err.errMsg || err.message || err.code || err).slice(0, 48);
}

function drawError(ctx, title, err) {
  var message = getErrorText(err);
  clear(ctx);
  ctx.fillStyle = '#34344f';
  drawRoundRect(ctx, 0, 0, state.width, state.height, 8);
  ctx.fill();
  ctx.fillStyle = '#aeb0c8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, state.width / 2, state.height / 2 - (message ? 10 : 0));
  if (message) {
    ctx.fillStyle = '#ffe8af';
    ctx.font = '10px sans-serif';
    ctx.fillText(truncateText(message, 30), state.width / 2, state.height / 2 + 13);
  }
  drawSelfSummary(ctx);
}

function drawAvatar(ctx, row, x, y, size) {
  ctx.fillStyle = '#222238';
  drawRoundRect(ctx, x, y, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = '#5c5f77';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!row.avatarUrl || typeof wx.createImage !== 'function') return;
  var image = wx.createImage();
  image.onload = function () {
    ctx.save();
    drawRoundRect(ctx, x, y, size, size, 8);
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);
    ctx.restore();
  };
  image.src = row.avatarUrl;
}

function truncateText(text, maxChars) {
  text = String(text || '');
  return text.length > maxChars
    ? text.slice(0, Math.max(0, maxChars - 1)) + '\u2026'
    : text;
}

function isSelfRow(row) {
  return (
    row.totalScore === state.selfScore &&
    row.completedCount === state.selfCompletedCount
  );
}

function drawRows(ctx, rows) {
  clear(ctx);
  ctx.fillStyle = '#23233a';
  drawRoundRect(ctx, 0, 0, state.width, state.height, 8);
  ctx.fill();

  var visible = rows.slice(0, MAX_ROWS);
  var rowH = 42;
  var gap = 6;
  var top = 2;
  visible.forEach(function (row, index) {
    var y = top + index * (rowH + gap);
    if (y + rowH > state.height) return;
    var self = isSelfRow(row);
    ctx.fillStyle = self ? '#3d3f51' : '#34344f';
    ctx.strokeStyle = self ? '#d5a544' : '#565873';
    ctx.lineWidth = 1.2;
    drawRoundRect(ctx, 0, y, state.width, rowH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe8af';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('#' + (index + 1), 9, y + rowH / 2 + 1);

    drawAvatar(ctx, row, 43, y + 7, 28);

    ctx.fillStyle = '#f2f2f7';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(truncateText(row.nickname, 8), 78, y + rowH / 2 + 1);

    ctx.fillStyle = '#ffe8af';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      String(row.totalScore || 0),
      state.width - 9,
      y + rowH / 2 + 1,
    );
  });
}

function drawSelfSummary(ctx) {
  if (!state.selfScore) return;
  var h = 34;
  var y = Math.max(0, state.height - h);
  ctx.fillStyle = '#2f2f50';
  drawRoundRect(ctx, 0, y, state.width, h, 8);
  ctx.fill();
  ctx.fillStyle = '#aeb0c8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u6211\u7684\u6210\u7ee9', 12, y + h / 2 + 1);
  ctx.fillStyle = '#ffe8af';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(state.selfScore), state.width - 12, y + h / 2 + 1);
}

function renderFriendLeaderboard(message) {
  SCORE_KEY = message.key || SCORE_KEY;
  state.selfScore = Math.max(0, Math.round(Number(message.selfScore) || 0));
  state.selfCompletedCount = Math.max(
    0,
    Math.round(Number(message.selfCompletedCount) || 0),
  );
  state.selfUpdatedAt = Math.max(0, Number(message.selfUpdatedAt) || 0);

  var ctx = setupCanvas(message.width, message.height, message.dpr);
  if (!ctx) return;
  drawMessage(ctx, '\u597d\u53cb\u699c\u52a0\u8f7d\u4e2d...');

  if (
    typeof wx === 'undefined' ||
    typeof wx.getFriendCloudStorage !== 'function'
  ) {
    drawMessage(
      ctx,
      '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u67e5\u770b\u597d\u53cb\u6392\u884c\u699c',
    );
    return;
  }

  var settled = false;
  var timeout = setTimeout(function () {
    if (settled) return;
    settled = true;
    drawMessage(ctx, '\u6682\u65e0\u597d\u53cb\u6210\u7ee9');
    drawSelfSummary(ctx);
  }, 3000);

  wx.getFriendCloudStorage({
    keyList: [SCORE_KEY],
    success: function (res) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      var rows = (res.data || [])
        .map(function (row) {
          return parseScore(row, SCORE_KEY);
        })
        .filter(Boolean)
        .sort(sortRows);
      if (!rows.length) {
        drawMessage(ctx, '\u6682\u65e0\u597d\u53cb\u6210\u7ee9');
        drawSelfSummary(ctx);
        return;
      }
      drawRows(ctx, rows);
      if (!rows.some(isSelfRow)) {
        drawSelfSummary(ctx);
      }
    },
    fail: function (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[open-data-context] getFriendCloudStorage failed', err);
      }
      drawError(ctx, '\u597d\u53cb\u699c\u52a0\u8f7d\u5931\u8d25', err);
    },
  });
}

if (typeof wx !== 'undefined' && typeof wx.onMessage === 'function') {
  wx.onMessage(function (message) {
    if (!message || !message.type) return;
    if (message.type === 'renderFriendLeaderboard') {
      renderFriendLeaderboard(message);
    } else if (message.type === 'hideFriendLeaderboard') {
      var ctx = setupCanvas(state.width, state.height, state.dpr);
      if (ctx) clear(ctx);
    }
  });
}
