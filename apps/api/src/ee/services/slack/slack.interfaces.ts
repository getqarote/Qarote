export interface SlackMessage {
  text?: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    fields?: Array<{
      type: string;
      text: string;
    }>;
    elements?: Array<{
      type: string;
      text?: {
        type: string;
        text: string;
      };
      url?: string;
      style?: string;
    }>;
  }>;
  attachments?: Array<{
    color: string;
    title: string;
    text: string;
    fields?: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
  }>;
}

export interface SlackResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  retries?: number;
}
