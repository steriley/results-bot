<script setup lang="ts">
import DateGroup from '@/components/ResultsTable/DateGroup.vue';
import TableDate from '@/components/ResultsTable/TableDate.vue';
import TotalPoints from '@/components/ResultsTable/TotalPoints.vue';

import type { EnrichedFixture } from '@/helpers/merge-fixtures-predictions';
import type { GameweekFixture } from '@/helpers/gameweek';

import { $gameweekData } from '@/stores/gameweekData';
import { $gameweek } from '@/stores/gameweek';
import { fixtureByDates, fixtureDates } from '@/helpers/sort-games-by-date';

import { ref, computed } from 'vue';

interface Props {
  fixtures: EnrichedFixture[];
  isInteractive?: boolean;
}

const props = defineProps<Props>();

const latestFixtures = ref<GameweekFixture[]>([]);
const hasFixtures = computed(
  () => latestFixtures.value.length > 0 && $gameweek.get() !== 27,
);

const fixturesByDate = computed(() =>
  fixtureByDates(
    (hasFixtures.value
      ? latestFixtures.value
      : props.fixtures) as EnrichedFixture[],
  ),
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
