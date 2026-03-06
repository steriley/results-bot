<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, onBeforeMount, ref, watch } from 'vue';
import GameDetail from '@/components/ResultsTable/DateGroup.vue';
import GameDay from '@/components/ResultsTable/GameDay.vue';
import TotalPoints from '@/components/ResultsTable/TotalPoints.vue';
import { debounce } from '@/helpers/debounce';
import { $gameweek } from '@/stores/gameweek';
import { $gameweekData } from '@/stores/gameweekData';
import type { GameweekFixture } from '@/types/gameweek';

interface Fixture extends GameweekFixture {
  isInteractive?: boolean;
}

interface Props {
  gameWeek: number;
  groupedFixtures: Record<string, Fixture[]>;
  isInteractive?: boolean;
  totalPoints?: number;
}

const props = defineProps<Props>();

onBeforeMount(() => {
  $gameweek.set(props.gameWeek);
});

const gameweekData = useStore($gameweekData);
const cachedPoints = computed(() =>
  Number.isInteger(gameweekData.value.totalPoints) && !props.isInteractive
    ? gameweekData.value.totalPoints
    : props.totalPoints,
);

const cachedFixtures = computed(() =>
  Object.keys(gameweekData.value.groupedFixtures).length && !props.isInteractive
    ? gameweekData.value.groupedFixtures
    : props.groupedFixtures,
);

const flatFixtures = computed(() => Object.values(cachedFixtures.value).flat());

const predictions = ref({});

const predictedScores = computed(() => Object.values(predictions.value).flat());
const predictionsComplete = computed(
  () =>
    predictedScores.value.length === flatFixtures.value.length * 2 &&
    !predictedScores.value.includes(''),
);

function savePrediction() {
  if (predictionsComplete.value) {
    fetch('/api/user-prediction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameWeek: $gameweek.value,
        scores: predictions.value,
      }),
    });
  }
}

const onPrediction = (event: { id: string; score: number[] }) => {
  predictions.value = {
    ...predictions.value,
    [event.id]: event.score,
  };

  debounce(savePrediction, 2000)();
};
</script>

<template>
  <div class="space-y-6 pb-20">
    <GameDay v-for="(games, date) in cachedFixtures" :date="date" class="space-y-3">
      <GameDetail
        v-bind="{ ...game }"
        v-for="game in games"
        :isInteractive
        @prediction="onPrediction"
      />
    </GameDay>
    <TotalPoints :fixtures="flatFixtures" :amount="cachedPoints" />
  </div>
</template>
