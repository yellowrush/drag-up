<template>
  <view class="page">
    <view
      class="top-bar"
      :style="{ paddingTop: topBarPadding, minHeight: '44px' }"
    >
      <text class="instruction" :style="instructionStyle">{{ instruction }}</text>
      <view class="tool-actions">
        <view class="tool-btn" @tap="onResetTap">
          <view class="tool-icon retry-icon">
            <view class="retry-mark">
              <view class="retry-head"></view>
            </view>
          </view>
          <text class="tool-label">&#37325;&#35797;</text>
        </view>
        <view class="tool-btn" @tap="onLevelsTap">
          <view class="tool-icon settings-icon">
            <view class="gear-mark">
              <view class="gear-hole"></view>
            </view>
          </view>
          <text class="tool-label">&#20851;&#21345;</text>
        </view>
        <view class="tool-btn" @tap="onScoreTap">
          <view class="point-icon">
            <view class="point-shape"></view>
            <view class="point-round point-round-top"></view>
            <view class="point-round point-round-right"></view>
            <view class="point-round point-round-bottom-right"></view>
            <view class="point-round point-round-bottom-left"></view>
            <view class="point-round point-round-left"></view>
            <view class="point-round point-round-inner-top-right"></view>
            <view class="point-round point-round-inner-right"></view>
            <view class="point-round point-round-inner-bottom"></view>
            <view class="point-round point-round-inner-left"></view>
            <view class="point-round point-round-inner-top-left"></view>
          </view>
          <text class="tool-label">&#31215;&#20998;</text>
        </view>
      </view>
    </view>

    <view class="game-area">
      <game-canvas
        :paused="showLevelSelect || showScoreModal"
        @ready="onGameReady"
        @instruction="onInstruction"
      />
    </view>

    <view
      v-if="showLevelSelect"
      class="modal-mask"
      @tap.self="showLevelSelect = false"
    >
        <view class="modal-box level-modal" @tap.stop>
          <view class="modal-title">&#36873;&#25321;&#20851;&#21345;</view>
          <view class="level-tabs">
            <view
              v-for="world in levelWorlds"
              :key="world.id"
              class="level-tab"
              :class="{ active: activeLevelWorldId === world.id }"
              @tap="onLevelWorldTap(world.id)"
            >
              <text class="level-tab-label">{{ world.label }}</text>
              <text v-if="levelWorldCurrentText(world)" class="level-tab-current">
                {{ levelWorldCurrentText(world) }}
              </text>
            </view>
          </view>
          <scroll-view scroll-y class="level-scroll">
            <view class="level-grid">
              <view
              v-for="(lv, index) in levels"
              :key="lv.id"
              class="level-cell"
              :class="{ completed: completedLevels.includes(lv.id) }"
              @tap="onSelectLevel(lv.id)"
            >
              <text class="level-number">{{ levelTitle(lv, index) }}</text>
              <text class="level-status">
                {{ completedLevels.includes(lv.id) ? ownedText : lockedText }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view
      v-if="showScoreModal"
      class="modal-mask"
      @tap.self="showScoreModal = false"
    >
      <view class="modal-box score-modal" @tap.stop>
        <view class="score-head">
          <view>
            <view class="modal-title score-title">{{ totalScoreText }}</view>
          </view>
          <view class="score-total">{{ totalScore }}</view>
        </view>

        <view class="reward-tabs">
          <view
            class="reward-tab"
            :class="{ active: activeRewardTab === 'accessory' }"
            @tap="onRewardTabTap('accessory')"
          >
            &#39280;&#21697;
          </view>
          <view
            class="reward-tab"
            :class="{ active: activeRewardTab === 'expression' }"
            @tap="onRewardTabTap('expression')"
          >
            &#34920;&#24773;
          </view>
          <view
            class="reward-tab"
            :class="{ active: activeRewardTab === 'sticker' }"
            @tap="onRewardTabTap('sticker')"
          >
            贴纸
          </view>
          <view
            class="reward-tab"
            :class="{ active: activeRewardTab === 'task' }"
            @tap="onRewardTabTap('task')"
          >
            &#20219;&#21153;
          </view>
          <view
            class="reward-tab"
            :class="{ active: activeRewardTab === 'leaderboard' }"
            @tap="onRewardTabTap('leaderboard')"
          >
            &#25490;&#34892;&#27036;
          </view>
        </view>

        <view
          v-if="isRewardTryOnTab"
          class="tryon-panel"
        >
          <canvas
            id="rewardPreviewCanvas"
            canvas-id="rewardPreviewCanvas"
            type="2d"
            class="tryon-canvas"
          />
          <view class="tryon-copy">
            <text class="tryon-label">{{ tryOnLabel }}</text>
            <text class="tryon-name">{{ tryOnName }}</text>
            <text class="tryon-status">{{ tryOnStatus }}</text>
          </view>
        </view>
        <view v-else-if="isStickerShowcaseTab" class="sticker-showcase">
          <view
            v-if="activeSticker"
            :class="['sticker-art', 'large', activeSticker.id]"
          ></view>
          <view v-else class="sticker-showcase-empty">解锁贴纸后，点击贴纸来展示</view>
          <view class="sticker-showcase-copy">
            <text class="tryon-label">当前展示</text>
            <text class="tryon-name">
              {{ activeSticker ? activeSticker.name : '未选择贴纸' }}
            </text>
            <text class="tryon-status">
              {{ activeSticker ? activeSticker.description : '继续闯关收集彩蛋贴纸' }}
            </text>
          </view>
        </view>

        <scroll-view
          v-if="isRewardItemTab"
          scroll-y
          :class="[
            'reward-scroll',
            hasRewardTopPanel
              ? 'reward-scroll-with-tryon'
              : '',
          ]"
        >
          <view
          v-for="item in rewardItems"
          :key="`${item.type}-${item.id}`"
          class="reward-row"
          :class="{
            owned: isOwned(item),
            equipped: isEquipped(item),
            selected: isSelectedSticker(item),
          }"
          @tap="onRewardRowTap(item)"
          >
          <view class="reward-preview">
            <view
              :class="[
                'preview-mark',
                item.type,
                item.id,
                item.type === 'sticker' ? 'sticker-art mini' : '',
              ]"
            >
              <view
                v-if="item.type === 'expression' && item.id === 'angry'"
                class="preview-anger-icon"
              >
                <view class="preview-anger-arch"></view>
              </view>
            </view>
          </view>
            <view class="reward-info">
              <text class="reward-name">{{ item.name }}</text>
              <text class="reward-desc">{{ rewardStatus(item) }}</text>
            </view>
            <view
              v-if="item.type !== 'sticker'"
              class="reward-action"
              :class="{ disabled: !canUseReward(item) }"
              @tap.stop="onRewardAction(item)"
            >
              {{ rewardActionText(item) }}
            </view>
            <view v-else class="reward-action disabled sticker-locked-tag">
              {{ isOwned(item) ? (isSelectedSticker(item) ? '展示中' : '点击查看') : '未解锁' }}
            </view>
          </view>
        </scroll-view>

        <view v-else-if="activeRewardTab === 'task'" class="task-panel">
          <view v-if="taskHint" class="task-hint">{{ taskHint }}</view>
          <scroll-view scroll-y class="reward-scroll">
            <view
              v-for="task in rewardTasks"
              :key="task.id"
              class="reward-row task-row"
              :class="{ owned: task.ready, equipped: task.claimed }"
            >
              <view class="reward-preview task-preview">
                <text class="task-preview-text">{{ task.rewardText.slice(0, 1) }}</text>
              </view>
              <view class="reward-info">
                <text class="reward-name">{{ task.name }}</text>
                <text class="reward-desc">{{ task.statusText }} / {{ task.description }}</text>
              </view>
              <view
                class="reward-action task-action"
                :class="{ disabled: !task.canTap }"
                @tap.stop="onTaskAction(task)"
              >
                {{ task.actionText }}
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-else class="leaderboard-panel">
          <view class="leaderboard-scope-tabs">
            <view
              class="leaderboard-scope-tab"
              :class="{ active: activeLeaderboardScope === 'friend' }"
              @tap="onLeaderboardScopeTap('friend')"
            >
              &#22909;&#21451;
            </view>
            <view
              class="leaderboard-scope-tab"
              :class="{ active: activeLeaderboardScope === 'server' }"
              @tap="onLeaderboardScopeTap('server')"
            >
              &#20840;&#26381;
            </view>
          </view>
          <view v-if="activeLeaderboardScope === 'friend'" class="leaderboard-empty">
            &#35831;&#22312;&#24494;&#20449;&#23567;&#28216;&#25103;&#20013;&#26597;&#30475;&#22909;&#21451;&#25490;&#34892;&#27036;
          </view>
          <view v-else-if="leaderboardStatus === 'unavailable'" class="leaderboard-empty">
            &#35831;&#22312;&#24494;&#20449;&#23567;&#28216;&#25103;&#20013;&#26597;&#30475;&#20840;&#26381;&#25490;&#34892;&#27036;
          </view>
          <view v-else>
            <view class="leaderboard-actions">
              <view class="leaderboard-self">
                <image
                  v-if="leaderboardProfileAvatar"
                  class="leaderboard-self-avatar"
                  :src="leaderboardProfileAvatar"
                  mode="aspectFill"
                />
                <view v-else class="leaderboard-self-avatar placeholder"></view>
                <view class="leaderboard-self-copy">
                  <text class="leaderboard-self-label">{{ leaderboardProfileName }}</text>
                  <text class="leaderboard-self-score">
                    {{ leaderboardSelf ? `#${leaderboardSelf.rank} / ${leaderboardSelf.totalScore}` : '--' }}
                  </text>
                </view>
              </view>
              <view class="leaderboard-auth" @tap="onAuthorizeLeaderboard">
                {{ leaderboardAuthText }}
              </view>
            </view>

            <view v-if="leaderboardStatus === 'loading'" class="leaderboard-empty">
              &#25490;&#34892;&#27036;&#21152;&#36733;&#20013;...
            </view>
            <view v-else-if="leaderboardStatus === 'error'" class="leaderboard-empty">
              <text>{{ leaderboardError || leaderboardLoadFailedText }}</text>
              <view class="leaderboard-retry" @tap="loadLeaderboard">
                &#37325;&#35797;
              </view>
            </view>
            <view v-else-if="leaderboardRows.length === 0" class="leaderboard-empty">
              &#26242;&#26080;&#25490;&#21517;&#25968;&#25454;
            </view>
            <scroll-view v-else scroll-y class="leaderboard-scroll">
              <view
                v-for="(row, index) in leaderboardRows"
                :key="row.playerKey || row.openid || row.nickname || `rank-${row.rank || index}`"
                class="leaderboard-row"
                :class="{ self: row.isSelf }"
              >
                <text class="leaderboard-rank">#{{ row.rank }}</text>
                <image
                  v-if="row.avatarUrl"
                  class="leaderboard-avatar"
                  :src="row.avatarUrl"
                  mode="aspectFill"
                />
                <view v-else class="leaderboard-avatar placeholder"></view>
                <text class="leaderboard-name">{{ playerName(row) }}</text>
                <text class="leaderboard-score">{{ row.totalScore }}</text>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>
    </view>

    <view v-show="showNext" class="next-btn" @tap="onNextLevel">
      &#19979;&#19968;&#20851;
    </view>
  </view>
</template>

<script setup lang="ts">
  import {
    computed,
    getCurrentInstance,
    markRaw,
    nextTick,
    onMounted,
    ref,
    shallowRef,
    watch,
  } from 'vue';
  import gameCanvas from '@/components/game-canvas.vue';
  import { renderCubAvatar } from '@/utils/cub.js';
  import { GameStorage } from '@/utils/storage.js';
  import { CAT_BOX_LEVELS, getNextLevel } from '@/utils/levels-data.js';
  import {
    RUBIK_SCRATCH_LEVELS,
    getNextRubikScratchLevel,
  } from '@/utils/rubik-scratch-levels.js';
  import {
    YARN_TIME_LEVELS,
    getNextYarnTimeLevel,
  } from '@/utils/yarn-time-levels.js';
  import { LeaderboardClient } from '@/utils/leaderboard.js';
  import {
    ACCESSORIES,
    EXPRESSIONS,
    STICKERS,
    RewardStorage,
    getRewardSourceText,
    isScoreReward,
  } from '@/utils/rewards.js';
  import {
    isShareMinigameSupported,
    registerShareMinigame,
    shareMinigame,
  } from '@/utils/share-minigame.js';

  const engine = shallowRef<any>(null);
  const instruction = ref('');
  const showLevelSelect = ref(false);
  const showScoreModal = ref(false);
  const showNext = ref(false);
  const activeLevelWorldId = ref('cat-box');
  const levelWorlds = [
    { id: 'cat-box', label: '\u732b\u7bb1\u5b50', levels: CAT_BOX_LEVELS },
    { id: 'cat-scratcher', label: '\u732b\u6293\u677f', levels: RUBIK_SCRATCH_LEVELS },
    { id: 'yarn-ball', label: '\u6bdb\u7ebf\u7403', levels: YARN_TIME_LEVELS },
  ];
  const levels = computed(() => getActiveLevelWorld().levels);
  const instructionStyle = computed(() => {
    const length = Array.from(instruction.value || '').length;
    const fontSize = length > 34 ? 9 : length > 26 ? 10 : length > 18 ? 11 : 13;
    const scale = length > 0 ? Math.min(1, Math.max(0.42, 18 / length)) : 1;
    return {
      fontSize: `${fontSize}px`,
      transform: `scaleX(${scale})`,
    };
  });
  const completedLevels = ref<string[]>([]);
  const rewardState = ref(RewardStorage.getState());
  const activeRewardTab = ref('accessory');
  const selectedStickerId = ref('');
  const activeLeaderboardScope = ref('friend');
  const taskHint = ref('');
  const leaderboardStatus = ref('idle');
  const leaderboardRows = ref<any[]>([]);
  const leaderboardSelf = ref<any>(null);
  const leaderboardError = ref('');
  const leaderboardProfile = ref<any>(LeaderboardClient.getStoredProfile());
  const topBarPadding = ref('56px');
  const ownedText = '\u5df2\u5b8c\u6210';
  const lockedText = '\u672a\u5b8c\u6210';
  const totalScoreText = '\u603b\u79ef\u5206';
  const anonymousPlayerText = '\u533f\u540d\u73a9\u5bb6';
  const leaderboardLoadFailedText = '\u6392\u884c\u699c\u52a0\u8f7d\u5931\u8d25';
  const leaderboardNoUserText = '\u672c\u5730\u73a9\u5bb6';
  const shareMinigameOnlyText = '\u8bf7\u5728\u5fae\u4fe1\u5c0f\u6e38\u620f\u4e2d\u5206\u4eab';
  const shareRewardClaimedText = '\u5206\u4eab\u5b8c\u6210\uff0c\u5df2\u9886\u53d6\u597d\u53cb\u7231\u5fc3';
  const leaderboardSyncDelay = 1200;
  const leaderboardSyncMinInterval = 30000;
  const instance = getCurrentInstance();
  let currentLevelId = '';
  let leaderboardSyncTimer: any = null;
  let leaderboardSyncPending = false;
  let leaderboardSyncInFlight = false;
  let leaderboardLastSyncAt = 0;

  const totalScore = computed(() => rewardState.value.totalScore || 0);
  const leaderboardAuthText = computed(() =>
    leaderboardProfile.value ? '\u66f4\u65b0' : '\u6388\u6743',
  );
  const leaderboardProfileName = computed(() => {
    return leaderboardProfile.value && leaderboardProfile.value.nickname
      ? leaderboardProfile.value.nickname
      : leaderboardNoUserText;
  });
  const leaderboardProfileAvatar = computed(() =>
    leaderboardProfile.value ? leaderboardProfile.value.avatarUrl || '' : '',
  );
  function getRewardSourceItems() {
    if (activeRewardTab.value === 'expression') return EXPRESSIONS;
    if (activeRewardTab.value === 'sticker') return STICKERS;
    if (activeRewardTab.value === 'accessory') return ACCESSORIES;
    return [];
  }
  const rewardItems = computed(() => {
    const source = getRewardSourceItems();
    return source.map((item: any) => ({
      ...item,
      type: activeRewardTab.value,
    }));
  });
  const isRewardTryOnTab = computed(
    () => activeRewardTab.value === 'accessory' || activeRewardTab.value === 'expression',
  );
  const isStickerShowcaseTab = computed(() => activeRewardTab.value === 'sticker');
  const hasRewardTopPanel = computed(
    () => isRewardTryOnTab.value || isStickerShowcaseTab.value,
  );
  const isRewardItemTab = computed(() =>
    ['accessory', 'expression', 'sticker'].includes(activeRewardTab.value),
  );
  const activeSticker = computed(() => {
    if (!selectedStickerId.value) return null;
    const ownedIds = rewardState.value.ownedStickerIds || [];
    if (!ownedIds.includes(selectedStickerId.value)) return null;
    return (
      STICKERS.find((sticker: { id: string }) => sticker.id === selectedStickerId.value) ||
      null
    );
  });
  const tryOnAccessoryId = computed(() =>
    rewardState.value.equippedAccessoryId || '',
  );
  const tryOnExpressionId = computed(() =>
    rewardState.value.equippedExpressionId || '',
  );
  const tryOnLabel = computed(() => '\u5f53\u524d\u642d\u914d');
  const tryOnName = computed(() =>
    `${getEquippedExpressionName()} / ${getEquippedAccessoryName()}`,
  );
  const tryOnStatus = computed(() => '\u5f53\u524d\u751f\u6548');
  const rewardTasks = computed(() => {
    rewardState.value.totalScore;
    return RewardStorage.getTaskStates({
      completedLevels: completedLevels.value,
      levelWorlds,
      canShareMinigame: isShareMinigameSupported(),
    });
  });

  onMounted(() => {
    registerShareMinigame();
    completedLevels.value = GameStorage.getCompletedLevels();
    refreshRewards();
    try {
      const sH = uni.getSystemInfoSync().statusBarHeight || 44;
      topBarPadding.value = `${sH + 12}px`;
    } catch (e) {
      /* keep default */
    }
  });

  watch(
    () => [
      showScoreModal.value,
      activeRewardTab.value,
      rewardState.value.equippedAccessoryId,
      rewardState.value.equippedExpressionId,
    ],
    () => {
      scheduleRewardPreviewRender();
    },
    { immediate: true },
  );

  function onGameReady(eng: any) {
    engine.value = markRaw(eng);
    if (currentLevelId && currentLevelId !== eng.maze.id) {
      eng.loadLevel(currentLevelId);
    }
    currentLevelId = eng.maze.id;
    instruction.value = eng.maze.instruction || '';
    syncActiveWorldForLevel(currentLevelId);
    applyEquippedRewards();

    eng.onLevelComplete = (stats: any) => {
      showNext.value = true;
      GameStorage.markLevelCompleted(eng.maze.id);
      completedLevels.value = GameStorage.getCompletedLevels();
      const result = RewardStorage.recordLevelResult(eng.maze.id, stats, {
        completedLevels: completedLevels.value,
        levelWorlds,
        canShareMinigame: isShareMinigameSupported(),
      });
      refreshRewards();
      if (result.isNewBest) {
        syncLeaderboardInBackground();
      }
    };

    eng.onInstructionChange = (text: string) => {
      instruction.value = text;
    };
  }

  function onInstruction(text: string) {
    instruction.value = text;
  }

  function onLevelsTap() {
    completedLevels.value = GameStorage.getCompletedLevels();
    syncActiveWorldForLevel(currentLevelId || (engine.value && engine.value.maze.id));
    showScoreModal.value = false;
    showLevelSelect.value = true;
  }

  function onScoreTap() {
    refreshRewards();
    showLevelSelect.value = false;
    showScoreModal.value = true;
    if (activeRewardTab.value === 'leaderboard') {
      loadLeaderboard();
    }
  }

  function onSelectLevel(id: string) {
    if (!engine.value) return;
    engine.value.loadLevel(id);
    currentLevelId = id;
    syncActiveWorldForLevel(id);
    showLevelSelect.value = false;
    showNext.value = false;
    instruction.value = engine.value.maze.instruction || '';
  }

  function onNextLevel() {
    if (!engine.value) return;
    const next = getNextLevelForId(engine.value.maze.id);
    if (next) {
      engine.value.loadLevel(next);
      currentLevelId = next;
      syncActiveWorldForLevel(next);
      instruction.value = engine.value.maze.instruction || '';
    } else {
      completedLevels.value = GameStorage.getCompletedLevels();
      syncActiveWorldForLevel(engine.value.maze.id);
      showLevelSelect.value = true;
    }
    showNext.value = false;
  }

  function onResetTap() {
    if (!engine.value) return;
    engine.value.loadLevel(currentLevelId || engine.value.maze.id);
    currentLevelId = engine.value.maze.id;
    syncActiveWorldForLevel(currentLevelId);
    showNext.value = false;
    instruction.value = engine.value.maze.instruction || '';
  }

  function onLevelWorldTap(id: string) {
    activeLevelWorldId.value = id;
  }

  function getActiveLevelWorld() {
    return (
      levelWorlds.find((world) => world.id === activeLevelWorldId.value) ||
      levelWorlds[0]
    );
  }

  function getLevelWorldForId(id: string) {
    return (
      levelWorlds.find((world) =>
        world.levels.some((level: any) => level.id === id),
      ) || levelWorlds[0]
    );
  }

  function syncActiveWorldForLevel(id: string) {
    if (!id) return;
    activeLevelWorldId.value = getLevelWorldForId(id).id;
  }

  function getLevelIndexInWorld(world: any, id: string) {
    if (!world || !id) return -1;
    return world.levels.findIndex((level: any) => level.id === id);
  }

  function levelWorldCurrentText(world: any) {
    const id = currentLevelId || (engine.value && engine.value.maze.id) || '';
    const index = getLevelIndexInWorld(world, id);
    return index >= 0 ? `\u7b2c ${index + 1} \u5173` : '';
  }

  function getNextLevelForId(id: string) {
    if (getLevelWorldForId(id).id === 'cat-scratcher') {
      return getNextRubikScratchLevel(id);
    }
    if (getLevelWorldForId(id).id === 'yarn-ball') {
      return getNextYarnTimeLevel(id);
    }
    return getNextLevel(id);
  }

  function refreshRewards() {
    rewardState.value = RewardStorage.getState();
    ensureStickerSelection();
    applyEquippedRewards();
  }

  function applySyncedRewardScores(result: any) {
    const scores = result && (result.syncedScores || result.scores);
    if (!scores) return;
    const merged = RewardStorage.mergeLevelScores(scores);
    if (!merged.changed) return;
    rewardState.value = merged.state;
    applyEquippedRewards();
  }

  function onRewardTabTap(tab: string) {
    activeRewardTab.value = tab;
    taskHint.value = '';
    if (tab === 'sticker') {
      ensureStickerSelection();
    }
    if (tab === 'leaderboard') {
      if (activeLeaderboardScope.value === 'server') {
        loadLeaderboard();
      }
    }
  }

  function onLeaderboardScopeTap(scope: string) {
    activeLeaderboardScope.value = scope === 'server' ? 'server' : 'friend';
    if (activeLeaderboardScope.value === 'server') {
      loadLeaderboard();
    } else {
      leaderboardError.value = '';
    }
  }

  function syncLeaderboardInBackground() {
    if (
      !LeaderboardClient.isSupported() &&
      !LeaderboardClient.isFriendLeaderboardSupported()
    ) {
      return;
    }
    leaderboardSyncPending = true;
    const elapsed = Date.now() - leaderboardLastSyncAt;
    const wait = Math.max(
      leaderboardSyncDelay,
      leaderboardSyncMinInterval - elapsed,
    );
    if (leaderboardSyncTimer) return;
    leaderboardSyncTimer = setTimeout(runQueuedLeaderboardSync, wait);
  }

  async function runQueuedLeaderboardSync() {
    leaderboardSyncTimer = null;
    if (!leaderboardSyncPending || leaderboardSyncInFlight) return;
    leaderboardSyncPending = false;
    leaderboardSyncInFlight = true;
    leaderboardLastSyncAt = Date.now();
    try {
      await LeaderboardClient.syncFriendScore(rewardState.value.levelScores || {});
      const result = LeaderboardClient.isSupported()
        ? await LeaderboardClient.syncScore(
            rewardState.value.levelScores || {},
            leaderboardProfile.value,
          )
        : null;
      applySyncedRewardScores(result);
    } catch (e) {
      /* leaderboard sync is best-effort */
    } finally {
      leaderboardSyncInFlight = false;
      if (leaderboardSyncPending) {
        syncLeaderboardInBackground();
      }
    }
  }

  async function loadLeaderboard() {
    refreshRewards();
    if (activeLeaderboardScope.value === 'friend') {
      await LeaderboardClient.syncFriendScore(rewardState.value.levelScores || {});
      return;
    }
    if (!LeaderboardClient.isSupported()) {
      leaderboardStatus.value = 'unavailable';
      leaderboardRows.value = [];
      leaderboardSelf.value = null;
      return;
    }
    leaderboardStatus.value = 'loading';
    leaderboardError.value = '';
    if (leaderboardSyncTimer) {
      clearTimeout(leaderboardSyncTimer);
      leaderboardSyncTimer = null;
    }
    leaderboardSyncPending = false;
    try {
      const result: any = await LeaderboardClient.syncAndFetch(
        rewardState.value.levelScores || {},
        {
          profile: leaderboardProfile.value,
          limit: 10,
        },
      );
      if (result && result.ok === false) {
        leaderboardRows.value = [];
        leaderboardSelf.value = null;
        leaderboardError.value = leaderboardLoadFailedText;
        leaderboardStatus.value = 'error';
        return;
      }
      applySyncedRewardScores(result);
      leaderboardRows.value = result.rows || [];
      leaderboardSelf.value = result.self || null;
      leaderboardStatus.value = 'ready';
      leaderboardLastSyncAt = Date.now();
    } catch (e: any) {
      leaderboardError.value = leaderboardLoadFailedText;
      leaderboardStatus.value = 'error';
    }
  }

  async function onAuthorizeLeaderboard() {
    const result: any = await LeaderboardClient.requestProfile();
    if (!result.ok) {
      leaderboardProfile.value = LeaderboardClient.getStoredProfile();
      return;
    }
    leaderboardProfile.value = result.profile;
    await loadLeaderboard();
  }

  function applyEquippedRewards() {
    if (engine.value && engine.value.setEquippedAccessory) {
      engine.value.setEquippedAccessory(
        rewardState.value.equippedAccessoryId || '',
      );
    }
    if (engine.value && engine.value.setEquippedExpression) {
      engine.value.setEquippedExpression(
        rewardState.value.equippedExpressionId || '',
      );
    }
  }

  function isOwned(item: any) {
    if (isStickerRewardItem(item)) {
      return rewardState.value.ownedStickerIds.includes(item.id);
    }
    if (item.type === 'expression') {
      return rewardState.value.ownedExpressionIds.includes(item.id);
    }
    return rewardState.value.ownedAccessoryIds.includes(item.id);
  }

  function isEquipped(item: any) {
    if (isStickerRewardItem(item)) return false;
    return item.type === 'expression'
      ? rewardState.value.equippedExpressionId === item.id
      : rewardState.value.equippedAccessoryId === item.id;
  }

  function canUseReward(item: any) {
    if (isStickerRewardItem(item)) return false;
    return isOwned(item) || (isScoreReward(item) && totalScore.value >= item.requiredScore);
  }

  function rewardStatus(item: any) {
    if (isStickerRewardItem(item)) {
      return isOwned(item) ? '\u5df2\u6536\u85cf' : getRewardSourceText(item);
    }
    if (isEquipped(item)) return '\u5df2\u88c5\u5907';
    if (isOwned(item)) return '\u5df2\u62e5\u6709';
    return getRewardSourceText(item);
  }

  function rewardActionText(item: any) {
    if (isEquipped(item)) return '\u5378\u4e0b';
    if (isOwned(item)) return '\u88c5\u5907';
    if (isScoreReward(item) && totalScore.value >= item.requiredScore) return '\u5151\u6362';
    if (!isScoreReward(item)) return '\u672a\u9886\u53d6';
    return '\u672a\u8fbe\u6210';
  }

  function onRewardAction(item: any) {
    if (isStickerRewardItem(item)) return;
    if (!canUseReward(item)) return;

    if (isEquipped(item)) {
      const unequipped =
        item.type === 'expression'
          ? RewardStorage.equipExpression('')
          : RewardStorage.equipAccessory('');
      rewardState.value = unequipped.state;
      applyEquippedRewards();
      scheduleRewardPreviewRender();
      return;
    }

    if (!isOwned(item)) {
      const redeemed =
        item.type === 'expression'
          ? RewardStorage.redeemExpression(item.id)
          : RewardStorage.redeemAccessory(item.id);
      rewardState.value = redeemed.state;
      if (!redeemed.ok) return;
    }

    const equipped =
      item.type === 'expression'
        ? RewardStorage.equipExpression(item.id)
        : RewardStorage.equipAccessory(item.id);
    rewardState.value = equipped.state;
    applyEquippedRewards();
  }

  function onRewardRowTap(item: any) {
    if (!isStickerRewardItem(item) || !isOwned(item)) return;
    selectedStickerId.value = item.id;
  }

  function getEquippedAccessoryName() {
    const id = rewardState.value.equippedAccessoryId || '';
    const accessory = ACCESSORIES.find((item: any) => item.id === id);
    return accessory ? accessory.name : '\u672a\u6234\u9970\u54c1';
  }

  function getEquippedExpressionName() {
    const id = rewardState.value.equippedExpressionId || '';
    const expression = EXPRESSIONS.find((item: any) => item.id === id);
    return expression ? expression.name : '\u9ed8\u8ba4\u8868\u60c5';
  }

  function isStickerRewardItem(item: any) {
    return !!item && item.type === 'sticker';
  }

  function isSelectedSticker(item: any) {
    return isStickerRewardItem(item) && selectedStickerId.value === item.id;
  }

  function ensureStickerSelection() {
    const ownedIds = rewardState.value.ownedStickerIds || [];
    if (ownedIds.includes(selectedStickerId.value)) return;
    const firstOwned = STICKERS.find((sticker: { id: string }) =>
      ownedIds.includes(sticker.id),
    );
    selectedStickerId.value = firstOwned ? firstOwned.id : '';
  }

  function scheduleRewardPreviewRender() {
    if (!showScoreModal.value || !isRewardTryOnTab.value) return;
    nextTick(() => {
      renderRewardPreviewCanvas();
    });
  }

  function renderRewardPreviewCanvas() {
    if (!showScoreModal.value || !isRewardTryOnTab.value) return;

    // #ifdef H5
    const canvas = document.getElementById(
      'rewardPreviewCanvas',
    ) as HTMLCanvasElement | null;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawTryOnCanvas(canvas, ctx, rect.width || 96, rect.height || 90);
      }
    }
    // #endif

    // #ifdef MP-WEIXIN
    const query = uni.createSelectorQuery().in(instance);
    query
      .select('#rewardPreviewCanvas')
      .fields({ node: true, size: true })
      .exec((res: any[]) => {
        const target = res && res[0];
        if (!target || !target.node) return;
        const canvasNode = target.node;
        const ctx = canvasNode.getContext('2d');
        if (!ctx) return;
        drawTryOnCanvas(
          canvasNode,
          ctx,
          target.width || 96,
          target.height || 90,
        );
      });
    // #endif
  }

  function drawTryOnCanvas(
    canvas: any,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.fillStyle = '#222238';
    ctx.beginPath();
    ctx.ellipse(width / 2, height - 14, width * 0.32, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(width / 2, height / 2 + 6);
    renderCubAvatar(ctx, 42, {
      accessoryId: tryOnAccessoryId.value,
      expressionId: tryOnExpressionId.value,
      isHovered: true,
      lookOffset: { x: 0, y: 0 },
      time: Date.now() / 1000,
    });
    ctx.restore();
  }

  function getTaskContext() {
    return {
      completedLevels: completedLevels.value,
      levelWorlds,
      canShareMinigame: isShareMinigameSupported(),
    };
  }

  function onTaskAction(task: any) {
    if (!task || !task.canTap) return;
    taskHint.value = '';
    if (task.action === 'claim') {
      const claimed = RewardStorage.claimTaskReward(task.id, getTaskContext());
      rewardState.value = claimed.state;
      refreshRewards();
      return;
    }
    if (task.action === 'share') {
      if (!isShareMinigameSupported()) {
        taskHint.value = shareMinigameOnlyText;
        return;
      }
      shareMinigame({
        success: () => {
          const result = RewardStorage.completeShareMinigame();
          rewardState.value = result.state;
          taskHint.value = shareRewardClaimedText;
          refreshRewards();
        },
        fail: () => {
          taskHint.value = shareMinigameOnlyText;
        },
      });
    }
  }

  function levelTitle(_level: any, index: number) {
    const number = index + 1;
    return number % 10 === 0
      ? `第 ${number} 关 · 彩蛋`
      : `第 ${number} 关`;
  }

  function playerName(row: any) {
    return row && row.nickname ? row.nickname : anonymousPlayerText;
  }

</script>

<style>
  .page {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #1a1a2e;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .top-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 8px;
    background: rgba(26, 26, 46, 0.72);
    box-sizing: border-box;
  }
  .game-area {
    flex: 1;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  .instruction {
    color: #d9d9e6;
    font-size: 13px;
    display: block;
    flex: 1;
    min-width: 0;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: clip;
    white-space: nowrap;
    transform-origin: left center;
  }
  .tool-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 10px;
  }
  .tool-btn {
    width: 46px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .tool-icon,
  .point-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    font-weight: 800;
    line-height: 1;
    position: relative;
  }
  .retry-icon {
    color: #fff;
    background: linear-gradient(180deg, #ffd970 0%, #f2a92e 100%);
    border: 2px solid #9f6a18;
    border-radius: 11px;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.45),
      0 2px 0 rgba(74, 44, 12, 0.2);
  }
  .retry-mark {
    width: 20px;
    height: 20px;
    border: 4px solid #fff;
    border-right-color: transparent;
    border-radius: 50%;
    position: relative;
    box-sizing: border-box;
  }
  .retry-head {
    position: absolute;
    right: -4px;
    top: -5px;
    width: 0;
    height: 0;
    border-left: 8px solid #fff;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    transform: rotate(18deg);
  }
  .settings-icon {
    color: #f5f5f5;
    background: #b9b9b9;
    border: 2px solid #4a4a4a;
    border-radius: 11px;
    box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.38);
  }
  .gear-mark {
    width: 24px;
    height: 24px;
    border: 4px solid #4a4a4a;
    border-radius: 50%;
    background:
      linear-gradient(90deg, transparent 37%, #4a4a4a 37%, #4a4a4a 63%, transparent 63%),
      linear-gradient(0deg, transparent 37%, #4a4a4a 37%, #4a4a4a 63%, transparent 63%),
      #d9d9d9;
    position: relative;
    box-sizing: border-box;
  }
  .gear-mark::before {
    content: '';
    position: absolute;
    inset: -8px;
    background:
      linear-gradient(90deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%),
      linear-gradient(0deg, transparent 42%, #4a4a4a 42%, #4a4a4a 58%, transparent 58%);
    transform: rotate(45deg);
    z-index: -1;
  }
  .gear-hole {
    width: 11px;
    height: 11px;
    border: 3px solid #4a4a4a;
    border-radius: 50%;
    background: #f5f5f5;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
  }
  .point-icon {
    filter: drop-shadow(0 2px 0 rgba(74, 44, 12, 0.24));
  }
  .point-shape {
    position: absolute;
    inset: 2px;
    background: linear-gradient(180deg, #ffe8af 0%, #f3b545 100%);
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 100%, 50% 74%, 21% 100%, 32% 57%, 2% 35%, 39% 35%);
  }
  .point-round {
    position: absolute;
    width: 13px;
    height: 13px;
    background: #ffd36d;
    border-radius: 50%;
  }
  .point-round-top {
    top: -1px;
    left: 12.5px;
  }
  .point-round-right {
    top: 10px;
    right: -1px;
  }
  .point-round-bottom-right {
    right: 3px;
    bottom: -1px;
  }
  .point-round-bottom-left {
    left: 3px;
    bottom: -1px;
  }
  .point-round-left {
    top: 10px;
    left: -1px;
  }
  .point-round-inner-top-right,
  .point-round-inner-right,
  .point-round-inner-bottom,
  .point-round-inner-left,
  .point-round-inner-top-left {
    width: 10px;
    height: 10px;
    background: #f7c253;
  }
  .point-round-inner-top-right {
    top: 12px;
    right: 10px;
  }
  .point-round-inner-right {
    top: 20px;
    right: 7px;
  }
  .point-round-inner-bottom {
    left: 14px;
    bottom: 6px;
  }
  .point-round-inner-left {
    top: 20px;
    left: 7px;
  }
  .point-round-inner-top-left {
    top: 12px;
    left: 10px;
  }
  .tool-label {
    color: #eeeeee;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.1;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }
  .modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-box {
    width: 360px;
    max-width: 88vw;
    background: #2a2a40;
    border-radius: 8px;
    padding: 22px;
    box-sizing: border-box;
    max-height: 80vh;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .score-modal {
    max-height: 74vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .modal-title {
    color: #fff;
    font-size: 18px;
    text-align: center;
    margin-bottom: 16px;
    font-weight: 800;
  }
  .level-tabs {
    display: flex;
    gap: 8px;
    padding-bottom: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  }
  .level-tab {
    flex: 1;
    height: 42px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #d9daec;
    background: #2f2f50;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 800;
    box-sizing: border-box;
  }
  .level-tab.active {
    color: #ffe8af;
    border-bottom: 3px solid #ffe8af;
  }
  .level-tab-label {
    font-size: 14px;
    line-height: 16px;
  }
  .level-tab-current {
    margin-top: 2px;
    font-size: 10px;
    line-height: 12px;
    color: #aeb1ca;
    font-weight: 700;
  }
  .level-tab.active .level-tab-current {
    color: #fff2c4;
  }
  .level-scroll {
    max-height: 62vh;
  }
  .level-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .level-cell {
    width: 88px;
    height: 58px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #3a3a55;
    color: #d9daec;
    border: 1px solid #62627f;
    border-radius: 8px;
    font-size: 12px;
    text-align: center;
    line-height: 1.2;
    box-sizing: border-box;
  }
  .level-cell.completed {
    background: linear-gradient(180deg, #ffe8af 0%, #ffc75d 100%);
    border-color: #a96d24;
    color: #6b4518;
  }
  .level-number {
    max-width: 78px;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.15;
    white-space: nowrap;
  }
  .level-status {
    margin-top: 4px;
    font-size: 10px;
    opacity: 0.78;
  }
  .score-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }
  .score-title {
    margin-bottom: 3px;
    text-align: left;
  }
  .score-total {
    min-width: 86px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    color: #ffe8af;
    font-size: 24px;
    font-weight: 900;
  }
  .reward-tabs {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    padding-bottom: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  }
  .reward-tab {
    height: 38px;
    padding: 0 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d9daec;
    background: #2f2f50;
    border: 0;
    border-radius: 13px;
    font-size: 12px;
    font-weight: 800;
    box-sizing: border-box;
  }
  .reward-tab.active {
    color: #ffe8af;
    border-bottom: 3px solid #ffe8af;
  }
  .tryon-panel {
    min-height: 96px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    padding: 10px;
    background: #23233a;
    border: 1px solid #565873;
    border-radius: 8px;
    box-sizing: border-box;
  }
  .sticker-showcase {
    min-height: 96px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    padding: 10px;
    background: #23233a;
    border: 1px solid #565873;
    border-radius: 8px;
    box-sizing: border-box;
  }
  .sticker-showcase-empty {
    width: 96px;
    height: 76px;
    flex-shrink: 0;
    border-radius: 8px;
    border: 1px dashed #6a6d89;
    color: #aeb0c8;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8px;
    box-sizing: border-box;
  }
  .sticker-showcase-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
  }
  .tryon-canvas {
    width: 96px;
    height: 76px;
    flex-shrink: 0;
    border-radius: 8px;
    background:
      radial-gradient(ellipse at 50% 82%, rgba(255, 232, 175, 0.16) 0 32%, transparent 33%),
      linear-gradient(180deg, #303052 0%, #222238 100%);
  }
  .tryon-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
  }
  .tryon-label {
    color: #aeb0c8;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.2;
  }
  .tryon-name {
    color: #f2f2f7;
    font-size: 15px;
    font-weight: 900;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tryon-status {
    color: #ffe8af;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .reward-scroll {
    max-height: 46vh;
  }
  .reward-scroll-with-tryon {
    max-height: calc(46vh - 106px);
    min-height: 144px;
  }
  .task-panel {
    min-height: 250px;
  }
  .task-hint {
    min-height: 28px;
    margin-bottom: 8px;
    padding: 7px 9px;
    color: #ffe8af;
    background: #34344f;
    border: 1px solid #565873;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    box-sizing: border-box;
  }
  .leaderboard-panel {
    min-height: 260px;
  }
  .leaderboard-scope-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .leaderboard-scope-tab {
    flex: 1;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d9daec;
    background: #2f2f50;
    border: 1px solid #565873;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 900;
    box-sizing: border-box;
  }
  .leaderboard-scope-tab.active {
    color: #ffe8af;
    background: #3d3f51;
    border: 2px solid #ffe8af;
  }
  .leaderboard-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .leaderboard-self {
    flex: 1;
    min-width: 0;
    height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    background: #34344f;
    border-radius: 8px;
    box-sizing: border-box;
  }
  .leaderboard-self-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #222238;
    flex-shrink: 0;
  }
  .leaderboard-self-avatar.placeholder {
    border: 2px solid #5c5f77;
    box-sizing: border-box;
  }
  .leaderboard-self-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
  }
  .leaderboard-self-label {
    color: #aeb0c8;
    font-size: 11px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .leaderboard-self-score {
    color: #ffe8af;
    font-size: 15px;
    font-weight: 900;
  }
  .leaderboard-auth,
  .leaderboard-retry {
    min-width: 82px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f3713;
    background: linear-gradient(180deg, #ffe1a2 0%, #f2b653 100%);
    border: 2px solid #98621f;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 900;
    box-sizing: border-box;
  }
  .leaderboard-scroll {
    max-height: 46vh;
  }
  @media (max-height: 700px) {
    .score-modal {
      max-height: 72vh;
      padding: 18px;
    }
    .score-head {
      margin-bottom: 10px;
    }
    .reward-tabs {
      margin-bottom: 10px;
    }
    .tryon-panel {
      min-height: 86px;
      gap: 10px;
      margin-bottom: 8px;
      padding: 8px;
    }
    .sticker-showcase {
      min-height: 86px;
      gap: 10px;
      margin-bottom: 8px;
      padding: 8px;
    }
    .tryon-canvas {
      width: 88px;
      height: 68px;
    }
    .sticker-art.large,
    .sticker-showcase-empty {
      width: 88px;
      height: 68px;
    }
    .reward-scroll-with-tryon {
      max-height: calc(46vh - 100px);
      min-height: 132px;
    }
  }
  .leaderboard-retry {
    margin-top: 4px;
  }
  .leaderboard-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 7px 9px;
    margin-bottom: 8px;
    border-radius: 8px;
    background: #34344f;
    border: 1px solid #565873;
    box-sizing: border-box;
  }
  .leaderboard-row.self {
    border-color: #d5a544;
    background: #3d3f51;
  }
  .leaderboard-rank {
    width: 38px;
    color: #ffe8af;
    font-size: 13px;
    font-weight: 900;
  }
  .leaderboard-avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #222238;
    flex-shrink: 0;
  }
  .leaderboard-avatar.placeholder {
    border: 2px solid #5c5f77;
    box-sizing: border-box;
  }
  .leaderboard-name {
    flex: 1;
    min-width: 0;
    color: #f2f2f7;
    font-size: 13px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .leaderboard-score {
    min-width: 40px;
    color: #ffe8af;
    text-align: right;
    font-size: 15px;
    font-weight: 900;
  }
  .leaderboard-empty {
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #aeb0c8;
    font-size: 13px;
    line-height: 1.45;
    text-align: center;
  }
  .leaderboard-empty > text {
    max-width: 220px;
  }
  .reward-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 64px;
    padding: 9px;
    margin-bottom: 9px;
    border-radius: 8px;
    background: #34344f;
    border: 1px solid #565873;
    box-sizing: border-box;
  }
  .reward-row.owned {
    border-color: #d5a544;
  }
  .reward-row.equipped {
    background: #3d3f51;
    border-color: #7dc88a;
  }
  .reward-row.selected {
    border-color: #9db6ff;
    box-shadow: inset 0 0 0 1px rgba(157, 182, 255, 0.4);
  }
  .task-row {
    min-height: 62px;
  }
  .reward-preview {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #222238;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .preview-mark {
    width: 24px;
    height: 24px;
    position: relative;
  }
  .sticker-art {
    position: relative;
    overflow: hidden;
    border-radius: 7px;
    border: 1px solid #7e80a7;
    background:
      radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.35) 0 16%, transparent 17%),
      linear-gradient(180deg, #3f4267 0%, #2b2d49 100%);
  }
  .sticker-art::before,
  .sticker-art::after {
    content: '';
    position: absolute;
    bottom: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.84);
  }
  .sticker-art::before {
    left: 7px;
  }
  .sticker-art::after {
    right: 7px;
  }
  .sticker-art.mini {
    width: 28px;
    height: 28px;
  }
  .sticker-art.large {
    width: 96px;
    height: 76px;
    flex-shrink: 0;
    border-radius: 10px;
    border-width: 2px;
  }
  .sticker-art.cat-box-10 {
    background-color: #47528a;
    background-image:
      radial-gradient(circle at 70% 32%, rgba(255, 255, 255, 0.25) 0 18%, transparent 19%),
      linear-gradient(180deg, #7ea1ff 0%, #4a67cc 100%);
  }
  .sticker-art.cat-box-20 {
    background-color: #7b4b32;
    background-image: linear-gradient(180deg, #ffbb70 0%, #e9823b 100%);
  }
  .sticker-art.cat-box-30 {
    background-color: #2f3346;
    background-image: linear-gradient(180deg, #62667f 0%, #2c2f44 100%);
  }
  .sticker-art.cat-box-40 {
    background-color: #6b5179;
    background-image: linear-gradient(180deg, #f3c3ff 0%, #be8be0 100%);
  }
  .sticker-art.cat-box-50 {
    background-color: #5a4a2f;
    background-image: linear-gradient(180deg, #f0ce87 0%, #b9873f 100%);
  }
  .sticker-art.cat-box-60 {
    background-color: #4d5c84;
    background-image: linear-gradient(180deg, #bbd3ff 0%, #7792cc 100%);
  }
  .sticker-art.cat-scratcher-10 {
    background-color: #43566b;
    background-image: linear-gradient(180deg, #9ac8ef 0%, #5f85ad 100%);
  }
  .sticker-art.cat-scratcher-20 {
    background-color: #6d4d7a;
    background-image: linear-gradient(180deg, #ffd4ff 0%, #d08ce8 100%);
  }
  .sticker-art.cat-scratcher-30 {
    background-color: #3f4e74;
    background-image: linear-gradient(180deg, #98c9ff 0%, #5a7fc6 100%);
  }
  .sticker-art.yarn-ball-10 {
    background-color: #4b6576;
    background-image: linear-gradient(180deg, #c2efff 0%, #79b9d2 100%);
  }
  .preview-mark.accessory.red-bow {
    width: 30px;
    height: 20px;
    background:
      radial-gradient(circle at 50% 50%, #ffcad1 0 19%, transparent 20%),
      radial-gradient(ellipse at 27% 44%, #ff7c8f 0 18%, transparent 19%),
      radial-gradient(ellipse at 73% 44%, #ff7c8f 0 18%, transparent 19%),
      radial-gradient(ellipse at 27% 52%, #e84b5f 0 38%, transparent 39%),
      radial-gradient(ellipse at 73% 52%, #e84b5f 0 38%, transparent 39%);
  }
  .preview-mark.accessory.gold-bell {
    background:
      radial-gradient(ellipse at 34% 30%, rgba(255, 255, 255, 0.72) 0 12%, transparent 13%),
      linear-gradient(#f8d86d 0 42%, #f7c84b 43% 100%);
    border: 2px solid #8c5b12;
    border-radius: 50%;
  }
  .preview-mark.accessory.gold-bell::before {
    content: '';
    position: absolute;
    left: 4px;
    right: 4px;
    top: 10px;
    height: 2px;
    background: #8c5b12;
    border-radius: 2px;
  }
  .preview-mark.accessory.gold-bell::after {
    content: '';
    position: absolute;
    left: 9px;
    bottom: 3px;
    width: 6px;
    height: 4px;
    background: #8c5b12;
    border-radius: 50%;
  }
  .preview-mark.accessory.blue-cap {
    width: 31px;
    height: 14px;
    background: #8ec5ff;
    border: 2px solid #ffffff;
    border-radius: 12px;
    transform: rotate(-18deg);
  }
  .preview-mark.accessory.blue-cap::before {
    content: '';
    position: absolute;
    right: 5px;
    top: 4px;
    width: 7px;
    height: 7px;
    background: #ffd6df;
    border-radius: 50%;
    box-shadow:
      -5px -4px 0 -1px #ffd6df,
      0 -6px 0 -1px #ffd6df,
      5px -4px 0 -1px #ffd6df;
  }
  .preview-mark.accessory.star-crown {
    width: 30px;
    height: 24px;
    background:
      radial-gradient(circle at 18% 25%, #ff7fa0 0 10%, transparent 11%),
      radial-gradient(circle at 50% 12%, #ff7fa0 0 11%, transparent 12%),
      radial-gradient(circle at 82% 25%, #ff7fa0 0 10%, transparent 11%),
      linear-gradient(#ffd95c, #f3b545);
    clip-path: polygon(0% 100%, 14% 20%, 38% 78%, 50% 0%, 62% 78%, 86% 20%, 100% 100%);
  }
  .preview-mark.accessory.magic-hat {
    width: 31px;
    height: 23px;
    background:
      linear-gradient(90deg, transparent 41%, #e4474e 42% 58%, transparent 59%),
      linear-gradient(0deg, transparent 36%, #e4474e 37% 61%, transparent 62%),
      linear-gradient(#fff8f8 0 70%, #ffdfe6 71% 100%);
    border: 2px solid #ffffff;
    border-radius: 14px 14px 9px 9px;
  }
  .preview-mark.accessory.lucky-scarf {
    width: 31px;
    height: 20px;
    background:
      linear-gradient(90deg, transparent 68%, #5cb68f 69% 86%, transparent 87%),
      radial-gradient(ellipse at 45% 50%, #78c7a2 0 45%, transparent 46%);
    border: 2px solid #ffffff;
    border-radius: 50%;
  }
  .preview-mark.accessory.box-medal {
    width: 24px;
    height: 30px;
    background:
      linear-gradient(62deg, transparent 0 34%, #e84b5f 35% 51%, transparent 52%),
      linear-gradient(-62deg, transparent 0 34%, #e84b5f 35% 51%, transparent 52%),
      radial-gradient(circle at 50% 70%, #ffd95c 0 30%, #8d6418 31% 38%, transparent 39%);
  }
  .preview-mark.accessory.yarn-pompom {
    width: 26px;
    height: 26px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    background:
      repeating-radial-gradient(ellipse at 50% 50%, transparent 0 4px, rgba(255, 255, 255, 0.85) 5px 6px),
      #ff9fc2;
  }
  .preview-mark.accessory.pixel-gamepad-pin {
    width: 32px;
    height: 16px;
    background:
      radial-gradient(circle at 70% 35%, #ff7fa0 0 8%, transparent 9%),
      radial-gradient(circle at 82% 62%, #7ee8ff 0 8%, transparent 9%),
      linear-gradient(90deg, transparent 16%, #ffe46e 17% 24%, transparent 25%),
      linear-gradient(0deg, transparent 33%, #ffe46e 34% 48%, transparent 49%),
      #5865ff;
    border: 2px solid #ffffff;
    border-radius: 6px;
    transform: rotate(-18deg);
  }
  .preview-mark.accessory.pixel-gamepad-pin::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 5px;
    width: 8px;
    height: 6px;
    background: #7ef0b4;
    border-radius: 2px;
  }
  .preview-mark.accessory.blue-collar-bell {
    width: 30px;
    height: 28px;
    background:
      radial-gradient(ellipse at 34% 48%, rgba(255, 255, 255, 0.7) 0 9%, transparent 10%),
      radial-gradient(circle at 50% 64%, #f7c84b 0 32%, #8c5b12 33% 39%, transparent 40%),
      radial-gradient(ellipse at 50% 28%, transparent 0 55%, #2d7cff 56% 70%, transparent 71%);
  }
  .preview-mark.accessory.blue-collar-bell::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 17px;
    width: 14px;
    height: 2px;
    background: #8c5b12;
    border-radius: 2px;
  }
  .preview-mark.accessory.blue-collar-bell::after {
    content: '';
    position: absolute;
    left: 13px;
    bottom: 2px;
    width: 5px;
    height: 4px;
    background: #8c5b12;
    border-radius: 50%;
  }
  .preview-mark.accessory.patrol-cap {
    width: 32px;
    height: 22px;
    background:
      radial-gradient(circle at 50% 36%, #ffd95c 0 12%, #8d6418 13% 16%, transparent 17%),
      radial-gradient(ellipse at 57% 78%, #23447d 0 49%, transparent 50%),
      radial-gradient(ellipse at 50% 44%, #315aa6 0 59%, transparent 60%);
    border-bottom: 2px solid #ffffff;
    transform: rotate(-5deg);
  }
  .preview-mark.accessory.patrol-cap::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 11px;
    width: 27px;
    height: 7px;
    border-top: 2px solid rgba(255, 255, 255, 0.74);
    border-radius: 50%;
  }
  .preview-mark.expression {
    width: 28px;
    height: 28px;
    background: #1b1b1b;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-sizing: border-box;
  }
  .preview-mark.expression::before,
  .preview-mark.expression::after {
    content: '';
    position: absolute;
    background: #ffffff;
  }
  .preview-mark.expression.sleepy::before {
    left: 6px;
    top: 11px;
    width: 16px;
    height: 7px;
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    background: transparent;
  }
  .preview-mark.expression.joy::before {
    left: 5px;
    top: 8px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: 12px 0 0 #ffffff;
  }
  .preview-mark.expression.joy::after {
    left: 9px;
    top: 17px;
    width: 10px;
    height: 5px;
    border-bottom: 2px solid #ffffff;
    border-radius: 50%;
    background: transparent;
  }
  .preview-mark.expression.surprised::before {
    left: 4px;
    top: 7px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    box-shadow: 14px 0 0 #ffffff;
  }
  .preview-mark.expression.surprised::after {
    left: 11px;
    top: 16px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .preview-mark.expression.angry::before {
    left: 4px;
    top: 6px;
    width: 20px;
    height: 10px;
    background:
      radial-gradient(circle at 41% 60%, #111111 0 19%, transparent 20%),
      radial-gradient(circle at 59% 60%, #111111 0 19%, transparent 20%),
      radial-gradient(ellipse at 25% 62%, #ffffff 0 39%, transparent 40%),
      radial-gradient(ellipse at 75% 62%, #ffffff 0 39%, transparent 40%),
      linear-gradient(25deg, transparent 0 36%, #ee8b73 37% 62%, transparent 63%),
      linear-gradient(-25deg, transparent 0 36%, #ee8b73 37% 62%, transparent 63%),
      linear-gradient(80deg, transparent 0 32%, #ee8b73 33% 67%, transparent 68%),
      linear-gradient(-80deg, transparent 0 32%, #ee8b73 33% 67%, transparent 68%);
    background-repeat: no-repeat;
    background-size:
      100% 100%,
      100% 100%,
      100% 100%,
      100% 100%,
      8px 5px,
      8px 5px,
      4px 5px,
      4px 5px;
    background-position:
      0 0,
      0 0,
      0 0,
      0 0,
      4px 0,
      8px 0,
      9px 0,
      11px 0;
  }
  .preview-mark.expression.angry::after {
    left: 8px;
    top: 18px;
    width: 12px;
    height: 7px;
    background: #5a1c16;
    border-top: 2px solid #ffffff;
    border-radius: 50% 50% 3px 3px;
    box-shadow:
      2px -6px 0 -1px #ee9a8f;
  }
  .preview-mark.expression.angry {
    box-shadow: none;
  }
  .preview-anger-icon {
    position: absolute;
    right: -12px;
    top: -11px;
    width: 19px;
    height: 19px;
    pointer-events: none;
  }
  .preview-anger-icon::before,
  .preview-anger-icon::after {
    content: '';
    position: absolute;
    top: 1px;
    width: 7px;
    height: 12px;
    box-sizing: border-box;
    filter: drop-shadow(1px 1px 0 #7b2c2f);
  }
  .preview-anger-icon::before {
    left: 1px;
    border-left: 4px solid #e4474e;
    border-bottom: 4px solid #e4474e;
    border-radius: 0 0 0 9px;
    transform: rotate(-5deg);
  }
  .preview-anger-icon::after {
    right: 1px;
    border-right: 4px solid #e4474e;
    border-bottom: 4px solid #e4474e;
    border-radius: 0 0 9px 0;
    transform: rotate(6deg);
  }
  .preview-anger-arch {
    position: absolute;
    left: 3px;
    bottom: 1px;
    width: 13px;
    height: 8px;
    border-top: 4px solid #e4474e;
    border-radius: 50% 50% 0 0;
    box-sizing: border-box;
    filter: drop-shadow(1px 1px 0 #7b2c2f);
  }
  .preview-mark.expression.proud::before {
    left: 5px;
    top: 8px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: 12px 0 0 #ffffff;
  }
  .preview-mark.expression.proud::after {
    left: 8px;
    top: 15px;
    width: 12px;
    height: 10px;
    background:
      radial-gradient(ellipse at 50% 82%, #ff7f8e 0 36%, transparent 37%);
    border-bottom: 2px solid #ffffff;
    border-radius: 50%;
  }
  .preview-mark.expression.proud {
    box-shadow:
      -12px -6px 0 -8px #ffd95c,
      12px -9px 0 -7px #ffd95c,
      14px 7px 0 -8px #ffd95c,
      -14px 8px 0 -9px #ffd95c;
  }
  .preview-mark.expression.wink::before {
    left: 5px;
    top: 8px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: 12px 1px 0 -1px #ffffff;
  }
  .preview-mark.expression.wink::after {
    left: 9px;
    top: 17px;
    width: 10px;
    height: 5px;
    border-bottom: 2px solid #ffffff;
    border-radius: 50%;
    background: transparent;
  }
  .preview-mark.expression.sparkle-eyes::before {
    left: 4px;
    top: 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    box-shadow: 13px 0 0 #ffffff;
  }
  .preview-mark.expression.sparkle-eyes::after {
    left: 4px;
    top: 18px;
    width: 20px;
    height: 6px;
    background:
      linear-gradient(90deg, transparent 0 8px, #ffffff 8px 12px, transparent 12px),
      linear-gradient(0deg, transparent 0 2px, #ffffff 2px 4px, transparent 4px);
  }
  .preview-mark.expression.friend-heart::before {
    left: 5px;
    top: 8px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    box-shadow: 12px 0 0 #ffffff;
  }
  .preview-mark.expression.friend-heart::after {
    left: 10px;
    top: 15px;
    width: 9px;
    height: 8px;
    background: #ff8ca6;
    transform: rotate(45deg);
    border-radius: 2px;
  }
  .preview-mark.expression.night-spark {
    box-shadow:
      -11px -7px 0 -8px #7ee8ff,
      12px -8px 0 -8px #ffffff,
      13px 8px 0 -9px #7ee8ff;
  }
  .preview-mark.expression.night-spark::before {
    left: 4px;
    top: 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    box-shadow: 13px 0 0 #ffffff;
  }
  .preview-mark.expression.night-spark::after {
    left: 8px;
    top: 18px;
    width: 12px;
    height: 5px;
    border-bottom: 2px solid #ffffff;
    border-radius: 50%;
    background: transparent;
  }
  .preview-mark.expression.round-blue-smile {
    background:
      radial-gradient(ellipse at 50% 62%, #ffffff 0 54%, transparent 55%),
      #4aa3ff;
  }
  .preview-mark.expression.round-blue-smile::before {
    left: 6px;
    top: 8px;
    width: 5px;
    height: 6px;
    background: #111111;
    border-radius: 50%;
    box-shadow: 11px 0 0 #111111;
  }
  .preview-mark.expression.round-blue-smile::after {
    left: 9px;
    top: 17px;
    width: 10px;
    height: 7px;
    background: #ff7f8e;
    border-radius: 0 0 8px 8px;
  }
  .task-preview {
    color: #ffe8af;
    font-size: 16px;
    font-weight: 900;
  }
  .task-preview-text {
    color: #ffe8af;
    font-size: 16px;
    font-weight: 900;
  }
  .reward-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .reward-name {
    color: #f2f2f7;
    font-size: 14px;
    font-weight: 800;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .reward-desc {
    color: #aeb0c8;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .reward-action {
    min-width: 76px;
    height: 30px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #5f3713;
    background: linear-gradient(180deg, #ffe1a2 0%, #f2b653 100%);
    border: 2px solid #98621f;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 900;
    box-sizing: border-box;
    white-space: nowrap;
  }
  .task-action {
    min-width: 82px;
    padding: 0 6px;
    font-size: 11px;
  }
  .reward-action.disabled {
    color: #82869d;
    background: #3a3b50;
    border-color: #565873;
  }
  .sticker-locked-tag {
    min-width: 76px;
  }
  .next-btn {
    position: fixed;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    min-width: 132px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffe1a2 0%, #f2b653 100%);
    color: #5f3713;
    font-size: 18px;
    font-weight: 800;
    padding: 0 32px;
    border: 3px solid #98621f;
    border-radius: 8px;
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.45),
      0 5px 0 rgba(68, 39, 12, 0.18);
  }
</style>
