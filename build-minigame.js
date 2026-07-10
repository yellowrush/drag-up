const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const DIST = path.resolve(__dirname, 'dist/build/minigame')

async function build() {
  fs.mkdirSync(DIST, { recursive: true })

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src/game.js')],
    outfile: path.join(DIST, 'game.js'),
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    target: 'es2015',
    minify: true,
  })

  fs.copyFileSync(
    path.resolve(__dirname, 'src/game.json'),
    path.join(DIST, 'game.json'),
  )

  fs.copyFileSync(
    path.resolve(__dirname, 'src/project.config.minigame.json'),
    path.join(DIST, 'project.config.json'),
  )

  console.log('Mini-game build complete:', DIST)
}

build().catch(err => {
  console.error('Build failed:', err)
  process.exit(1)
})
