// Script to generate solution paths for all levels
// Run: node src/utils/solve-levels.js

import { LEVELS } from './levels-data.js'
import { Maze } from './maze.js'

function bfs(maze) {
  var start = maze.startPosition
  var goal = maze.goalPosition
  if (!start || !goal) return null

  var orientations = ['noon', 'three', 'six', 'nine']

  // Build adjacency: for each peg, find all pegs it connects to (across all orientations)
  var adj = {}

  function addEdge(a, b) {
    var keyA = a.x + ',' + a.y
    var keyB = b.x + ',' + b.y
    if (!adj[keyA]) adj[keyA] = []
    if (adj[keyA].indexOf(keyB) === -1) adj[keyA].push(keyB)
    if (!adj[keyB]) adj[keyB] = []
    if (adj[keyB].indexOf(keyA) === -1) adj[keyB].push(keyA)
  }

  orientations.forEach(function(orientation) {
    var conns = maze.connections
    // Each connection key is "orientation:x,y" -> array of segments
    // We need to find segments that connect two pegs at this orientation
    var pegConnections = {}
    orientations.forEach(function(o) {
      Object.keys(conns).forEach(function(key) {
        var parts = key.split(':')
        var orient = parts[0]
        if (orient !== o) return
        var pegKey = parts[1]
        var segs = conns[key]
        if (!pegConnections[o]) pegConnections[o] = {}
        if (!pegConnections[o][pegKey]) pegConnections[o][pegKey] = []
        segs.forEach(function(seg) {
          if (pegConnections[o][pegKey].indexOf(seg) === -1) {
            pegConnections[o][pegKey].push(seg)
          }
        })
      })
    })

    // Now for each peg, find connected pegs via shared segment
    var pegKeys = Object.keys(pegConnections[orientation] || {})
    pegKeys.forEach(function(pegKey) {
      var segs = pegConnections[orientation][pegKey]
      segs.forEach(function(seg) {
        // Find other peg connected to this segment at this orientation
        var line = seg[orientation]
        var otherKey = (line.a.x === parseInt(pegKey.split(',')[0]) && line.a.y === parseInt(pegKey.split(',')[1]))
          ? line.b.x + ',' + line.b.y
          : line.a.x + ',' + line.a.y
        addEdge(
          { x: parseInt(pegKey.split(',')[0]), y: parseInt(pegKey.split(',')[1]) },
          { x: parseInt(otherKey.split(',')[0]), y: parseInt(otherKey.split(',')[1]) }
        )
      })
    })
  })

  // BFS from start to goal
  var startKey = start.x + ',' + start.y
  var goalKey = goal.x + ',' + goal.y

  if (startKey === goalKey) return [{ x: start.x, y: start.y }]

  var queue = [startKey]
  var visited = {}
  var parent = {}
  visited[startKey] = true

  while (queue.length > 0) {
    var current = queue.shift()
    var neighbors = adj[current] || []
    for (var i = 0; i < neighbors.length; i++) {
      var next = neighbors[i]
      if (!visited[next]) {
        visited[next] = true
        parent[next] = current
        if (next === goalKey) {
          // Reconstruct path
          var path = []
          var node = goalKey
          while (node !== startKey) {
            var parts = node.split(',')
            path.unshift({ x: parseInt(parts[0]), y: parseInt(parts[1]) })
            node = parent[node]
          }
          path.unshift({ x: start.x, y: start.y })
          return path
        }
        queue.push(next)
      }
    }
  }

  return null
}

// Process all levels
LEVELS.forEach(function(level, index) {
  var maze = new Maze()
  maze.loadText(level.text)

  // Skip tutorial levels (0-3) and pivot-4x4-intro and rotate-tut
  if (index <= 3 || level.id === 'pivot-4x4-intro' || level.id === 'rotate-tut') {
    level.solution = null
    return
  }

  var path = bfs(maze)
  level.solution = path
  if (path) {
    console.log('Level ' + index + ' (' + level.id + '): path found with ' + path.length + ' steps')
  } else {
    console.log('Level ' + index + ' (' + level.id + '): NO PATH FOUND')
  }
})

// Output only the path results for verification
console.log('\n=== SUMMARY ===')
LEVELS.forEach(function(level, index) {
  if (level.solution) {
    var pathStr = level.solution.map(function(p) { return '(' + p.x + ',' + p.y + ')' }).join(' -> ')
    console.log(index + ': ' + level.id + ': ' + pathStr)
  } else {
    console.log(index + ': ' + level.id + ': null')
  }
})
