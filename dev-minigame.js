const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const DIST = path.resolve(__dirname, 'dist/dev/minigame')

async function dev() {
  fs.mkdirSync(DIST, { recursive: true })

  fs.copyFileSync(
    path.resolve(__dirname, 'src/game.json'),
    path.join(DIST, 'game.json'),
  )

  fs.copyFileSync(
    path.resolve(__dirname, 'src/project.config.minigame.json'),
    path.join(DIST, 'project.config.json'),
  )

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
