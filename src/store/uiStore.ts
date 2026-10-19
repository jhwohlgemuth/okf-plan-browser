import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'okf-ui' },
  ),
);
