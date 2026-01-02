module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the conventional commit types
    "type-enum": [
      2,
      "always",
      [
        "feat", // A new feature
        "fix", // A bug fix
        "docs", // Documentation only changes
        "style", // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        "refactor", // A code change that neither fixes a bug nor adds a feature
        "perf", // A code change that improves performance
        "test", // Adding missing tests or correcting existing tests
        "build", // Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
        "ci", // Changes to our CI configuration files and scripts (example scopes: GitHub Actions, Circle, BrowserStack, SauceLabs)
        "chore", // Other changes that don't modify src or test files
        "revert", // Reverts a previous commit
      ],
    ],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Subject must not end with a period
    "subject-full-stop": [2, "never", "."],
    // Type must be lowercase
    "type-case": [2, "always", "lower-case"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Scope must be lowercase
    "scope-case": [2, "always", "lower-case"],
    // Subject must be lowercase (conventional commits standard)
    "subject-case": [2, "always", "lower-case"],
    // Header must not exceed 100 characters
    "header-max-length": [2, "always", 100],
    // Body must have a blank line before it
    "body-leading-blank": [1, "always"],
    // Footer must have a blank line before it
    "footer-leading-blank": [1, "always"],
  },
};

