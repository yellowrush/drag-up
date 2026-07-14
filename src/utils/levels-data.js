// Level definitions extracted from original game's <pre> tags
// Each level has: id, label (display name), blurb, text (front matter + --- + maze grid)
// Total: 61 levels, fully ported from original dragUp game

export const LEVELS = [
  {
    id: 'intro-fixed1',
    label: '教程 1 · 拖动小猫',
    blurb: '教程',
    text: 'instruction: 拖到猫盒子\n---\n*=.=.\n    !\n. . .\n    !\n@=.=.',
  },
  {
    id: 'intro-fixed2',
    label: '教程 2 · 旋转网格',
    blurb: '教程',
    text: 'blurb: 教程\ninstruction: 拖动网格旋转。小猫和猫盒子随网格移动。橙色连线保持原地。\n---\n* . .\n    !\n. . .\n    !\n@=.=.',
  },
  {
    id: 'intro-fixed3',
    label: '教程 3 · 到达猫盒子',
    blurb: '★',
    text: 'blurb: ★\n---\n@=. .\n\n. . .\n    !\n*=. .',
  },
  {
    id: 'intro-free1',
    label: '教程 4 · 蓝色连接',
    blurb: '教程',
    text: 'blurb: 教程\ninstruction: 蓝色连线随网格移动。旋转网格以不同方式连接蓝色和橙色连线。\n---\n@-. .\n!   |\n. . .\n    |\n*-.-.',
  },
  {
    id: 'm3x3-2-med',
    label: '3×3 · 中等',
    blurb: '★',
    text: 'blurb: ★\n---\n. . *\n| | |\n. . .\n| | |\n@ .=.',
  },
  {
    id: 'm3x3-fixed-switch',
    label: '3×3 · 切换',
    blurb: '★',
    text: 'blurb: ★\n---\n*=.-.\n\n. . .\n    |\n@-. .',
  },
  {
    id: 'm4x4-2',
    label: '4×4 · 挑战 1',
    blurb: '★',
    text: 'blurb: ★\n---\n. .=. .\n  | !\n. . .-*\n  |\n. . . .\n\n. @-. .',
  },
  {
    id: 'm4x4-1',
    label: '4×4 · 入门',
    blurb: '★',
    text: 'blurb: ★\n---\n. . . .\n\n* . . @\n  | ! |\n. . . .\n  !\n. . . .',
  },
  {
    id: 'm4x4-3',
    label: '4×4 · 挑战 2',
    blurb: '★',
    text: 'blurb: ★\n---\n. @ . .\n! |\n. . . .\n      |\n.=.=.-.\n|\n. * . .',
  },
  {
    id: 'm4x4-4',
    label: '4×4 · 挑战 3',
    blurb: '★',
    text: 'blurb: ★\n---\n. . . .\n\n* . . .\n    !\n. . .-.\n!\n.=.=. @',
  },
  {
    id: 'm4x4-5',
    label: '4×4 · 挑战 4',
    blurb: '★',
    text: 'blurb: ★\n---\n.-.-.-.\n|\n@ .-.-.\n\n* .=. .\n!   |\n.-.-. .',
  },
  {
    id: 'm4x4-6-med',
    label: '4×4 · 中等',
    blurb: '★',
    text: 'blurb: ★\n---\n. * . .\n\n.-.=. .\n  |\n. . . .\n!   |\n.=. @ .',
  },
  {
    id: 'm4x4-7-hard1',
    label: '4×4 · 挑战 5',
    blurb: '★★',
    text: 'blurb: ★★\n---\n. . *-.\n\n.-.=. .\n      |\n.=. . .\n  | |\n@-.-.=.',
  },
  {
    id: 'm4x4-8-hard2',
    label: '4×4 · 挑战 6',
    blurb: '★★',
    text: 'blurb: ★★\n---\n.-@ .=.\n\n. . . .\n    |\n.-. .-*\n  |\n. .=.-.',
  },
  {
    id: 'm4x4-9-hard1',
    label: '4×4 · 挑战 7',
    blurb: '★★',
    text: 'blurb: ★★\n---\n. . .=.\n  !\n@-. .-.\n\n. .=. .\n\n. . * .',
  },
  {
    id: 'm4x4-10-hard1',
    label: '4×4 · 挑战 8',
    blurb: '★★',
    text: 'blurb: ★★\n---\n. @=. .\n  |\n. .-.-.\n\n.-.-.-.\n!     !\n. * . .',
  },
  {
    id: 'm5x5-3',
    label: '5×5 · 终极',
    blurb: '★',
    text: '. . . . .\n  | !\n. . .-. .\n  |\n. . . . *\n  |\n. . .=. .\n  |\n. @ . . .',
  },
  {
    id: 'm5x5-1',
    label: '5×5 · 入门 1',
    blurb: '★',
    text: '@-.-. .-.\n    |\n. . . . .\n\n. . .=. .\n\n. . . .=.\n    |\n. .=.-* .',
  },
  {
    id: 'm5x5-2',
    label: '5×5 · 入门 2',
    blurb: '★★',
    text: '. . . . .\n\n. .=.-. @\n|       !\n. . . .-.\n\n.=. . .=.\n!\n* . . . .',
  },
  {
    id: 'm5x5-4',
    label: '5×5 · 挑战 1',
    blurb: '★★',
    text: '. . . .-.\n      !\n. .-. . .\n  !     |\n.=. . . .\n|\n. . . . *\n|\n.-@=. .=.',
  },
  {
    id: 'm5x5-5',
    label: '5×5 · 挑战 2',
    blurb: '★★',
    text: '. . . . .\n\n. . .-. *\n    !\n. . .-. .\n\n.=. . . .\n    |\n. @-. . .',
  },
  {
    id: 'm5x5-6',
    label: '5×5 · 挑战 3',
    blurb: '★★',
    text: '. . .-.-.\n!   !\n. .=.-. .\n|\n. .-. .-@\n!\n* .=. . .\n      |\n.=. .-.=.',
  },
  {
    id: 'm5x5-7',
    label: '5×5 · 终极 1',
    blurb: '★★★',
    text: '.=* . @=.\n|\n. .=. . .\n|   | |\n.=. . .-.\n        |\n. . . .=.\n!\n. .-.-. .',
  },
  {
    id: 'm5x5-8',
    label: '5×5 · 终极 2',
    blurb: '★★★',
    text: '. * . .-.\n  |\n. . .=.-.\n!       |\n. . . . .\n\n. .-. .=.\n        |\n. . .=.-@',
  },
  {
    id: 'm5x5-9',
    label: '5×5 · 终极 3',
    blurb: '★★★',
    text: '.-.-. . .\n    |\n. . . .-@\n  !\n* . .-. .\n|   !\n.-. . .=.\n    |   !\n. . .=. .',
  },
  {
    id: 'm5x5-10',
    label: '5×5 · 挑战 4',
    blurb: '★★',
    text: '. . . . .\n\n. . . .-@\n  !\n* . .=. .\n|   !\n.-. . . .\n\n. . . . .',
  },
  {
    id: 'm5x5-11',
    label: '5×5 · 终极 4',
    blurb: '★★★',
    text: '. . . .=.\n  |\n. . . .=.\n|\n. . .-. .\n! |\n. .=. . .\n|   !   !\n.-@ . * .',
  },
  {
    id: 'm5x5-12',
    label: '5×5 · 挑战 5',
    blurb: '★★',
    text: '. . .=.=.\n\n. . . . .\n\n. . . . @\n\n. . . . .\n\n* . .=.=.',
  },
  {
    id: 'm6x6-1-hard1',
    label: '6×6 · 挑战 1',
    blurb: '★★★',
    text: '. . * . . .\n  ! | |\n. .-. .-. .\n          |\n. . . . .-.\n      | ! |\n. . .=. . .\n    |\n@-.-. .-. .\n          |\n. .=. . .-.',
  },
  {
    id: 'm6x6-2',
    label: '6×6 · 挑战 2',
    blurb: '★★★',
    text: '@ .=. . .=.\n  | | !\n. . . .=. .\n  |     |\n. . . .-. .\n|   !\n. . . . . *\n|     |\n.=. .-. . .\n  |   | |\n.-. . . .=.',
  },
  {
    id: 'm6x6-3',
    label: '6×6 · 挑战 3',
    blurb: '★★★',
    text: '.=. .=.-.-*\n  |\n.-. . . . .\n        | !\n. . .-.-. .\n!\n.-. .=.=. .\n\n@ .=. . . .\n  |     !\n. .-. .-. .',
  },
  {
    id: 'pivot-4x4-intro',
    label: '教程 5 · 绿色枢轴',
    blurb: '教程',
    text: 'instruction: 绿色连线随网格转动，但保持相同方向\n---\n. .-* .\n  |\n. . . .\n\n. .>. .\n\n. @ . .',
  },
  {
    id: 'pivot-5x5-2',
    label: '枢轴 · 入门',
    blurb: '★★',
    text: '. . .-.-@\n\n. .<. . .\n\n.>. . . .\n| !\n.-.-. . *\n  !\n. . . . .',
  },
  {
    id: 'pivot-5x5-swirly',
    label: '枢轴 · 漩涡',
    blurb: '★★★',
    text: '. . . . .\n      ^\n.<. . . *\n\n. . . . .\n\n@ . . .>.\n  v\n. . . . .',
  },
  {
    id: 'pivot-5x5-1',
    label: '枢轴 · 挑战 1',
    blurb: '★★★',
    text: '. .-. . .\n      ^\n. .<.=.=.\n\n.>. . .-@\n\n* . . .=.\n\n. . . . .',
  },
  {
    id: 'pivot-5x5-3',
    label: '枢轴 · 挑战 2',
    blurb: '★★',
    text: '.=. . .-*\n    v\n. . . . .\n\n. . .-.J.\n\n@-. . . .\n    v\n.<. . . .',
  },
  {
    id: 'pivot-5x5-4',
    label: '枢轴 · 挑战 3',
    blurb: '★★★',
    text: '.-.-. @>.\n!     ^\n. . . . .\n  |\n. . . . .\n  |\n. . . .=*\n    ^\n. . .-. .>',
  },
  {
    id: 'pivot-5x5-5',
    label: '枢轴 · 挑战 4',
    blurb: '★★★',
    text: '.-. . . *\n\n. .>. . .\n|       v\n.-. . . .\n  ^\n. . .-. .\n      v\n@=.=. . .',
  },
  {
    id: 'pivot-5x5-6',
    label: '枢轴 · 挑战 5',
    blurb: '★★★',
    text: '. . .>. .\n  ! |\n@=. .-. .\n\n. . . .=.>\n\n. . . . .\n\n. *>.<. .',
  },
  {
    id: 'pivot-5x5-7',
    label: '枢轴 · 挑战 6',
    blurb: '★★★',
    text: '* . @ . .\nv   |\n. . . . .\n      !\n. . . . .\n^     ! !\n. .-. . .\n  !\n. . . . .\n    v',
  },
  {
    id: 'pivot-6x6-1',
    label: '枢轴 · 6×6 挑战 1',
    blurb: '★★★',
    text: '. . . . . .\n| v\n@ . . . . *\n  | |\n. . . . . .\n| !   ^ | K\n. . . .-.=.\n|\n. .-. . . .\nv\n.>. . . . .',
  },
  {
    id: 'pivot-6x6-3',
    label: '枢轴 · 6×6 挑战 2',
    blurb: '★★★',
    text: '. @-. .>.-.\n\n. . . . . .\n          |\n* .>. .=. .\n    !\n. . . . . .>\n      |   ^\n. . . .=. .\n\n. .=. . .=.>',
  },
  {
    id: 'pivot-6x6-2',
    label: '枢轴 · 6×6 挑战 3',
    blurb: '★★★',
    text: '. .-.-. .=.\n      v\n. . . . . .\n  |     ! v\n.>. . . . *\n    ^\n. . . . . .\n|\n. .-.<. . .\n! |       |\n. . . .>.-@',
  },
  {
    id: 'm44',
    label: '综合 · 挑战 1',
    blurb: '★★',
    text: '. .=. *-.\n\n. . .=. .\n!\n. . . . .\n  |   !\n. . . . .\n  |     |\n. @ . .=.',
  },
  {
    id: 'm45',
    label: '综合 · 挑战 2',
    blurb: '★★',
    text: '@ * .>. .\n\n. .=.=. .\n|     |\n.>. . . .\n\n. . . .>.\n|\n.=. . .-.',
  },
  {
    id: 'm46',
    label: '综合 · 挑战 3',
    blurb: '★★★',
    text: '.-. . .\n    ^\n. . . .\n\n.L. . .\n      !\n@ . .-*',
  },
  {
    id: 'm47',
    label: '综合 · 入口流',
    blurb: '★★',
    text: '@ . . . . .\nv v v v v v\n. . . . . .\n\n. . . . . .\n\n. . . . . .\n  v v v v v\n. . . . . .\n\n. . . .=. *\nv v v v   v',
  },
  {
    id: 'm48',
    label: '综合 · 大迷宫',
    blurb: '★',
    text: '.-.<.>.=. .\nW !       |\n. . .A. . *\n    |   |\n. .=. . . .\n^ !\n. .D.-.=.=@\n          |\n. . .-.-. .\n|\n.#.=. .<. .\n    v     v',
  },
  {
    id: 'm49',
    label: '综合 · 挑战 4',
    blurb: '★★★',
    text: '. . .-@ .\n    |\n. . . .J.\n\n* . . . .\n| !     !\n. . . . .\n    v   !\n. . . .-.',
  },
  {
    id: 'm50',
    label: '综合 · 挑战 5',
    blurb: '★★★',
    text: '*=. . .\n    v\n. . . .\n^     |\n. . . .\n  ^   |\n@ .>. .',
  },
  {
    id: 'rotate-tut',
    label: '教程 6 · 红色固定',
    blurb: '教程',
    text: 'instruction: 红色连线固定位置，但随网格旋转\n---\n. . . .\n\n@ .4. .\n  |\n. . .-*\n\n. . . .',
  },
  {
    id: 'rotate1',
    label: '旋转 · 入门',
    blurb: '★',
    text: '. . .-*\n    |\n. . . .\n    5\n.4. . .\n|\n@ . . .',
  },
  {
    id: 'rotate2',
    label: '旋转 · 挑战 1',
    blurb: '★★',
    text: '@ .-.=.\n    |\n. . .4.\n    |\n* . . .\n|   |\n. . . .',
  },
  {
    id: 'rotate3',
    label: '旋转 · 挑战 2',
    blurb: '★★',
    text: '. . * .\n! 5 v\n. . . @\n  |\n. .4. .\n  !\n. . . .',
  },
  {
    id: 'rotate3b',
    label: '旋转 · 挑战 3',
    blurb: '★★',
    text: '* . . .\n! 5\n. . . @\n  |\n. .4. .\n  !\n. . . .',
  },
  {
    id: 'rotate-5x5-1',
    label: '旋转 · 5×5 挑战 1',
    blurb: '★★',
    text: '. . . .-@\n      8\n. .=. . .\n\n*=. . . .\n\n. .-. . .\n\n. . . . .',
  },
  {
    id: 'rotate-5x5-2',
    label: '旋转 · 5×5 挑战 2',
    blurb: '★★',
    text: '. . . . .\n\n. . . .6*\n  |\n. . . .=.\n  |\n.4. . . .\n        |\n. . . .-@',
  },
  {
    id: 'rotate-5x5-2b',
    label: '旋转 · 5×5 终极',
    blurb: '★★★',
    text: '. . . . .\n  !   |\n.-.-. . .\n  v   |\n. . .-. .\n\n@ . . . .\n    5\n. . .=* .',
  },
  {
    id: 'rotate-6x6-1',
    label: '旋转 · 6×6 挑战 1',
    blurb: '★★★',
    text: '@4.=. . . .\n\n. . . . . .\n      v 8 |\n.-.-. . . .\n!   !   ^\n. . . . . .\n\n. .>. . . .\n!\n* . .4. . .',
  },
  {
    id: 'rotate-6x6-2',
    label: '旋转 · 6×6 挑战 2',
    blurb: '★★★',
    text: '. . *<. . .\n\n.=. .-. . .\n        5\n. . . .-. .\n        |\n. . . . . .\n\n. . . . . .\n    5     |\n. .=. . @-.',
  },
  {
    id: 'rotate-6x6-3',
    label: '旋转 · 6×6 挑战 3',
    blurb: '★★★',
    text: '.4. . . . @\n!\n.-. . .=. .\n!\n. . . . . .\n!\n.>.6. . . .\n!\n. . . .=.-.\n      ^\n. . . . * .',
  },
];

// Build a lookup map by id
export const LEVEL_MAP = {};
LEVELS.forEach(function (level) {
  LEVEL_MAP[level.id] = level;
});

// Get next level id (returns string | null)
export function getNextLevel(currentId) {
  var index = LEVELS.findIndex(function (l) {
    return l.id === currentId;
  });
  if (index >= 0 && index < LEVELS.length - 1) {
    return LEVELS[index + 1].id;
  }
  return null;
}
