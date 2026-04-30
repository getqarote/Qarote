import { useEffect, useState } from "react";

import TawkMessengerReact from "@tawk.to/tawk-messenger-react";

import type { ConsentEventDetail } from "@/lib/consent";
import { CONSENT_EVENT, hasConsent } from "@/lib/consent";

const noop = () => {};

export const TawkTo = () => {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(hasConsent());
    const onChange = (e: Event) => {
      // Revocation: cannot cleanly tear down injected Tawk script — handled
      // by a full reload from the revoke flow in consent.ts callers.
      const detail = (e as CustomEvent<ConsentEventDetail>).detail;
      if (detail?.granted) setAllowed(true);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!allowed) return null;

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
