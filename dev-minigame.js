const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')
const { copyProjectConfigWithEnvAppId } = require('./scripts/wechat-project-config')

const DIST = path.resolve(__dirname, 'dist/dev/minigame')
const OPEN_DATA_CONTEXT = path.resolve(__dirname, 'src/open-data-context')
const OPEN_DATA_CONTEXT_DIST = path.join(DIST, 'open-data-context')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  fs.readdirSync(src, { withFileTypes: true }).forEach(function (entry) {
    if (entry.name === 'node_modules') return
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  })
}

async function dev() {
  fs.mkdirSync(DIST, { recursive: true })

  fs.copyFileSync(
    path.resolve(__dirname, 'src/game.json'),
    path.join(DIST, 'game.json'),
  )

  copyProjectConfigWithEnvAppId(
    path.resolve(__dirname, 'src/project.config.minigame.json'),
    path.join(DIST, 'project.config.json'),
  )

  copyDir(OPEN_DATA_CONTEXT, path.join(DIST, 'open-data-context'))
  fs.watch(OPEN_DATA_CONTEXT, { recursive: true }, function () {
    copyDir(OPEN_DATA_CONTEXT, OPEN_DATA_CONTEXT_DIST)
  })

  const ctx = await esbuild.context({
    entryPoints: [path.resolve(__dirname, 'src/game.js')],
    outfile: path.join(DIST, 'game.js'),
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2015',
    minify: false,
    sourcemap: true,
  })

  await ctx.watch()
  console.log('Watching minigame for changes... Output:', DIST)
}

dev().catch(err => {
  console.error('Dev build failed:', err)
  process.exit(1)
})
