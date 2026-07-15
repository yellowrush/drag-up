export const RUBIK_SCRATCH_LEVELS = [
  {
    id: 'scratch-rubik-tutorial-01',
    label: '\u732b\u6293\u677f 1\uff1a\u6559\u7a0b',
    blurb: 'rubik-scratch',
    size: 2,
    minTurns: 5,
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
  {
    id: 'scratch-rubik-locked-02',
    label: '\u732b\u6293\u677f 2\uff1a\u9501\u5b9a\u9762',
    blurb: 'rubik-scratch',
    size: 2,
    minTurns: 5,
    instruction:
      '\u5e26\u7981\u6b62\u56fe\u6807\u7684\u5c0f\u683c\u4e0d\u80fd\u62d6\u62fd\uff0c\u81f3\u5c11\u65cb\u8f6c 5 \u6b21\u540e\u5230\u8fbe\u732b\u6293\u677f\u3002',
    cat: {
      position: { x: 1, y: 1, z: 1 },
      normal: { x: 1, y: 0, z: 0 },
    },
    goal: {
      position: { x: -1, y: -1, z: 1 },
      normal: { x: 0, y: -1, z: 0 },
    },
    lockedSlots: [
      {
        position: { x: 1, y: 1, z: 1 },
        normal: { x: 0, y: 1, z: 0 },
      },
      {
        position: { x: 1, y: 1, z: -1 },
        normal: { x: 0, y: 0, z: -1 },
      },
    ],
  },
  {
    id: 'scratch-rubik-locked-03',
    label: '\u732b\u6293\u677f 3\uff1a\u7ed5\u5f00\u9501',
    blurb: 'rubik-scratch',
    size: 2,
    minTurns: 5,
    instruction:
      '\u907f\u5f00\u9501\u4f4f\u7684\u5c0f\u683c\uff0c\u4ece\u522b\u7684\u9762\u62d6\u62fd\u8f6c\u52a8\u3002',
    cat: {
      position: { x: 1, y: 1, z: -1 },
      normal: { x: 0, y: 0, z: -1 },
    },
    goal: {
      position: { x: -1, y: 1, z: -1 },
      normal: { x: -1, y: 0, z: 0 },
    },
    lockedSlots: [
      {
        position: { x: 1, y: 1, z: -1 },
        normal: { x: 0, y: 1, z: 0 },
      },
      {
        position: { x: -1, y: 1, z: 1 },
        normal: { x: -1, y: 0, z: 0 },
      },
      {
        position: { x: 1, y: -1, z: 1 },
        normal: { x: 0, y: -1, z: 0 },
      },
    ],
  },
  {
    id: 'scratch-rubik-wormhole-04',
    label: '\u732b\u6293\u677f 4\uff1a\u84dd\u8272\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 2,
    minTurns: 5,
    requiredWormholes: 1,
    instruction:
      '\u4e0a\u9762\u7684\u6d1e\u4f1a\u4ece\u6b63\u4e0b\u65b9\u51fa\u6765\uff0c\u81f3\u5c11\u8f6c 5 \u6b21\u540e\u8fdb\u6293\u677f\u3002',
    cat: {
      position: { x: 1, y: 1, z: 1 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -1, y: -1, z: 1 },
      normal: { x: 0, y: -1, z: 0 },
    },
    wormholes: [
      {
        id: 'blue',
        from: {
          position: { x: -1, y: 1, z: 1 },
          normal: { x: 0, y: 1, z: 0 },
        },
        to: {
          position: { x: -1, y: -1, z: 1 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-wormhole-05',
    label: '\u732b\u6293\u677f 5\uff1a\u5bf9\u9762\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 2,
    minTurns: 5,
    requiredWormholes: 1,
    instruction:
      '\u4ece\u53f3\u9762\u866b\u6d1e\u7a7f\u5230\u6b63\u5de6\u9762\uff0c\u518d\u628a\u5c0f\u732b\u9001\u5230\u732b\u6293\u677f\u3002',
    cat: {
      position: { x: -1, y: 1, z: 1 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -1, y: 1, z: -1 },
      normal: { x: -1, y: 0, z: 0 },
    },
    wormholes: [
      {
        id: 'violet',
        from: {
          position: { x: 1, y: 1, z: -1 },
          normal: { x: 1, y: 0, z: 0 },
        },
        to: {
          position: { x: -1, y: 1, z: -1 },
          normal: { x: -1, y: 0, z: 0 },
        },
      },
    ],
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
