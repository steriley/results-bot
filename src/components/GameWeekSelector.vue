<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed } from 'vue';
import { $gameweek, $lastGameweek, $setGameweek } from '@/stores/gameweek';
import { $gameweekData } from '@/stores/gameweekData';

const gameweek = useStore($gameweek);
const lastGameweek = useStore($lastGameweek);
const gameweekData = useStore($gameweekData);

interface Props {
  startDate: string;
  endDate: string;
}

const props = defineProps<Props>();

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const gameWeekRange = computed(() => {
  const { start, end } = gameweekData.value.dateRange;
  const startDate = start === '' ? props.startDate : start;
  const endDate = end === '' ? props.endDate : end;

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
});
</script>

<template>
  <div class="flex items-center gap-4 md:gap-6 bg-transparent">
    <button
      @click="$setGameweek(-1)"
      :disabled="gameweek === 1"
      type="button"
      class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-surface-dark/50 hover:bg-slate-300 dark:hover:bg-border-dark transition-colors text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label="Previous Matchweek"
    >
      <span class="material-symbols-outlined text-lg md:text-xl">chevron_left</span>
    </button>

    <div class="flex flex-col items-center justify-center min-w-[120px] md:min-w-[160px]">
      <span class="text-base md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        Matchweek {{ gameweek }}
      </span>
      <span class="text-[11px] md:text-sm text-slate-500 dark:text-muted-dark">
        {{ gameWeekRange }}
      </span>
    </div>

    <button
      @click="$setGameweek(1)"
      type="button"
      :disabled="gameweek === lastGameweek"
      class="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-surface-dark/50 hover:bg-slate-300 dark:hover:bg-border-dark transition-colors text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
      aria-label="Next Matchweek"
    >
      <span class="material-symbols-outlined text-lg md:text-xl">chevron_right</span>
    </button>
  </div>
</template>
