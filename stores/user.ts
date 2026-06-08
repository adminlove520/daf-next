/**
 * 用户状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface UserInfo {
  id: string;
  username: string;
  roles: string[];
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') || '' : '');
  const userInfo = ref<UserInfo | null>(
    (typeof localStorage !== 'undefined' && localStorage.getItem('current_user'))
      ? JSON.parse(localStorage.getItem('current_user')!)
      : null
  );

  const isAdmin = computed(() => {
    return userInfo.value?.roles?.includes('admin') ?? false;
  });

  const isWordManager = computed(() => {
    return userInfo.value?.roles?.includes('word_manager') ?? false;
  });

  function setToken(newToken: string) {
    token.value = newToken;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', newToken);
    }
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(info));
    }
  }

  function logout() {
    token.value = '';
    userInfo.value = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  }

  return {
    token,
    userInfo,
    isAdmin,
    isWordManager,
    setToken,
    setUserInfo,
    logout,
  };
});
