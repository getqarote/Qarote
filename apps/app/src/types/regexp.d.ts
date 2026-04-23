// RegExp.escape() type declaration (JavaScript/Node.js 24+ feature)
// This extends the global RegExpConstructor interface to include the escape method

declare global {
  interface RegExpConstructor {
    /**
     * Escapes special regex characters in a string for safe use in regular expressions.
     * @param str The string to escape
     * @returns The escaped string safe for use in regex patterns
     */
    escape(str: string): string;
  }
}

export {};
