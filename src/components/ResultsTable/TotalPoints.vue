<script setup lang="ts">
import type { EnrichedFixture } from '@/helpers/merge-fixtures-predictions';

interface Props {
  games: Record<string, EnrichedFixture[]>;
}

function totalPoints(games: Record<string, EnrichedFixture[]>): number {
  return Object.values(games)
    .flat()
    .reduce((sum, game) => {
      return sum + (game.points?.score ?? 0);
    }, 0);
}

defineProps<Props>();
</script>

<template>
  <div class="flex flex-col items-end gap-3 pointer-events-none z-40">
    <div
      class="bg-primary text-white p-4 rounded-xl shadow-2xl shadow-primary/20 flex items-center gap-4 pointer-events-auto"
    >
      <div
        class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
      >
        <span class="material-symbols-outlined font-bold">score</span>
      </div>
      <div class="flex flex-col text-right">
        <span class="text-[10px] font-bold uppercase opacity-80 leading-none"
          >Total Points this Week</span
        >
        <span class="text-2xl font-black">{{ totalPoints(games) }}</span>
      </div>
    </div>
  </div>
</template>
