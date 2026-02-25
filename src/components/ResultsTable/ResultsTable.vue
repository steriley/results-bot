<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, onBeforeMount, ref } from 'vue';
import DateGroup from '@/components/ResultsTable/DateGroup.vue';
import TableDate from '@/components/ResultsTable/TableDate.vue';
import TotalPoints from '@/components/ResultsTable/TotalPoints.vue';
import type { EnrichedFixture } from '@/helpers/merge-fixtures-predictions';
import { fixtureByDates, fixtureDates } from '@/helpers/sort-games-by-date';
import { $gameweek } from '@/stores/gameweek';
import { $gameweekData } from '@/stores/gameweekData';

interface Props {
  gameWeek: number;
  fixtures: EnrichedFixture[];
  isInteractive?: boolean;
}

const props = defineProps<Props>();
const gameweekData = useStore($gameweekData);

onBeforeMount(() => {
  $gameweek.set(props.gameWeek);
});

const fixturesByDate = computed(() =>
  fixtureByDates((gameweekData.value.fixtures ?? props.fixtures) as EnrichedFixture[]),
);
const sortedFixtures = computed(() => fixtureDates(fixturesByDate.value));
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
