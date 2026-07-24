const form = document.querySelector('#idea-form')
const tabs = Array.from(document.querySelectorAll('.tab'))
const panels = Array.from(document.querySelectorAll('.tab-panel'))
const childNameInput = document.querySelector('#child-name')
const titleInput = document.querySelector('#title')
const reasonInput = document.querySelector('#reason')
const playtestFocusInput = document.querySelector('#playtest-focus')
const imageInput = document.querySelector('#idea-image')
const clearPictureButton = document.querySelector('#clear-picture-button')
const drawingCanvas = document.querySelector('#drawing-canvas')
const imagePreview = document.querySelector('#image-preview')
const mechanicsOptions = document.querySelector('#mechanics-options')
const submitButton = document.querySelector('#submit-button')
const refreshButton = document.querySelector('#refresh-button')
const formStatus = document.querySelector('#form-status')
const issueList = document.querySelector('#issue-list')

const nameStorageKey = 'drag-up-kid-idea-name'
const activeTabStorageKey = 'drag-up-kid-idea-tab'
const maxImageDataLength = 56000
const configuredApiUrl = String(window.KID_IDEA_API_URL || '').trim()
const apiBase = String(window.KID_IDEA_API_BASE || '').replace(/\/$/, '')
const issueApiUrl = configuredApiUrl || `${apiBase}/api/issues`

const drawingContext = drawingCanvas.getContext('2d')
let activeTab = localStorage.getItem(activeTabStorageKey) || 'new-level'
let isDrawing = false
let hasDrawing = false
let uploadedImageDataUrl = ''

const taskLabels = {
  'new-level': '新建关卡',
  'edit-level': '编辑关卡',
  'reward-task': '新建任务',
  'reward-item': '奖励品',
  'game-system': '游戏系统',
}

const mechanicsByWorld = {
  'cat-box': [
    '旋转网格',
    '蓝色连线',
    '橙色固定线',
    '绿色枢轴',
    '红色固定旋转线',
    '综合路线',
    '更大网格',
  ],
  'cat-scratcher': [
    '魔方转面',
    '箭头面',
    '虫洞',
    '猫爪确认',
    '重力面',
    '锁定/换面',
    '2/3/4 阶尺寸',
  ],
  'yarn-ball': [
    '时间倒退',
    '时间暂停',
    '裂桥',
    '地刺',
    '按钮门',
    '旋转桥',
    '升降/移动平台',
    '多层地图',
    '两条路线',
  ],
}

drawingContext.lineWidth = 7
drawingContext.lineCap = 'round'
drawingContext.lineJoin = 'round'
drawingContext.strokeStyle = '#17202a'
clearDrawingCanvas()

const savedName = localStorage.getItem(nameStorageKey)
if (savedName) childNameInput.value = savedName
setActiveTab(activeTab)

function setStatus(message, isError) {
  formStatus.textContent = message
  formStatus.classList.toggle('error', Boolean(isError))
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getActivePanel() {
  return document.querySelector(`.tab-panel[data-panel="${activeTab}"]`)
}

function setActiveTab(tabId) {
  if (!taskLabels[tabId]) tabId = 'new-level'
  activeTab = tabId
  localStorage.setItem(activeTabStorageKey, activeTab)
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === activeTab))
  panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === activeTab))
  refreshConditionalFields()
}

function getFieldValue(fieldName) {
  const panel = getActivePanel()
  if (!panel) return ''
  const input = panel.querySelector(`[data-field="${fieldName}"]`)
  return input ? String(input.value || '').trim() : ''
}

function refreshConditionalFields() {
  refreshMechanicsOptions()
  document.querySelectorAll('.conditional').forEach(block => {
    const rule = block.dataset.showWhen || ''
    const parts = rule.split(':')
    const visible = parts.length === 2 && getFieldValue(parts[0]) === parts[1]
    block.classList.toggle('active', visible)
  })
  const rewardType = getFieldValue('rewardItemType')
  document.querySelectorAll('.sticker-fields').forEach(block => {
    block.classList.toggle('active', rewardType === 'sticker')
  })
}

function refreshMechanicsOptions() {
  if (!mechanicsOptions) return
  const world = getFieldValue('gameWorld')
  const allowed = mechanicsByWorld[world] || []
  const selected = Array.from(mechanicsOptions.querySelectorAll('[data-array-field="mechanics"]:checked'))
    .map(input => input.value)

  if (!allowed.length) {
    mechanicsOptions.innerHTML = '<p class="helper">先选择游戏世界。</p>'
    return
  }

  mechanicsOptions.innerHTML = allowed.map(mechanic => {
    const checked = selected.includes(mechanic) ? ' checked' : ''
    return `<label><input type="checkbox" data-array-field="mechanics" value="${escapeHtml(mechanic)}"${checked} />${escapeHtml(mechanic)}</label>`
  }).join('')
}

function clearDrawingCanvas() {
  drawingContext.fillStyle = '#fff'
  drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height)
  hasDrawing = false
}

function canvasPoint(event) {
  const rect = drawingCanvas.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * drawingCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * drawingCanvas.height,
  }
}

function startDrawing(event) {
  event.preventDefault()
  drawingCanvas.setPointerCapture(event.pointerId)
  const point = canvasPoint(event)
  isDrawing = true
  hasDrawing = true
  drawingContext.beginPath()
  drawingContext.moveTo(point.x, point.y)
}

function draw(event) {
  if (!isDrawing) return
  event.preventDefault()
  const point = canvasPoint(event)
  drawingContext.lineTo(point.x, point.y)
  drawingContext.stroke()
}

function stopDrawing(event) {
  if (!isDrawing) return
  event.preventDefault()
  isDrawing = false
  drawingContext.closePath()
}

function resizeImageToDataUrl(source, maxWidth, maxHeight, quality) {
  const scale = Math.min(1, maxWidth / source.naturalWidth, maxHeight / source.naturalHeight)
  const width = Math.max(1, Math.round(source.naturalWidth * scale))
  const height = Math.max(1, Math.round(source.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败'))
    image.src = dataUrl
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function compressDataUrl(dataUrl) {
  const image = await loadImage(dataUrl)
  let quality = 0.76
  let maxSize = 900
  let compressed = resizeImageToDataUrl(image, maxSize, maxSize, quality)
  while (compressed.length > maxImageDataLength && quality > 0.36) {
    quality -= 0.1
    maxSize = Math.max(560, maxSize - 120)
    compressed = resizeImageToDataUrl(image, maxSize, maxSize, quality)
  }
  if (compressed.length > maxImageDataLength) {
    throw new Error('图片有点大，请换一张简单一点的图。')
  }
  return compressed
}

async function getPictureDataUrl() {
  if (uploadedImageDataUrl) return uploadedImageDataUrl
  if (!hasDrawing) return ''
  return compressDataUrl(drawingCanvas.toDataURL('image/png'))
}

async function readJsonResponse(response) {
  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const preview = text.trim().slice(0, 40)
    if (preview.startsWith('<')) {
      throw new Error('API 返回了网页，请检查 API 地址是否指向云函数或 Vercel API。')
    }
    throw new Error(`API 没有返回 JSON（${response.status}）。`)
  }
  try {
    const data = text ? JSON.parse(text) : {}
    if (!response.ok && !data.error && (data.message || data.code)) {
      data.error = data.message || data.code
    }
    return data
  } catch (_) {
    throw new Error('API 返回内容不是有效 JSON。')
  }
}

function renderIssues(issues) {
  if (!issues.length) {
    issueList.innerHTML = '<p class="empty">还没有任务。发送第一个任务试试看。</p>'
    return
  }
  issueList.innerHTML = issues.map(issue => {
    const labels = (issue.labels || [])
      .slice(0, 7)
      .map(label => `<span class="label-chip">${escapeHtml(label)}</span>`)
      .join('')
    const stateText = issue.state === 'closed' ? '已完成/关闭' : '进行中'
    return `
      <article class="issue-item">
        <div class="issue-top">
          <a class="issue-title" href="${escapeHtml(issue.url)}" target="_blank" rel="noreferrer">
            #${issue.number} ${escapeHtml(issue.title)}
          </a>
          <span class="badge ${issue.state === 'closed' ? 'closed' : ''}">${stateText}</span>
        </div>
        <p class="issue-meta">创建：${formatDate(issue.createdAt)} · 更新：${formatDate(issue.updatedAt)}</p>
        <div class="labels">${labels}</div>
      </article>
    `
  }).join('')
}

async function loadIssues() {
  issueList.innerHTML = '<p class="empty">正在读取任务列表...</p>'
  try {
    const response = await fetch(issueApiUrl)
    const data = await readJsonResponse(response)
    if (!response.ok) throw new Error(data.error || data.message || '读取任务失败')
    renderIssues(data.issues || [])
  } catch (error) {
    issueList.innerHTML = `<p class="empty">暂时读不到任务列表：${escapeHtml(error.message)}</p>`
  }
}

function collectFields() {
  const panel = getActivePanel()
  const fields = {}
  if (!panel) return fields
  panel.querySelectorAll('[data-field]').forEach(input => {
    fields[input.dataset.field] = String(input.value || '').trim()
  })
  panel.querySelectorAll('[data-array-field]').forEach(input => {
    if (!input.checked) return
    const name = input.dataset.arrayField
    if (!fields[name]) fields[name] = []
    fields[name].push(input.value)
  })
  return fields
}

function findFirstInvalid(payload) {
  if (!payload.childName) return childNameInput
  if (payload.title.length < 4) return titleInput
  if (payload.reason.length < 4) return reasonInput
  if (payload.playtestFocus.length < 4) return playtestFocusInput
  const fields = payload.fields
  const panel = getActivePanel()
  const requiredByTab = {
    'new-level': ['gameWorld', 'levelKind', 'levelGoal', 'difficulty', 'routeRequirement', 'instructionCopy'],
    'edit-level': ['gameWorld', 'targetLevel', 'changeType', 'currentProblem', 'desiredChange'],
    'reward-task': ['rewardTaskType', 'completionCondition', 'rewardContent', 'releaseState'],
    'reward-item': ['rewardOperation', 'rewardItemType', 'rewardName', 'appearance', 'unlockMethod'],
    'game-system': ['systemType', 'entryPoint', 'playerAction', 'dataStorage'],
  }
  const required = requiredByTab[activeTab] || []
  for (const name of required) {
    if (!fields[name]) return panel.querySelector(`[data-field="${name}"]`)
  }
  if (activeTab === 'new-level') {
    if (!fields.mechanics?.length && !fields.mechanicsOther) {
      return panel.querySelector('[data-array-field="mechanics"]') || panel.querySelector('[data-field="mechanicsOther"]')
    }
    if (fields.levelKind === 'tutorial' && !fields.teachingMechanism) {
      return panel.querySelector('[data-field="teachingMechanism"]')
    }
    if (fields.levelKind === 'challenge' && !fields.challengePoint) {
      return panel.querySelector('[data-field="challengePoint"]')
    }
  }
  if (activeTab === 'reward-item' && fields.rewardItemType === 'sticker') {
    for (const name of ['stickerWorld', 'stickerLevel', 'stickerCamera']) {
      if (!fields[name]) return panel.querySelector(`[data-field="${name}"]`)
    }
  }
  return null
}

function clearAfterSubmit() {
  titleInput.value = ''
  reasonInput.value = ''
  playtestFocusInput.value = ''
  getActivePanel().querySelectorAll('input, select, textarea').forEach(input => {
    if (input.type === 'checkbox') {
      input.checked = false
    } else {
      input.value = ''
    }
  })
  imageInput.value = ''
  uploadedImageDataUrl = ''
  imagePreview.hidden = true
  imagePreview.removeAttribute('src')
  clearDrawingCanvas()
  refreshConditionalFields()
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab))
})

document.addEventListener('input', event => {
  if (event.target === childNameInput) {
    const childName = childNameInput.value.trim()
    if (childName) localStorage.setItem(nameStorageKey, childName)
  }
  if (event.target.matches('[data-field], [data-array-field]')) refreshConditionalFields()
})

document.addEventListener('change', event => {
  if (event.target.matches('[data-field], [data-array-field]')) refreshConditionalFields()
})

form.addEventListener('submit', async event => {
  event.preventDefault()
  const payload = {
    childName: childNameInput.value.trim(),
    taskTab: activeTab,
    title: titleInput.value.trim(),
    reason: reasonInput.value.trim(),
    playtestFocus: playtestFocusInput.value.trim(),
    fields: collectFields(),
    imageDataUrl: '',
  }

  const invalid = findFirstInvalid(payload)
  if (invalid) {
    setStatus('还有必填内容没写完。', true)
    invalid.focus()
    return
  }

  submitButton.disabled = true
  setStatus('正在发送...', false)

  try {
    payload.imageDataUrl = await getPictureDataUrl()
    localStorage.setItem(nameStorageKey, payload.childName)
    const response = await fetch(issueApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await readJsonResponse(response)
    if (!response.ok) throw new Error(data.error || data.message || '发送失败')
    clearAfterSubmit()
    setStatus(`收到啦！任务 #${data.issue.number} 已经创建。`, false)
    await loadIssues()
  } catch (error) {
    setStatus(`发送失败：${error.message}`, true)
  } finally {
    submitButton.disabled = false
  }
})

imageInput.addEventListener('change', async () => {
  const file = imageInput.files && imageInput.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    setStatus('请选择图片文件。', true)
    imageInput.value = ''
    return
  }
  try {
    setStatus('正在准备图片...', false)
    uploadedImageDataUrl = await compressDataUrl(await readFileAsDataUrl(file))
    imagePreview.src = uploadedImageDataUrl
    imagePreview.hidden = false
    setStatus('图片准备好了。', false)
  } catch (error) {
    uploadedImageDataUrl = ''
    imageInput.value = ''
    imagePreview.hidden = true
    imagePreview.removeAttribute('src')
    setStatus(error.message, true)
  }
})

clearPictureButton.addEventListener('click', () => {
  imageInput.value = ''
  uploadedImageDataUrl = ''
  imagePreview.hidden = true
  imagePreview.removeAttribute('src')
  clearDrawingCanvas()
  setStatus('图片已清空。', false)
})

drawingCanvas.addEventListener('pointerdown', startDrawing)
drawingCanvas.addEventListener('pointermove', draw)
drawingCanvas.addEventListener('pointerup', stopDrawing)
drawingCanvas.addEventListener('pointercancel', stopDrawing)
drawingCanvas.addEventListener('pointerleave', stopDrawing)
refreshButton.addEventListener('click', loadIssues)
loadIssues()
