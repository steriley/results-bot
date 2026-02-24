<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import DateGroup from '@/components/ResultsTable/DateGroup.vue';
import TableDate from '@/components/ResultsTable/TableDate.vue';
import TotalPoints from '@/components/ResultsTable/TotalPoints.vue';
import type { EnrichedFixture } from '@/helpers/merge-fixtures-predictions';
import { fixtureByDates, fixtureDates } from '@/helpers/sort-games-by-date';
import { $gameweek } from '@/stores/gameweek';
import { $gameweekData } from '@/stores/gameweekData';
import type { GameweekFixture } from '@/types/gameweek';

interface Props {
  gameWeek: number;
  fixtures: EnrichedFixture[];
  isInteractive?: boolean;
}

const props = defineProps<Props>();

onBeforeMount(() => {
  $gameweek.set(props.gameWeek);
});

const latestFixtures = ref<GameweekFixture[]>([]);
const hasFixtures = computed(
  () => latestFixtures.value.length > 0 && $gameweek.value !== props.gameWeek,
);

const fixturesByDate = computed(() =>
  fixtureByDates((hasFixtures.value ? latestFixtures.value : props.fixtures) as EnrichedFixture[]),
);
const sortedFixtures = computed(() => fixtureDates(fixturesByDate.value));

$gameweekData.subscribe((state) => {
  if (!state) return;
  latestFixtures.value = state.fixtures;
});
</script>

<template>
  <div class="space-y-6 pb-20">
    <section v-for="date in sortedFixtures" class="space-y-3">
      <TableDate :date="date" />
      <DateGroup :games="fixturesByDate[date]" :isInteractive />
    </section>
    <TotalPoints :games="fixturesByDate" />
  </div>
</template>
