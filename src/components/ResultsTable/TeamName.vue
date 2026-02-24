<script setup lang="ts">
import { computed } from 'vue';
import { getTeamLogo } from '@/helpers/team-logos';

interface Props {
  teamName: string;
  awayTeam?: boolean;
}

const props = defineProps<Props>();

const teamLogo = computed(() => getTeamLogo(props.teamName));
</script>

<template>
  <div
    :class="['flex gap-1.5 md:gap-3 items-center', {'flex-row-reverse' : awayTeam }]"
  >
    <span class="text-xs md:text-base font-bold truncate">{{ teamName }}</span>
    <span class="w-5 md:w-8 flex items-center justify-center">
      <img :src="teamLogo" :alt="teamName" class="h-5 md:h-8 flex-shrink-0">
    </span>
  </div>
</template>
