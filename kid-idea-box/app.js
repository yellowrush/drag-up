const form = document.querySelector('#idea-form')
const ideaInput = document.querySelector('#idea')
const playtestInput = document.querySelector('#playtest')
const submitButton = document.querySelector('#submit-button')
const refreshButton = document.querySelector('#refresh-button')
const formStatus = document.querySelector('#form-status')
const issueList = document.querySelector('#issue-list')

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
    const response = await fetch('/api/issues')
    const data = await response.json()
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
  const idea = ideaInput.value.trim()
  const playtest = playtestInput.value.trim()

  if (idea.length < 6) {
    setStatus('再多写一点点，至少 6 个字。', true)
    ideaInput.focus()
    return
  }

  submitButton.disabled = true
  setStatus('正在发送...', false)

  try {
    const response = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, playtest }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || '发送失败')
    }

    form.reset()
    setStatus(`收到啦！任务 #${data.issue.number} 已经创建。`, false)
    await loadIssues()
  } catch (error) {
    setStatus(`发送失败：${error.message}`, true)
  } finally {
    submitButton.disabled = false
  }
})

refreshButton.addEventListener('click', loadIssues)
loadIssues()
