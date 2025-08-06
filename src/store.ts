import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  url: string
  iframeUrl: string
  iframeMessage: string
  setUrl: (url: string) => void
  setIframeUrl: (url: string) => void
  setIframeMessage: (message: string) => void
  loadUrl: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      url: '',
      iframeUrl: '',
      iframeMessage: '',
      setUrl: (url: string) => set({ url }),
      setIframeUrl: (url: string) => set({ iframeUrl: url }),
      setIframeMessage: (message: string) => set({ iframeMessage: message }),
      loadUrl: () => {
        const { url } = get()
        if (url.trim()) {
          set({ iframeUrl: url.trim() })
        }
      },
    }),
    {
      name: 'embed-app-storage', // unique name for localStorage key
      partialize: (state) => ({
        url: state.url,
        iframeUrl: state.iframeUrl,
        iframeMessage: state.iframeMessage,
      }),
    }
  )
)
