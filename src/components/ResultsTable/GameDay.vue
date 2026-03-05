<script setup lang="ts">
import TableDate from '@/components/ResultsTable/TableDate.vue';

interface Props {
  date: string;
}

defineProps<Props>();
</script>

<template>
  <section class="space-y-3">
    <TableDate :date="date" />
    <div
      class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl shadow-sm divide-y divide-slate-100 dark:divide-border-dark"
    >
      <slot />
    </div>
  </section>
</template>
