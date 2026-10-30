import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiStore {
  sidebarCollapsed: boolean;
  tourCompleted: boolean;
  toggleSidebar: () => void;
  completeTour: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      tourCompleted: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      completeTour: () => set({ tourCompleted: true }),
    }),
    { name: 'okf-ui' },
  ),
);
