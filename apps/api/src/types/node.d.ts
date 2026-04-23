// Type declarations for Node.js 24 features
// Error.isError() is available in Node.js 24+
declare global {
  interface ErrorConstructor {
    /**
     * Determines whether the provided value is an Error object.
     * More reliable than instanceof Error across different realms.
     * @param value The value to check
     * @returns true if value is an Error object, false otherwise
     */
    isError(value: unknown): value is Error;
  }
}

export {};
