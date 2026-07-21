export const RUBIK_SCRATCH_LEVELS = [
  {
    id: 'scratch-rubik-tutorial-01',
    label: '\u732b\u6293\u677f 1\uff1a\u6559\u7a0b',
    blurb: 'rubik-scratch',
    size: 2,
    instruction:
      '\u6309\u4f4f\u5c0f\u732b\u6240\u5728\u9762\u5f80\u60f3\u53bb\u7684\u65b9\u5411\u6ed1\u52a8\uff1b\u4e0d\u786e\u5b9a\u65f6\u70b9\u732b\u722a\u786e\u8ba4\u9884\u89c8\u3002',
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
    label: '\u732b\u6293\u677f 2\uff1a\u6362\u9762',
    blurb: 'rubik-scratch',
    size: 2,
    instruction:
      '\u7bad\u5934\u9762\u4f1a\u81ea\u52a8\u5e26\u52a8\u5c0f\u732b\u8f6c\u52a8\uff0c\u843d\u70b9\u53ef\u80fd\u548c\u624b\u52a8\u8f6c\u9762\u4e0d\u540c\u3002',
    cat: {
      position: { x: 1, y: 1, z: 1 },
      normal: { x: 1, y: 0, z: 0 },
    },
    goal: {
      position: { x: -1, y: -1, z: 1 },
      normal: { x: 0, y: -1, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-02-a',
        position: { x: 1, y: -1, z: 1 },
        normal: { x: 1, y: 0, z: 0 },
        turn: { axis: 'y', layer: -1, dir: 1 },
      },
      {
        id: 'amber-02-b',
        position: { x: -1, y: 1, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
        turn: { axis: 'x', layer: -1, dir: -1 },
      },
      {
        id: 'amber-02-c',
        position: { x: 1, y: -1, z: 1 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'z', layer: 1, dir: 1 },
      },
    ],
  },
  {
    id: 'scratch-rubik-locked-03',
    label: '\u732b\u6293\u677f 3\uff1a\u6298\u8fd4',
    blurb: 'rubik-scratch',
    size: 2,
    instruction:
      '\u540c\u4e00\u4e2a\u7bad\u5934\u673a\u5173\u53ef\u4ee5\u6539\u53d8\u4e0b\u4e00\u6b21\u53ef\u64cd\u4f5c\u7684\u5e73\u9762\uff0c\u89c2\u5bdf\u5c0f\u732b\u8d34\u7eb8\u671d\u5411\u3002',
    cat: {
      position: { x: 1, y: 1, z: -1 },
      normal: { x: 0, y: 0, z: -1 },
    },
    goal: {
      position: { x: -1, y: -1, z: 1 },
      normal: { x: 0, y: 0, z: 1 },
    },
    forcedTurns: [
      {
        id: 'amber-03',
        position: { x: -1, y: 1, z: -1 },
        normal: { x: -1, y: 0, z: 0 },
        turn: { axis: 'z', layer: -1, dir: 1 },
      },
    ],
  },
  {
    id: 'scratch-rubik-wormhole-04',
    label: '\u732b\u6293\u677f 4\uff1a\u84dd\u8272\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 2,
    instruction:
      '\u866b\u6d1e\u8fde\u63a5\u4e24\u4e2a\u5e26\u6d1e\u7684\u9762\uff0c\u5c0f\u732b\u8fdb\u5165\u540e\u4f1a\u4ece\u53e6\u4e00\u5904\u51fa\u53e3\u51fa\u73b0\u3002',
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
    instruction:
      '\u866b\u6d1e\u53ef\u4ee5\u8fde\u63a5\u4e0d\u540c\u671d\u5411\u7684\u5916\u8868\u9762\uff0c\u4e0d\u4e00\u5b9a\u53ea\u5728\u6b63\u524d\u65b9\u8fdb\u51fa\u3002',
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
  {
    id: 'scratch-rubik-3x3-06',
    label: '\u732b\u6293\u677f 6\uff1a\u4e09\u5c42\u8f74',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u4e09\u9636\u9b54\u65b9\u51fa\u73b0\u4e2d\u95f4\u8f74\uff0c\u866b\u6d1e\u548c\u7bad\u5934\u53ef\u80fd\u628a\u5c0f\u732b\u5e26\u5230\u975e\u8fb9\u89d2\u4f4d\u7f6e\u3002',
    cat: {
      position: { x: -2, y: 2, z: -2 },
      normal: { x: -1, y: 0, z: 0 },
    },
    goal: {
      position: { x: 2, y: 2, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-06-a',
        position: { x: -2, y: -2, z: -2 },
        normal: { x: -1, y: 0, z: 0 },
        turn: { axis: 'y', layer: -2, dir: -1 },
      },
      {
        id: 'amber-06-b',
        position: { x: -2, y: 2, z: -2 },
        normal: { x: 0, y: 1, z: 0 },
        turn: { axis: 'x', layer: -2, dir: 1 },
      },
    ],
    wormholes: [
      {
        id: 'blue',
        from: {
          position: { x: -2, y: -2, z: -2 },
          normal: { x: 0, y: 0, z: -1 },
        },
        to: {
          position: { x: 0, y: -2, z: -2 },
          normal: { x: 0, y: 0, z: -1 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-3x3-07',
    label: '\u732b\u6293\u677f 7\uff1a\u4e2d\u5c42\u63a8\u9762',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u4e2d\u5c42\u8f6c\u9762\u4f1a\u6539\u53d8\u53ef\u89c1\u8def\u5f84\uff0c\u7bad\u5934\u673a\u5173\u4f1a\u8ba9\u7a7a\u95f4\u5173\u7cfb\u91cd\u65b0\u6392\u5217\u3002',
    cat: {
      position: { x: -2, y: -2, z: -2 },
      normal: { x: -1, y: 0, z: 0 },
    },
    goal: {
      position: { x: -2, y: -2, z: 0 },
      normal: { x: 0, y: -1, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-07-a',
        position: { x: 2, y: -2, z: -2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'y', layer: -2, dir: 1 },
      },
      {
        id: 'amber-07-b',
        position: { x: 0, y: -2, z: -2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'z', layer: -2, dir: 1 },
      },
    ],
    wormholes: [
      {
        id: 'violet',
        from: {
          position: { x: -2, y: -2, z: -2 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: 2, y: 2, z: 0 },
          normal: { x: 0, y: 1, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-3x3-08',
    label: '\u732b\u6293\u677f 8\uff1a\u866b\u6d1e\u6298\u8f74',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u866b\u6d1e\u51fa\u53e3\u53ef\u4ee5\u843d\u5728\u4e2d\u5c42\u8f74\u4e0a\uff0c\u4f4d\u7f6e\u53d8\u5316\u6bd4\u65b9\u5411\u66f4\u91cd\u8981\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 1, z: 0 },
    },
    goal: {
      position: { x: 0, y: -2, z: -2 },
      normal: { x: 0, y: -1, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-08',
        position: { x: 2, y: 0, z: -2 },
        normal: { x: 1, y: 0, z: 0 },
        turn: { axis: 'z', layer: -2, dir: -1 },
      },
    ],
    wormholes: [
      {
        id: 'blue',
        from: {
          position: { x: -2, y: -2, z: -2 },
          normal: { x: -1, y: 0, z: 0 },
        },
        to: {
          position: { x: 2, y: 2, z: 0 },
          normal: { x: 1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-3x3-09',
    label: '\u732b\u6293\u677f 9\uff1a\u80cc\u9762\u56de\u73af',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u80cc\u9762\u548c\u4e2d\u8f74\u4e5f\u53ef\u80fd\u53c2\u4e0e\u7a7a\u95f4\u5224\u65ad\uff0c\u900f\u89c6\u91cc\u7684\u732b\u6293\u677f\u4f9d\u7136\u6709\u6548\u3002',
    cat: {
      position: { x: -2, y: 2, z: 2 },
      normal: { x: -1, y: 0, z: 0 },
    },
    goal: {
      position: { x: 0, y: 2, z: 2 },
      normal: { x: 0, y: 1, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-09-a',
        position: { x: -2, y: 0, z: 0 },
        normal: { x: -1, y: 0, z: 0 },
        turn: { axis: 'z', layer: 0, dir: 1 },
      },
      {
        id: 'amber-09-b',
        position: { x: -2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'y', layer: -2, dir: -1 },
      },
    ],
    wormholes: [
      {
        id: 'violet',
        from: {
          position: { x: -2, y: -2, z: 2 },
          normal: { x: 0, y: 0, z: 1 },
        },
        to: {
          position: { x: -2, y: 0, z: -2 },
          normal: { x: -1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-3x3-10',
    label: '\u732b\u6293\u677f 10\uff1a\u4e09\u8f74\u6c47\u5408',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u591a\u6761\u8f74\u540c\u65f6\u51fa\u73b0\u65f6\uff0c\u6ce8\u610f\u6bcf\u6b21\u8f6c\u52a8\u540e\u5c0f\u732b\u6240\u5728\u7684\u5c42\u3002',
    cat: {
      position: { x: -2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    forcedTurns: [
      {
        id: 'amber-10-a',
        position: { x: -2, y: 2, z: -2 },
        normal: { x: -1, y: 0, z: 0 },
        turn: { axis: 'z', layer: -2, dir: 1 },
      },
      {
        id: 'amber-10-b',
        position: { x: -2, y: 0, z: -2 },
        normal: { x: 0, y: 0, z: -1 },
        turn: { axis: 'x', layer: -2, dir: -1 },
      },
      {
        id: 'amber-10-c',
        position: { x: -2, y: 2, z: -2 },
        normal: { x: 0, y: 0, z: -1 },
        turn: { axis: 'z', layer: -2, dir: 1 },
      },
    ],
    wormholes: [
      {
        id: 'blue',
        from: {
          position: { x: -2, y: -2, z: -2 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: 0, y: 2, z: -2 },
          normal: { x: 0, y: 0, z: -1 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-11',
    label: '\u732b\u6293\u677f 11\uff1a\u732b\u722a\u6309\u94ae',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u732b\u722a\u6309\u94ae\u4f1a\u4fdd\u6301\u6309\u4e0b\u72b6\u6001\uff0c\u5e76\u6fc0\u6d3b\u9690\u85cf\u7684\u673a\u5173\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
    },
    pawButtons: [
      {
        id: 'paw-11',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
    ],
    wormholes: [
      {
        id: 'blue',
        requiresButton: 'paw-11',
        from: {
          position: { x: -2, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: 0, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-12',
    label: '\u732b\u6293\u677f 12\uff1a\u7bad\u5934\u673a\u5173',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u7bad\u5934\u673a\u5173\u4f1a\u5728\u5c0f\u732b\u8e29\u4e0a\u53bb\u540e\u81ea\u52a8\u8f6c\u52a8\u6307\u5b9a\u7684\u4e00\u9762\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
    },
    forcedTurns: [
      {
        id: 'amber-12',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
        turn: { axis: 'x', layer: -2, dir: 1 },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-13',
    label: '\u732b\u6293\u677f 13\uff1a\u91cd\u529b\u8f74',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u7eff\u8272\u91cd\u529b\u8f74\u53ea\u5f71\u54cd\u6240\u5728\u7684\u8fde\u7eed\u65b9\u5757\uff0c\u5c0f\u732b\u4f1a\u88ab\u62c9\u5411\u7bad\u5934\u7aef\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -2, y: -2, z: 2 },
      normal: { x: 0, y: -1, z: 0 },
    },
    gravityAxes: [
      {
        id: 'gravity-13',
        axis: 'y',
        dir: -1,
        fixed: { x: -2, z: 2 },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-14',
    label: '\u732b\u6293\u677f 14\uff1a\u9501\u94fe\u8f74',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u9501\u94fe\u8f74\u4f1a\u4e34\u65f6\u7981\u6b62\u67d0\u4e00\u5c42\u8f6c\u52a8\uff0c\u6309\u94ae\u53ef\u6539\u53d8\u9501\u5b9a\u72b6\u6001\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -2, y: -2, z: 2 },
      normal: { x: 0, y: -1, z: 0 },
      requiresButton: 'paw-14',
    },
    pawButtons: [
      {
        id: 'paw-14',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-14',
        axis: 'x',
        layer: -2,
        requiresButton: 'paw-14',
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-15',
    label: '\u732b\u6293\u677f 15\uff1a\u673a\u5173\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u6309\u94ae\u6fc0\u6d3b\u7684\u866b\u6d1e\u548c\u7bad\u5934\u673a\u5173\u53ef\u4ee5\u5f62\u6210\u8fde\u7eed\u53cd\u5e94\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
    },
    pawButtons: [
      {
        id: 'paw-15',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
    ],
    wormholes: [
      {
        id: 'violet',
        requiresButton: 'paw-15',
        from: {
          position: { x: -2, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: 0, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
    forcedTurns: [
      {
        id: 'amber-15',
        position: { x: 0, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'z', layer: 2, dir: 1 },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-16',
    label: '\u732b\u6293\u677f 16\uff1a\u91cd\u529b\u6309\u94ae',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 2, z: -2 },
      normal: { x: 0, y: 1, z: 0 },
      requiresButton: 'paw-16',
    },
    pawButtons: [
      {
        id: 'paw-16',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
    ],
    gravityAxes: [
      {
        id: 'gravity-16',
        axis: 'y',
        dir: 1,
        fixed: { x: 2, z: 2 },
        requiresButton: 'paw-16',
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-17',
    label: '\u732b\u6293\u677f 17\uff1a\u6298\u53e0\u95e8',
    blurb: 'rubik-scratch',
    size: 3,
    instruction:
      '\u6298\u53e0\u95e8\u4f1a\u628a\u5c0f\u732b\u8fde\u63a5\u5230\u76f8\u90bb\u8f74\u9762\u3002',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: -2 },
      normal: { x: 1, y: 0, z: 0 },
    },
    foldDoors: [
      {
        id: 'fold-17',
        hingeAxis: 'z',
        dir: -1,
        from: {
          position: { x: 2, y: 2, z: -2 },
          normal: { x: 1, y: 0, z: 0 },
        },
        to: {
          position: { x: 2, y: 0, z: -2 },
          normal: { x: 1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-18',
    label: '\u732b\u6293\u677f 18\uff1a\u6309\u94ae\u94f0\u94fe',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -2, y: -2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
      requiresButton: ['paw-18-a', 'paw-18-b'],
    },
    pawButtons: [
      {
        id: 'paw-18-a',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
      {
        id: 'paw-18-b',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-18',
        axis: 'y',
        layer: 2,
        requiresButton: 'paw-18-a',
      },
    ],
    foldDoors: [
      {
        id: 'fold-18',
        requiresButton: 'paw-18-a',
        hingeAxis: 'y',
        dir: -1,
        from: {
          position: { x: -2, y: 2, z: 2 },
          normal: { x: -1, y: 0, z: 0 },
        },
        to: {
          position: { x: -2, y: 2, z: 0 },
          normal: { x: -1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-19',
    label: '\u732b\u6293\u677f 19\uff1a\u673a\u5173\u8f6c\u9762',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: -2 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: 'paw-19-b',
    },
    pawButtons: [
      {
        id: 'paw-19-a',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
      {
        id: 'paw-19-b',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 1, y: 0, z: 0 },
      },
    ],
    forcedTurns: [
      {
        id: 'amber-19',
        position: { x: -2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'z', layer: 2, dir: 1 },
        requiresButton: 'paw-19-a',
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-20',
    label: '\u732b\u6293\u677f 20\uff1a\u9501\u94fe\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: 'paw-20-b',
    },
    pawButtons: [
      {
        id: 'paw-20-a',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: -1, y: 0, z: 0 },
      },
      {
        id: 'paw-20-b',
        position: { x: 0, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-20',
        axis: 'z',
        layer: 2,
        requiresButton: 'paw-20-b',
      },
    ],
    wormholes: [
      {
        id: 'blue',
        requiresButton: 'paw-20-a',
        from: {
          position: { x: -2, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: 0, y: -2, z: 2 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-21',
    label: '\u732b\u6293\u677f 21\uff1a\u7ad6\u5411\u91cd\u529b',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
    },
    gravityAxes: [
      {
        id: 'gravity-21',
        axis: 'y',
        dir: -1,
        fixed: { x: -2, z: 2 },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-22',
    label: '\u732b\u6293\u677f 22\uff1a\u91cd\u529b\u95e8\u8f74',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: -2 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: ['paw-22-a', 'paw-22-b'],
    },
    pawButtons: [
      {
        id: 'paw-22-a',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: -1, y: 0, z: 0 },
      },
      {
        id: 'paw-22-b',
        position: { x: -2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-22',
        axis: 'z',
        layer: 2,
        requiresButton: 'paw-22-a',
      },
    ],
    gravityAxes: [
      {
        id: 'gravity-22',
        axis: 'x',
        dir: 1,
        fixed: { y: -2, z: 2 },
        requiresButton: ['paw-22-a', 'paw-22-b'],
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-23',
    label: '\u732b\u6293\u677f 23\uff1a\u6298\u95e8\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: 0, z: 2 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: 'paw-23-b',
    },
    pawButtons: [
      {
        id: 'paw-23-a',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
      {
        id: 'paw-23-b',
        position: { x: 2, y: 2, z: 2 },
        normal: { x: 1, y: 0, z: 0 },
      },
    ],
    foldDoors: [
      {
        id: 'fold-23',
        requiresButton: 'paw-23-a',
        hingeAxis: 'y',
        dir: -1,
        from: {
          position: { x: 2, y: 2, z: 2 },
          normal: { x: 0, y: 0, z: 1 },
        },
        to: {
          position: { x: 0, y: 2, z: 2 },
          normal: { x: 0, y: 0, z: 1 },
        },
      },
    ],
    wormholes: [
      {
        id: 'fold-blue-23',
        requiresButton: 'paw-23-b',
        from: {
          position: { x: 2, y: -2, z: 2 },
          normal: { x: 1, y: 0, z: 0 },
        },
        to: {
          position: { x: 2, y: 0, z: 2 },
          normal: { x: 1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-24',
    label: '\u732b\u6293\u677f 24\uff1a\u5f3a\u8f6c\u866b\u6d1e',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: -2 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: 'paw-24-b',
    },
    pawButtons: [
      {
        id: 'paw-24-a',
        position: { x: -2, y: 2, z: 2 },
        normal: { x: 0, y: 0, z: 1 },
      },
      {
        id: 'paw-24-b',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 1, y: 0, z: 0 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-24',
        axis: 'x',
        layer: 2,
        requiresButton: 'paw-24-b',
      },
    ],
    forcedTurns: [
      {
        id: 'amber-24',
        position: { x: -2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
        turn: { axis: 'z', layer: 2, dir: 1 },
        requiresButton: 'paw-24-a',
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-25',
    label: '\u732b\u6293\u677f 25\uff1a\u6298\u53e0\u529b\u573a',
    blurb: 'rubik-scratch',
    size: 3,
    instruction: '',
    cat: {
      position: { x: 2, y: 2, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 2, y: -2, z: 2 },
      normal: { x: 0, y: -1, z: 0 },
      requiresButton: ['paw-25-a', 'paw-25-b'],
    },
    pawButtons: [
      {
        id: 'paw-25-a',
        position: { x: 2, y: -2, z: 2 },
        normal: { x: 0, y: -1, z: 0 },
      },
      {
        id: 'paw-25-b',
        position: { x: 2, y: 2, z: 2 },
        normal: { x: 1, y: 0, z: 0 },
      },
    ],
    foldDoors: [
      {
        id: 'fold-25-a',
        requiresButton: 'paw-25-a',
        hingeAxis: 'y',
        dir: -1,
        from: {
          position: { x: 2, y: 2, z: 2 },
          normal: { x: 0, y: 0, z: 1 },
        },
        to: {
          position: { x: 0, y: 2, z: 2 },
          normal: { x: 0, y: 0, z: 1 },
        },
      },
      {
        id: 'fold-25-b',
        requiresButton: 'paw-25-b',
        hingeAxis: 'z',
        dir: 1,
        from: {
          position: { x: 2, y: -2, z: 2 },
          normal: { x: 1, y: 0, z: 0 },
        },
        to: {
          position: { x: 2, y: 0, z: 2 },
          normal: { x: 1, y: 0, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-26',
    label: '\u732b\u6293\u677f 26\uff1a\u56db\u9636\u5165\u53e3',
    blurb: 'rubik-scratch',
    size: 4,
    instruction: '',
    cat: {
      position: { x: 3, y: 3, z: 3 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: 3, y: -3, z: -1 },
      normal: { x: 1, y: 0, z: 0 },
      requiresButton: 'paw-26-b',
    },
    pawButtons: [
      {
        id: 'paw-26-a',
        position: { x: 3, y: -3, z: 3 },
        normal: { x: 0, y: -1, z: 0 },
      },
      {
        id: 'paw-26-b',
        position: { x: -1, y: -3, z: 3 },
        normal: { x: 0, y: -1, z: 0 },
      },
    ],
    wormholes: [
      {
        id: 'four-blue-26',
        requiresButton: 'paw-26-a',
        from: {
          position: { x: -3, y: -3, z: 3 },
          normal: { x: -1, y: 0, z: 0 },
        },
        to: {
          position: { x: -1, y: -3, z: 3 },
          normal: { x: -1, y: 0, z: 0 },
        },
      },
    ],
    forcedTurns: [
      {
        id: 'amber-26',
        position: { x: 3, y: -1, z: 3 },
        normal: { x: 1, y: 0, z: 0 },
        turn: { axis: 'x', layer: 3, dir: 1 },
        requiresButton: 'paw-26-b',
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-27',
    label: '\u732b\u6293\u677f 27\uff1a\u56db\u9636\u91cd\u529b\u95e8',
    blurb: 'rubik-scratch',
    size: 4,
    instruction: '',
    cat: {
      position: { x: 3, y: 3, z: 3 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -3, y: -3, z: -3 },
      normal: { x: 0, y: -1, z: 0 },
      requiresButton: ['paw-27-a', 'paw-27-b'],
    },
    pawButtons: [
      {
        id: 'paw-27-a',
        position: { x: 3, y: 3, z: -3 },
        normal: { x: 1, y: 0, z: 0 },
      },
      {
        id: 'paw-27-b',
        position: { x: -3, y: 3, z: -3 },
        normal: { x: 0, y: 1, z: 0 },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-27',
        axis: 'z',
        layer: -3,
        requiresButton: 'paw-27-a',
      },
    ],
    gravityAxes: [
      {
        id: 'gravity-27',
        axis: 'y',
        dir: -1,
        fixed: { x: -3, z: -3 },
        requiresButton: ['paw-27-a', 'paw-27-b'],
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-28',
    label: '\u732b\u6293\u677f 28\uff1a\u6298\u53e0\u843d\u8f74',
    blurb: 'rubik-scratch',
    size: 4,
    instruction: '',
    cat: {
      position: { x: 3, y: 3, z: 3 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -3, y: -3, z: -3 },
      normal: { x: -1, y: 0, z: 0 },
      requiresButton: ['paw-28-a', 'paw-28-b'],
    },
    pawButtons: [
      {
        id: 'paw-28-a',
        position: { x: -3, y: 3, z: 3 },
        normal: { x: 0, y: 0, z: 1 },
      },
      {
        id: 'paw-28-b',
        position: { x: -3, y: -3, z: 3 },
        normal: { x: -1, y: 0, z: 0 },
      },
    ],
    foldDoors: [
      {
        id: 'fold-28',
        requiresButton: 'paw-28-a',
        hingeAxis: 'z',
        dir: 1,
        from: {
          position: { x: -3, y: -3, z: 3 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: -1, y: -3, z: 3 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
    forcedTurns: [
      {
        id: 'amber-28',
        position: { x: -3, y: -3, z: 3 },
        normal: { x: -1, y: 0, z: 0 },
        turn: { axis: 'x', layer: -3, dir: 1 },
        requiresButton: ['paw-28-a', 'paw-28-b'],
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-29',
    label: '\u732b\u6293\u677f 29\uff1a\u6298\u95e8\u6362\u5c42',
    blurb: 'rubik-scratch',
    size: 4,
    instruction: '',
    cat: {
      position: { x: 3, y: 3, z: 3 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -1, y: 3, z: 3 },
      normal: { x: 0, y: 1, z: 0 },
      requiresButton: ['paw-29-a', 'paw-29-b'],
    },
    pawButtons: [
      {
        id: 'paw-29-a',
        position: { x: 3, y: 3, z: -3 },
        normal: { x: 1, y: 0, z: 0 },
      },
      {
        id: 'paw-29-b',
        position: { x: -3, y: 3, z: -3 },
        normal: { x: 0, y: 0, z: -1 },
      },
    ],
    foldDoors: [
      {
        id: 'fold-29',
        requiresButton: 'paw-29-a',
        hingeAxis: 'x',
        dir: 1,
        from: {
          position: { x: -3, y: 3, z: -3 },
          normal: { x: 0, y: 1, z: 0 },
        },
        to: {
          position: { x: -3, y: 3, z: -1 },
          normal: { x: 0, y: 1, z: 0 },
        },
      },
    ],
    wormholes: [
      {
        id: 'fold-blue-29',
        requiresButton: ['paw-29-a', 'paw-29-b'],
        from: {
          position: { x: -3, y: -3, z: -3 },
          normal: { x: 0, y: 0, z: -1 },
        },
        to: {
          position: { x: -1, y: 3, z: 3 },
          normal: { x: 0, y: 1, z: 0 },
        },
      },
    ],
  },
  {
    id: 'scratch-rubik-paw-30',
    label: '\u732b\u6293\u677f 30\uff1a\u56db\u9636\u8fde\u9501',
    blurb: 'rubik-scratch',
    size: 4,
    instruction: '',
    cat: {
      position: { x: 3, y: 3, z: 3 },
      normal: { x: 0, y: 0, z: 1 },
    },
    goal: {
      position: { x: -3, y: -3, z: 3 },
      normal: { x: 0, y: -1, z: 0 },
      requiresButton: ['paw-30-a', 'paw-30-b', 'paw-30-c'],
    },
    pawButtons: [
      {
        id: 'paw-30-a',
        position: { x: -3, y: 3, z: 3 },
        normal: { x: -1, y: 0, z: 0 },
      },
      {
        id: 'paw-30-b',
        position: { x: -3, y: -3, z: 3 },
        normal: { x: -1, y: 0, z: 0 },
      },
      {
        id: 'paw-30-c',
        position: { x: -3, y: 3, z: 3 },
        normal: { x: 0, y: 1, z: 0 },
      },
    ],
    foldDoors: [
      {
        id: 'fold-30',
        requiresButton: 'paw-30-a',
        hingeAxis: 'z',
        dir: 1,
        from: {
          position: { x: -3, y: -3, z: 3 },
          normal: { x: 0, y: -1, z: 0 },
        },
        to: {
          position: { x: -1, y: -3, z: 3 },
          normal: { x: 0, y: -1, z: 0 },
        },
      },
    ],
    lockedAxes: [
      {
        id: 'lock-30',
        axis: 'z',
        layer: 3,
        requiresButton: 'paw-30-a',
      },
    ],
    gravityAxes: [
      {
        id: 'gravity-30',
        axis: 'y',
        dir: -1,
        fixed: { x: -3, z: 3 },
        requiresButton: ['paw-30-b', 'paw-30-c'],
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
