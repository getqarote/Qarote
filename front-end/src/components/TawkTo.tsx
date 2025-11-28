import { useLocation } from "react-router-dom";

import TawkMessengerReact from "@tawk.to/tawk-messenger-react";

export const TawkTo = () => {
  const location = useLocation();

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
    />
  );
};
