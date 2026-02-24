<script setup lang="ts">
import type { PillType } from '@/helpers/get-predicition-points';

interface Props {
  type: PillType;
  score: number;
}

function getPillClass(type: PillType): string {
  switch (type) {
    case 'exact':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'result':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'goal':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
  }
}

defineProps<Props>();
</script>

<template>
  <span
    :class="[`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold border ${getPillClass(type)}`]"
  >
    + {{ score }} pts
  </span>
</template>
