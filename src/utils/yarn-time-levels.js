export const YARN_TIME_LEVELS = [
  {
    id: 'yarn-time-demo-01',
    label: '毛线球 1：倒退',
    blurb: 'yarn-time',
    instruction: '点击左侧倒退怀表修复裂格，再拖动毛线球引导小猫通关',
    roomStyle: 'isometric-grid',
    grid: {
      tileWidth: 52,
      tileHeight: 27,
      tileDepth: 18,
    },
    nodes: [
      {
        id: 'start',
        label: '猫窝',
        x: 0,
        y: 2,
        z: 0,
        kind: 'start',
        stable: true,
      },
      {
        id: 'step-a',
        label: '入口平台',
        x: 1,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'crack',
        label: '坏掉的桥面',
        x: 2,
        y: 2,
        z: 0,
        kind: 'crumble',
        initialIntegrity: 0,
        safeAt: 0.55,
        damageDuration: 5200,
        recoverDuration: 1400,
        bridge: true,
      },
      {
        id: 'step-b',
        label: '出口平台',
        x: 3,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'goal',
        label: '终点',
        x: 4,
        y: 2,
        z: 0,
        kind: 'goal',
        stable: true,
      },
    ],
    cat: {
      startNode: 'start',
      visionRadius: 1.45,
      moveSpeed: 0.00145,
    },
    yarn: {
      startNode: 'start',
      placementRadius: 99,
    },
    clock: {
      actions: ['rewind'],
      energy: 1,
      pauseDuration: 2800,
      rewindDuration: 2600,
      rechargeDuration: 6200,
    },
    time: {
      startAt: 0,
    },
    goal: {
      nodeId: 'goal',
    },
  },
  {
    id: 'yarn-time-demo-02',
    label: '毛线球 2：暂停',
    blurb: 'yarn-time',
    instruction: '等地刺缩回时点击右侧暂停怀表，冻结安全地板，再引导小猫通关',
    roomStyle: 'isometric-grid',
    grid: {
      tileWidth: 52,
      tileHeight: 27,
      tileDepth: 18,
    },
    nodes: [
      {
        id: 'start',
        label: '猫窝',
        x: 0,
        y: 2,
        z: 0,
        kind: 'start',
        stable: true,
      },
      {
        id: 'step-a',
        label: '长桥入口',
        x: 1,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'step-b',
        label: '长桥中段',
        x: 2,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'step-c',
        label: '桥前平台',
        x: 3,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'spike',
        label: '地刺地板',
        x: 4,
        y: 2,
        z: 0,
        kind: 'spike',
        initialPhase: 0.08,
        cycleDuration: 2600,
        activeFrom: 0.45,
        activeTo: 0.86,
        bridge: true,
      },
      {
        id: 'step-d',
        label: '桥后平台',
        x: 5,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'goal',
        label: '终点',
        x: 6,
        y: 2,
        z: 0,
        kind: 'goal',
        stable: true,
      },
    ],
    cat: {
      startNode: 'start',
      visionRadius: 1.45,
      moveSpeed: 0.00145,
    },
    yarn: {
      startNode: 'start',
      placementRadius: 99,
    },
    clock: {
      actions: ['pause'],
      energy: 1,
      pauseDuration: 5200,
      rewindDuration: 2200,
      rechargeDuration: 6200,
    },
    time: {
      startAt: 0,
    },
    goal: {
      nodeId: 'goal',
    },
  },
  {
    id: 'yarn-time-demo-03',
    label: '毛线球 3：按钮',
    blurb: 'yarn-time',
    instruction: '先把毛线球放到按钮格，引导小猫按下按钮开门，再前往红旗',
    roomStyle: 'isometric-grid',
    grid: {
      tileWidth: 52,
      tileHeight: 27,
      tileDepth: 18,
    },
    nodes: [
      {
        id: 'start',
        label: '猫窝',
        x: 0,
        y: 2,
        z: 0,
        kind: 'start',
        stable: true,
      },
      {
        id: 'step-a',
        label: '中心入口',
        x: 1,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'hub',
        label: '分岔平台',
        x: 2,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
      },
      {
        id: 'switch',
        label: '开门按钮',
        x: 2,
        y: 1,
        z: 0,
        kind: 'switch',
        opensDoorId: 'door',
        stable: true,
      },
      {
        id: 'door',
        label: '锁门',
        x: 3,
        y: 2,
        z: 0,
        kind: 'door',
        initialOpen: false,
        bridge: true,
      },
      {
        id: 'goal-bridge',
        label: '门后桥',
        x: 4,
        y: 2,
        z: 0,
        kind: 'safe',
        stable: true,
        bridge: true,
      },
      {
        id: 'goal',
        label: '终点',
        x: 5,
        y: 2,
        z: 0,
        kind: 'goal',
        stable: true,
      },
    ],
    cat: {
      startNode: 'start',
      visionRadius: 1.45,
      moveSpeed: 0.00145,
    },
    yarn: {
      startNode: 'start',
      placementRadius: 99,
    },
    clock: {
      actions: [],
      energy: 0,
      pauseDuration: 2600,
      rewindDuration: 2600,
      rechargeDuration: 6200,
    },
    time: {
      startAt: 0,
    },
    door: {
      nodeId: 'door',
    },
    goal: {
      nodeId: 'goal',
    },
  },
];

export const YARN_TIME_LEVEL_MAP = {};

YARN_TIME_LEVELS.forEach(function (level) {
  YARN_TIME_LEVEL_MAP[level.id] = level;
});

export function getNextYarnTimeLevel(currentId) {
  var index = YARN_TIME_LEVELS.findIndex(function (level) {
    return level.id === currentId;
  });
  if (index >= 0 && index < YARN_TIME_LEVELS.length - 1) {
    return YARN_TIME_LEVELS[index + 1].id;
  }
  return null;
}
