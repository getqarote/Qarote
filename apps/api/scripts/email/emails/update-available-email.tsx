import React from "react";
import UpdateAvailableEmail from "../../../src/services/email/templates/update-available-email";

export default function UpdateAvailableEmailPreview() {
  return (
    <UpdateAvailableEmail
      currentVersion="1.0.0"
      latestVersion="1.1.0"
      releaseUrl="https://github.com/getqarote/Qarote/releases/tag/v1.1.0"
    />
  );
}
