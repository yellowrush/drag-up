const form = document.querySelector('#idea-form')
const childNameInput = document.querySelector('#child-name')
const ideaInput = document.querySelector('#idea')
const playtestInput = document.querySelector('#playtest')
const imageInput = document.querySelector('#idea-image')
const clearPictureButton = document.querySelector('#clear-picture-button')
const drawingCanvas = document.querySelector('#drawing-canvas')
const imagePreview = document.querySelector('#image-preview')
const submitButton = document.querySelector('#submit-button')
const refreshButton = document.querySelector('#refresh-button')
const formStatus = document.querySelector('#form-status')
const issueList = document.querySelector('#issue-list')
const nameStorageKey = 'drag-up-kid-idea-name'
const maxImageDataLength = 45000
const apiBase = String(window.KID_IDEA_API_BASE || '').replace(/\/$/, '')
const issuesApiUrl = String(window.KID_IDEA_API_URL || '') || `${apiBase}/api/issues`

const drawingContext = drawingCanvas.getContext('2d')
let isDrawing = false
let hasDrawing = false
let uploadedImageDataUrl = ''

drawingContext.lineWidth = 7
drawingContext.lineCap = 'round'
drawingContext.lineJoin = 'round'
drawingContext.strokeStyle = '#17202a'
clearDrawingCanvas()

const savedName = localStorage.getItem(nameStorageKey)
if (savedName) {
  childNameInput.value = savedName
}

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
  let quality = 0.78
  let compressed = resizeImageToDataUrl(image, 900, 900, quality)
  while (compressed.length > maxImageDataLength && quality > 0.38) {
    quality -= 0.1
    compressed = resizeImageToDataUrl(image, 720, 720, quality)
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
      throw new Error('API 路径返回了网页，请检查 CloudBase 是否把 /api/issues 绑定到 kidIdeaIssues 云函数。')
    }
    throw new Error('API 没有返回 JSON，请检查 CloudBase 函数访问地址。')
  }

  try {
    return text ? JSON.parse(text) : {}
  } catch (_) {
    throw new Error('API 返回内容不是有效 JSON。')
  }
}

function renderIssues(issues) {
  if (!issues.length) {
    issueList.innerHTML = '<p class="empty">还没有任务。发送第一个想法试试看。</p>'
    return
  }

  issueList.innerHTML = issues
    .map(issue => {
      const labels = (issue.labels || [])
        .slice(0, 5)
        .map(label => `<span class="label-chip">${escapeHtml(label)}</span>`)
        .join('')
      const stateText = issue.state === 'closed' ? '已完成/关闭' : '进行中'
      const safeUrl = escapeHtml(issue.url)
      const safeTitle = escapeHtml(issue.title)

      return `
        <article class="issue-item">
          <div class="issue-top">
            <a class="issue-title" href="${safeUrl}" target="_blank" rel="noreferrer">
              #${issue.number} ${safeTitle}
            </a>
            <span class="badge ${issue.state === 'closed' ? 'closed' : ''}">${stateText}</span>
          </div>
          <p class="issue-meta">创建：${formatDate(issue.createdAt)} · 更新：${formatDate(issue.updatedAt)}</p>
          <div class="labels">${labels}</div>
        </article>
      `
    })
    .join('')
}

async function loadIssues() {
  issueList.innerHTML = '<p class="empty">正在读取任务列表...</p>'
  try {
    const response = await fetch(issuesApiUrl)
    const data = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(data.error || '读取任务失败')
    }
    renderIssues(data.issues || [])
  } catch (error) {
    issueList.innerHTML = `<p class="empty">暂时读不到任务列表：${error.message}</p>`
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault()
  const childName = childNameInput.value.trim()
  const idea = ideaInput.value.trim()
  const playtest = playtestInput.value.trim()

  if (childName.length < 1) {
    setStatus('先写一下你的名字，这样以后生成任务会固定用这个名字。', true)
    childNameInput.focus()
    return
  }

  if (idea.length < 6) {
    setStatus('再多写一点点，至少 6 个字。', true)
    ideaInput.focus()
    return
  }

  submitButton.disabled = true
  setStatus('正在发送...', false)

  try {
    const imageDataUrl = await getPictureDataUrl()
    localStorage.setItem(nameStorageKey, childName)
    const response = await fetch(issuesApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childName, idea, playtest, imageDataUrl }),
    })
    const data = await readJsonResponse(response)
    if (!response.ok) {
      throw new Error(data.error || '发送失败')
    }

    ideaInput.value = ''
    playtestInput.value = ''
    imageInput.value = ''
    uploadedImageDataUrl = ''
    imagePreview.hidden = true
    imagePreview.removeAttribute('src')
    clearDrawingCanvas()
    setStatus(`收到啦！任务 #${data.issue.number} 已经创建。`, false)
    await loadIssues()
  } catch (error) {
    setStatus(`发送失败：${error.message}`, true)
  } finally {
    submitButton.disabled = false
  }
})

childNameInput.addEventListener('input', () => {
  const childName = childNameInput.value.trim()
  if (childName) {
    localStorage.setItem(nameStorageKey, childName)
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
