import log from "loglevel";

// Configure log level based on environment
if (import.meta.env.MODE === "development") {
  // In development, show all logs including debug
  log.setLevel("debug");
} else {
  // In production, only show warnings and errors
  log.setLevel("warn");
}

// Optional: Customize the logger with timestamps for better debugging
const originalFactory = log.methodFactory;

log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return function (message, ...args) {
    // Add timestamp in development for better debugging
    if (import.meta.env.MODE === "development") {
      const timestamp = new Date().toISOString().substr(11, 12);
      rawMethod(`[${timestamp}] ${message}`, ...args);
    } else {
      rawMethod(message, ...args);
    }
  };
};

// Apply the custom method factory
log.rebuild();

export default log;
