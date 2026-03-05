<script setup lang="ts">
import type { PillType } from '@/helpers/get-predicition-points';

interface Props {
  score: number;
}

function getPillClass(score: number): string {
  switch (score) {
    case 10:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 3:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 1:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    default:
      return '';
  }
}

defineProps<Props>();
</script>

<template>
  <span
    :class="[`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold border ${getPillClass(score)}`]"
  >
    + {{ score }} pts
  </span>
</template>
