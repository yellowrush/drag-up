export const RUBIK_SCRATCH_LEVELS = [
  {
    id: 'scratch-rubik-tutorial-01',
    label: '\u732b\u6293\u677f 1\uff1a\u6559\u7a0b',
    blurb: 'rubik-scratch',
    size: 2,
    instruction:
      '\u62d6\u62fd\u65cb\u8f6c\u8ba9\u5c0f\u732b\u5230\u8fbe\u732b\u6293\u677f\u6240\u5728\u7684\u5e73\u9762',
    cat: {
      position: { x: 1, y: 1, z: 1 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -1, y: 1, z: 1 },
      normal: { x: 0, y: 0, z: 1 },
    },
  },
];

export const RUBIK_SCRATCH_LEVEL_MAP = {};
RUBIK_SCRATCH_LEVELS.forEach(function (level) {
  RUBIK_SCRATCH_LEVEL_MAP[level.id] = level;
});

export function getNextRubikScratchLevel(currentId) {
  var index = RUBIK_SCRATCH_LEVELS.findIndex(function (level) {
    return level.id === currentId;
  });
  if (index >= 0 && index < RUBIK_SCRATCH_LEVELS.length - 1) {
    return RUBIK_SCRATCH_LEVELS[index + 1].id;
  }
  return null;
}

export function getIsRubikScratchLevel(levelId) {
  return !!RUBIK_SCRATCH_LEVEL_MAP[levelId];
}
