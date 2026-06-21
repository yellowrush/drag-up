// Level definitions extracted from original game's <pre> tags
// Each level has: id, label (display name), blurb, text (front matter + --- + maze grid)

export const LEVELS = [
  {
    id: 'intro-fixed1',
    label: '教程 1 · 拖动小熊',
    blurb: '教程',
    text: 'instruction: 拖动小熊到星星\n---\n*=.=.\n    !\n. . .\n    !\n@=.=.'
  },
  {
    id: 'intro-fixed2',
    label: '教程 2 · 旋转网格',
    blurb: '教程',
    text: 'blurb: 教程\ninstruction: 拖动网格旋转。小熊和星星随网格移动。橙色连线保持原地。\n---\n* . .\n    !\n. . .\n    !\n@=.=.'
  },
  {
    id: 'intro-fixed3',
    label: '教程 3 · 到达星星',
    blurb: '★',
    text: 'blurb: ★\n---\n@=. .\n\n. . .\n    !\n*=. .'
  },
  {
    id: 'intro-free1',
    label: '教程 4 · 蓝色连接',
    blurb: '教程',
    text: 'blurb: 教程\ninstruction: 蓝色连线随网格移动。旋转网格以不同方式连接蓝色和橙色连线。\n---\n@-. .\n!   |\n. . .\n    |\n*-.-.'
  },
  {
    id: 'm3x3-2-med',
    label: '3×3 · 中等',
    blurb: '★',
    text: 'blurb: ★\n---\n. . *\n| | |\n. . .\n| | |\n@.=.'
  },
  {
    id: 'm3x3-fixed-switch',
    label: '3×3 · 切换',
    blurb: '★',
    text: 'blurb: ★\n---\n*=.-.\n\n. . .\n    |\n@-. .'
  },
  {
    id: 'm4x4-2',
    label: '4×4 · 挑战 1',
    blurb: '★',
    text: 'blurb: ★\n---\n. .=. .\n  | !\n. . .-*\n  |\n. . . .\n\n. @-. .'
  },
  {
    id: 'm4x4-1',
    label: '4×4 · 入门',
    blurb: '★',
    text: 'blurb: ★\n---\n. . . .\n\n* . . @\n  | ! |\n. . . .\n  !\n. . . .'
  },
  {
    id: 'm4x4-3',
    label: '4×4 · 挑战 2',
    blurb: '★',
    text: 'blurb: ★\n---\n. @ . .\n! |\n. . . .\n      |\n.=.=.-.\n|\n. * . .'
  },
  {
    id: 'm4x4-4',
    label: '4×4 · 挑战 3',
    blurb: '★',
    text: 'blurb: ★\n---\n. . . .\n\n* . . .\n    !\n. . .-.\n!\n.=.=. @'
  },
  {
    id: 'm4x4-5',
    label: '4×4 · 挑战 4',
    blurb: '★',
    text: 'blurb: ★\n---\n.-.-.-.\n|\n@ .-.-.\n\n* .=. .\n!   |\n.-.-. .'
  },
  {
    id: 'm4x4-6-med',
    label: '4×4 · 中等',
    blurb: '★',
    text: 'blurb: ★\n---\n. * . .\n\n.-.=. .\n  |\n. . . .\n!   |\n.=. @ .'
  },
  {
    id: 'pivot-4x4-intro',
    label: '教程 5 · 绿色枢轴',
    blurb: '教程',
    text: 'instruction: 绿色连线随网格转动，但保持相同方向\n---\n. .-* .\n  |\n. . . .\n\n. .>. .\n\n. @ . .'
  },
  {
    id: 'rotate-tut',
    label: '教程 6 · 红色固定',
    blurb: '教程',
    text: 'instruction: 红色连线固定位置，但随网格旋转\n---\n. . . .\n\n@ .4. .\n  |\n. . .-*\n\n. . . .'
  },
  {
    id: 'm5x5-3',
    label: '5×5 · 终极',
    blurb: '★',
    text: '. . . . .\n  | !\n. . .-. .\n  |\n. . . . *\n  |\n. . .=. .\n  |\n. @ . . .'
  }
]

// Build a lookup map by id
export const LEVEL_MAP = {}
LEVELS.forEach(function(level) {
  LEVEL_MAP[level.id] = level
})

// Get level ids in order
export function getLevelIds() {
  return LEVELS.map(function(l) { return l.id })
}

// Get next level id (returns string | null)
export function getNextLevel(currentId) {
  var index = LEVELS.findIndex(function(l) { return l.id === currentId })
  if (index >= 0 && index < LEVELS.length - 1) {
    return LEVELS[index + 1].id
  }
  return null
}
