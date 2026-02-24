<script lang="ts" setup>
function formatTime(commenceTime: string | null | undefined): string {
  if (!commenceTime) return '';
  const time = new Date(commenceTime);
  return time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  kickoffTime: string | null | undefined;
}

defineProps<Props>();
</script>

<template>
  <span class="text-xs md:text-sm font-bold whitespace-nowrap">
    {{ formatTime(kickoffTime) }}
  </span>
  <span class="text-[9px] md:text-[10px] text-muted-dark font-medium uppercase mt-0.5"> GMT </span>
</template>
