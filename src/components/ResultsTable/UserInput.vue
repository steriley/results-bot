<script setup lang="ts">
const model = defineModel<number | null>({ required: true });
</script>

<template>
  <input
    type="tel"
    min="0"
    max="9"
    maxlength="1"
    class="w-8 h-8 md:w-12 md:h-10 text-center text-sm md:text-xl border-none focus:ring-0 text-slate-900 dark:text-white font-bold p-0 bg-slate-200 dark:bg-border-dark rounded-md md:rounded-lg flex-shrink-0"
    v-model="model"
  >
</template>
