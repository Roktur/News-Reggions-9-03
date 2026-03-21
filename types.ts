export interface GeneratedImage {
  url: string;
  topic: string;
  timestamp: number;
  aspectRatio: string;
}

export interface ApiError {
  message: string;
}

// Augment window to include aistudio properties
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}