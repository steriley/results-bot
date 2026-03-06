<script setup lang="ts">
import { ref } from 'vue';
import { authClient } from '@/lib/auth-client';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

async function handleSignIn() {
  errorMsg.value = '';
  loading.value = true;

  try {
    const { data, error } = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    });

    if (error) {
      errorMsg.value = error.message || 'Failed to sign in. Please check your credentials.';
    } else {
      // successful login, redirect to home or admin dashboard
      window.location.href = '/';
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-md w-full mx-auto p-8 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-xl">
    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Welcome Back</h2>

    <div v-if="errorMsg" class="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-xl text-red-600 dark:text-red-500 text-sm font-medium">
      {{ errorMsg }}
    </div>

    <form @submit.prevent="handleSignIn" class="space-y-5">
      <div>
        <label for="email" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full mt-8 px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex justify-center items-center shadow-lg shadow-primary/20"
      >
        <span v-if="loading" class="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
        {{ loading ? 'Signing In...' : 'Sign In' }}
      </button>
    </form>
  </div>
</template>
