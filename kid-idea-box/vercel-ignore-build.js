const { execFileSync } = require('child_process')

const WATCHED_PREFIX = 'kid-idea-box/'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function getChangedFiles() {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'HEAD'

  if (previousSha) {
    return git(['diff', '--name-only', previousSha, commitSha])
      .split(/\r?\n/)
      .filter(Boolean)
  }

  return git(['diff-tree', '--no-commit-id', '--name-only', '-r', commitSha])
    .split(/\r?\n/)
    .filter(Boolean)
}

try {
  const changedFiles = getChangedFiles()
  const shouldBuild = changedFiles.some(file => file.startsWith(WATCHED_PREFIX))

  if (shouldBuild) {
    console.log('Changes include kid-idea-box; Vercel should build.')
    process.exit(1)
  }

  console.log('No kid-idea-box changes; Vercel preview build can be ignored.')
  process.exit(0)
} catch (error) {
  console.log(`Could not inspect changed files; Vercel should build. ${error.message}`)
  process.exit(1)
}
