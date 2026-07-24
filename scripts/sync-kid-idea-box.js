const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const shared = path.join(root, 'kid-idea-shared')

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}

function syncFrontend(targetDir) {
  ;['index.html', 'app.js', 'styles.css'].forEach(file => {
    copyFile(path.join(shared, file), path.join(root, targetDir, file))
  })
}

syncFrontend('kid-idea-box')
syncFrontend('kid-idea-box-cloudbase')

copyFile(path.join(shared, 'issue-core.js'), path.join(root, 'kid-idea-box', 'api', 'issue-core.js'))
copyFile(path.join(shared, 'vercel-issues.js'), path.join(root, 'kid-idea-box', 'api', 'issues.js'))

copyFile(path.join(shared, 'issue-core.js'), path.join(root, 'kid-idea-box-cloudbase', 'api', 'issue-core.js'))
copyFile(path.join(shared, 'vercel-issues.js'), path.join(root, 'kid-idea-box-cloudbase', 'api', 'issues.js'))

copyFile(path.join(shared, 'issue-core.js'), path.join(root, 'cloudfunctions', 'kidIdeaIssues', 'issue-core.js'))
copyFile(path.join(shared, 'cloudbase-index.js'), path.join(root, 'cloudfunctions', 'kidIdeaIssues', 'index.js'))

console.log('Synced kid idea box shared files.')
