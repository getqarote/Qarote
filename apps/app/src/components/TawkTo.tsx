import { useLocation } from "react-router";

import TawkMessengerReact from "@tawk.to/tawk-messenger-react";

import { isCloudMode } from "@/lib/featureFlags";

const noop = () => {};

export const TawkTo = () => {
  const location = useLocation();

  // Only show Tawk.to in cloud mode, not in self-hosted deployments
  if (!isCloudMode()) {
    return null;
  }

  // Don't show Tawk.to on sign-in or sign-up pages
  const excludedPaths = ["/auth/sign-in", "/auth/sign-up"];
  const shouldShow = !excludedPaths.some((path) =>
    location.pathname.includes(path)
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <TawkMessengerReact
      propertyId="68b6ac54065fda19279ca7e6"
      widgetId="1j44p2ar4"
      onLoad={noop}
      onStatusChange={noop}
      onBeforeLoad={noop}
      onChatMaximized={noop}
      onChatMinimized={noop}
      onChatHidden={noop}
      onChatStarted={noop}
      onChatEnded={noop}
      onPrechatSubmit={noop}
      onOfflineSubmit={noop}
      onChatMessageVisitor={noop}
      onChatMessageAgent={noop}
      onChatMessageSystem={noop}
      onAgentJoinChat={noop}
      onAgentLeaveChat={noop}
      onChatSatisfaction={noop}
      onVisitorNameChanged={noop}
      onFileUpload={noop}
      onTagsUpdated={noop}
      onUnreadCountChanged={noop}
    />
  );
};
