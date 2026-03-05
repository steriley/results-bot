<script setup lang="ts">
import { computed } from 'vue';
import type { GameweekFixture } from '@/types/gameweek';

interface Props {
  fixtures: GameweekFixture[];
  amount?: number | null;
}

const props = defineProps<Props>();

const calculatedPoints = computed(() =>
  props.fixtures.reduce((total, fixture) => total + fixture.score, 0),
);

const displayPoints = computed(() => props.amount ?? calculatedPoints.value);
</script>

<template>
  <div class="flex flex-col items-end gap-3 pointer-events-none z-40">
    <div
      class="bg-primary text-white p-4 rounded-xl shadow-2xl shadow-primary/20 flex items-center gap-4 pointer-events-auto"
    >
      <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <span class="material-symbols-outlined font-bold">score</span>
      </div>
      <div class="flex flex-col text-right">
        <span class="text-[10px] font-bold uppercase opacity-80 leading-none"
          >Total Points this Week</span
        >
        <span class="text-2xl font-black">{{ displayPoints }}</span>
      </div>
    </div>
  </div>
</template>
