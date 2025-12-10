// Custom Window interface extensions
interface Window {
  gtag?: (
    command: string,
    action: string,
    params?: {
      page_title?: string;
      page_location?: string;
      page_path?: string;
      [key: string]: string | number | boolean | undefined;
    }
  ) => void;
  dataLayer?: unknown[];
  // Tawk.to chat widget API
  Tawk_API?: {
    maximize(): void;
    minimize(): void;
    toggle(): void;
    showWidget(): void;
    hideWidget(): void;
    toggleVisibility(): void;
    getStatus(): string;
    isChatMaximized(): boolean;
    isChatMinimized(): boolean;
    isChatHidden(): boolean;
    isChatOngoing(): boolean;
    isVisitorEngaged(): boolean;
    onLoad(): void;
    onStatusChange(callback: (status: string) => void): void;
    onChatMaximized(callback: () => void): void;
    onChatMinimized(callback: () => void): void;
    onChatHidden(callback: () => void): void;
    onChatStarted(callback: () => void): void;
    onChatEnded(callback: () => void): void;
    onPrechatFormSubmitted(callback: () => void): void;
    onOfflineFormSubmitted(callback: () => void): void;
    onMessageSent(callback: () => void): void;
    onMessageReceived(callback: () => void): void;
    addEvent(event: string, metadata: Record<string, unknown>): void;
    addTags(tags: string[]): void;
    removeTags(tags: string[]): void;
    setAttributes(
      attributes: Record<string, string>,
      callback?: () => void
    ): void;
    clearAttributes(): void;
    popup(popup: unknown): void;
    setCustomColor(color: string, widget: string): void;
    widgetPosition(position: string): void;
  };
  Tawk_LoadStart?: Date;
}
