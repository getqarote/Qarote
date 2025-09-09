/// <reference types="vite/client" />

// Google Analytics type definitions
interface Window {
  gtag?: (
    command: string,
    action: string,
    params?: {
      page_title?: string;
      page_location?: string;
      page_path?: string;
      [key: string]: any;
    }
  ) => void;
  dataLayer?: any[];
}
