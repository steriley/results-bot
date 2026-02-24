<script setup lang="ts">
import GameTime from '@/components/ResultsTable/GameTime.vue';
import PointsPill from '@/components/ResultsTable/PointsPill.vue';
import TeamName from '@/components/ResultsTable/TeamName.vue';
import UserInput from '@/components/ResultsTable/UserInput.vue';
import type { EnrichedFixture } from '@/helpers/merge-fixtures-predictions';

interface Props {
  games: EnrichedFixture[];
  showAIPredict?: boolean;
  showUserInputs?: boolean;
}

defineProps<Props>();
</script>

<template>
  <div
    class="bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl shadow-sm divide-y divide-slate-100 dark:divide-border-dark"
  >
    <div
      v-for="{ predictedScoreHome, predictedScoreAway, homeTeam, awayTeam, finalScore, points, finished: isCompleted, commenceTime, gameId } in games"
      :key="gameId"
      class="flex flex-row items-center p-3 md:p-4 gap-2 md:gap-4 fixture-row transition-colors relative"
    >
      <div class="flex-1 flex flex-row items-center justify-between min-w-0">
        <div
          class="flex items-center gap-1.5 md:gap-3 flex-1 justify-end text-right min-w-0"
        >
          <TeamName :teamName="homeTeam" />

          <div
            v-if="isCompleted && finalScore"
            class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-900 dark:bg-black text-white dark:text-white rounded-md md:rounded-lg flex-shrink-0 shadow-sm"
          >
            {{ finalScore.homeTeam }}
          </div>
          <UserInput v-if="showUserInputs" :score="predictedScoreHome" />
          <div
            v-if="!showUserInputs && showAIPredict"
            class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-200 dark:bg-border-dark text-slate-900 dark:text-white rounded-md md:rounded-lg flex-shrink-0"
          >
            {{ predictedScoreHome }}
          </div>
        </div>

        <div
          class="px-2 md:px-4 shrink-0 flex flex-col items-center justify-center w-[72px] md:w-[88px]"
        >
          <template
            v-if="isCompleted && predictedScoreHome !== undefined && predictedScoreAway !== undefined"
          >
            <span
              class="text-xs md:text-sm font-bold whitespace-nowrap text-muted-dark pb-0.5"
            >
              {{ predictedScoreHome }}
              - {{ predictedScoreAway }}
            </span>
            <span
              class="text-[9px] md:text-[10px] text-muted-dark font-medium uppercase border-t border-slate-200 dark:border-slate-700 pt-0.5 w-full text-center"
            >
              PREDICTION
            </span>
          </template>
          <GameTime v-else-if="!isCompleted" :kickoffTime="commenceTime" />
        </div>

        <div class="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
          <div
            v-if="isCompleted && finalScore"
            class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-900 dark:bg-black text-white dark:text-white rounded-md md:rounded-lg flex-shrink-0 shadow-sm"
          >
            {{ finalScore.awayTeam }}
          </div>

          <div
            v-if="!showUserInputs && showAIPredict"
            class="w-8 h-8 md:w-12 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold bg-slate-200 dark:bg-border-dark text-slate-900 dark:text-white rounded-md md:rounded-lg flex-shrink-0"
          >
            {{ predictedScoreAway }}
          </div>

          <UserInput v-if="showUserInputs" :score="predictedScoreAway" />

          <TeamName :teamName="awayTeam" :awayTeam="true" />
        </div>
      </div>

      <PointsPill
        v-if="isCompleted && points"
        class="absolute bottom-1 right-1"
        :score="points?.score"
        :type="points?.type"
      />
    </div>
  </div>
</template>
