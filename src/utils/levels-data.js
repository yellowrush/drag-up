// Level definitions extracted from original game's <pre> tags
// Each level has: id, blurb, text (front matter + --- + maze grid)

export const LEVELS = [
  {
    id: 'intro-fixed1',
    blurb: 'Tutorial',
    text: 'instruction: Drag bear to star\n---\n*=.=.\n    !\n. . .\n    !\n@=.=.'
  },
  {
    id: 'intro-fixed2',
    blurb: 'Tutorial',
    text: 'blurb: Tutorial\ninstruction: Drag grid to rotate. Cub and star moves with grid. Orange links stay in place.\n---\n* . .\n    !\n. . .\n    !\n@=.=.'
  },
  {
    id: 'intro-fixed3',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n@=. .\n\n. . .\n    !\n*=. .'
  },
  {
    id: 'intro-free1',
    blurb: 'Tutorial',
    text: 'blurb: Tutorial\ninstruction: Blue links move with grid. Rotate grid to connect blue and orange links in different ways.\n---\n@-. .\n!   |\n. . .\n    |\n*-.-.'
  },
  {
    id: 'm3x3-2-med',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. . *\n| | |\n. . .\n| | |\n@ .=.'
  },
  {
    id: 'm3x3-fixed-switch',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n*=.-.\n\n. . .\n    |\n@-. .'
  },
  {
    id: 'm4x4-2',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. .=. .\n  | !\n. . .-*\n  |\n. . . .\n\n. @-. .'
  },
  {
    id: 'm4x4-1',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. . . .\n\n* . . @\n  | ! |\n. . . .\n  !\n. . . .'
  },
  {
    id: 'm4x4-3',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. @ . .\n! |\n. . . .\n      |\n.=.=.-.\n|\n. * . .'
  },
  {
    id: 'm4x4-4',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. . . .\n\n* . . .\n    !\n. . .-.\n!\n.=.=. @'
  },
  {
    id: 'm4x4-5',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n.-.-.-.\n|\n@ .-.-.\n\n* .=. .\n!   |\n.-.-. .'
  },
  {
    id: 'm4x4-6-med',
    blurb: '\u2605',
    text: 'blurb: \u2605\n---\n. * . .\n\n.-.=. .\n  |\n. . . .\n!   |\n.=. @ .'
  },
  {
    id: 'pivot-4x4-intro',
    blurb: 'Tutorial',
    text: 'instruction: Green links pivot with grid, but point in the same direction\n---\n. .-* .\n  |\n. . . .\n\n. .>. .\n\n. @ . .'
  },
  {
    id: 'rotate-tut',
    blurb: 'Tutorial',
    text: 'instruction: Red links are fixed in place, but rotate with grid\n---\n. . . .\n\n@ .4. .\n  |\n. . .-*\n\n. . . .'
  },
  {
    id: 'm5x5-3',
    blurb: '\u2605',
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

// Get next level id
export function getNextLevel(currentId) {
  var index = LEVELS.findIndex(function(l) { return l.id === currentId })
  if (index >= 0 && index < LEVELS.length - 1) {
    return LEVELS[index + 1].id
  }
  return null
}
