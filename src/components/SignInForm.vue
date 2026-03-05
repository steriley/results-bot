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
  <div class="max-w-md w-full mx-auto p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
    <h2 class="text-2xl font-bold text-white mb-6 text-center">Sign In</h2>

    <div v-if="errorMsg" class="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
      {{ errorMsg }}
    </div>

    <form @submit.prevent="handleSignIn" class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-slate-300 mb-1">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex justify-center items-center"
      >
        <span v-if="loading" class="mr-2 inline-block h-4 w-4 rounded-full border-2 border-slate-200 border-t-white animate-spin"></span>
        {{ loading ? 'Signing In...' : 'Sign In' }}
      </button>
    </form>
  </div>
</template>
