import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      refreshTrigger: 0,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
    }),
    { 
      name: 'courtiq-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
