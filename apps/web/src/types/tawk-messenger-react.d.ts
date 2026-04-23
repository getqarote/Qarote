declare module "@tawk.to/tawk-messenger-react" {
  import { Component } from "react";

  interface TawkMessengerReactProps {
    propertyId: string;
    widgetId: string;
    customStyle?: object | null;
    embedId?: string;
    basePath?: string;
    onLoad?: () => void;
    onStatusChange?: (status: string) => void;
    onBeforeLoad?: () => void;
    onChatMaximized?: () => void;
    onChatMinimized?: () => void;
    onChatHidden?: () => void;
    onChatStarted?: () => void;
    onChatEnded?: () => void;
    onPrechatSubmit?: (data: unknown) => void;
    onOfflineSubmit?: (data: unknown) => void;
    onChatMessageVisitor?: (message: unknown) => void;
    onChatMessageAgent?: (message: unknown) => void;
    onChatMessageSystem?: (message: unknown) => void;
    onAgentJoinChat?: (data: unknown) => void;
    onAgentLeaveChat?: (data: unknown) => void;
    onChatSatisfaction?: (satisfaction: unknown) => void;
    onVisitorNameChanged?: (visitorName: unknown) => void;
    onFileUpload?: (link: unknown) => void;
    onTagsUpdated?: (data: unknown) => void;
    onUnreadCountChanged?: (data: unknown) => void;
  }

  export default class TawkMessengerReact extends Component<TawkMessengerReactProps> {}
}
