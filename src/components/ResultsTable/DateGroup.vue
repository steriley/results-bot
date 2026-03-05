<script setup lang="ts">
import { reactive } from 'vue';
import GameTime from '@/components/ResultsTable/GameTime.vue';
import PointsPill from '@/components/ResultsTable/PointsPill.vue';
import TeamName from '@/components/ResultsTable/TeamName.vue';
import UserInput from '@/components/ResultsTable/UserInput.vue';

interface Props {
  _id: string;
  awayScore: number;
  awayScoreBot: number;
  awayTeam: string;
  commenceTime: string;
  gameWeek: number;
  homeScore: number;
  homeScoreBot: number;
  homeTeam: string;
  isComplete: boolean;
  score: number;
  isInteractive?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['prediction']);

const scorePrediction = reactive({
  home: props.homeScoreBot,
  away: props.awayScoreBot,
});

const onScoreChange = () => {
  emit('prediction', {
    id: props._id,
    score: [scorePrediction.home, scorePrediction.away],
  });
};
</script>

<template>
  <div
    class="flex flex-row items-center p-3 md:p-4 gap-2 md:gap-4 fixture-row transition-colors relative"
  >
    <div class="flex-1 flex flex-row items-center justify-between min-w-0">
      <div class="flex items-center gap-1.5 md:gap-3 flex-1 justify-end text-right min-w-0">
        <TeamName :teamName="homeTeam" />

        <div
          v-if="isComplete && Number.isInteger(homeScore)"
          class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-900 dark:bg-black text-white dark:text-white rounded-md md:rounded-lg flex-shrink-0 shadow-sm"
        >
          {{ homeScore }}
        </div>
        <UserInput
          v-if="isInteractive && !isComplete"
          v-model="scorePrediction.home"
          @blur="onScoreChange"
        />
        <div
          v-if="!isInteractive && !isComplete"
          class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-200 dark:bg-border-dark text-slate-900 dark:text-white rounded-md md:rounded-lg flex-shrink-0"
        >
          {{ homeScoreBot }}
        </div>
      </div>

      <div
        class="px-2 md:px-4 shrink-0 flex flex-col items-center justify-center w-[72px] md:w-[88px]"
      >
        <template
          v-if="isComplete && Number.isInteger(homeScoreBot) && Number.isInteger(awayScoreBot)"
        >
          <span class="text-xs md:text-sm font-bold whitespace-nowrap text-muted-dark pb-0.5">
            {{ homeScoreBot }}
            - {{ awayScoreBot }}
          </span>
          <span
            class="text-[9px] md:text-[10px] text-muted-dark font-medium uppercase border-t border-slate-200 dark:border-slate-700 pt-0.5 w-full text-center"
          >
            PREDICTION
          </span>
        </template>
        <GameTime v-else-if="!isComplete" :kickoffTime="commenceTime" />
      </div>

      <div class="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
        <div
          v-if="isComplete && Number.isInteger(awayScore)"
          class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-900 dark:bg-black text-white dark:text-white rounded-md md:rounded-lg flex-shrink-0 shadow-sm"
        >
          {{ awayScore }}
        </div>

        <div
          v-if="!isInteractive && !isComplete"
          class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-200 dark:bg-border-dark text-slate-900 dark:text-white rounded-md md:rounded-lg flex-shrink-0"
        >
          {{ awayScoreBot }}
        </div>

        <UserInput
          v-if="isInteractive && !isComplete"
          v-model="scorePrediction.away"
          @blur="onScoreChange"
        />

        <TeamName :teamName="awayTeam" :awayTeam="true" />
      </div>
    </div>
    <PointsPill
      v-if="isComplete && score"
      class="absolute right-3 -bottom-3 md:bottom-auto"
      :score="score"
    />
  </div>
</template>
