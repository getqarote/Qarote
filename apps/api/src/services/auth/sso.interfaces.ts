export interface AuthCodeEntry {
  jwt: string;
  user: Record<string, unknown>;
  isNewUser: boolean;
  expiresAt: number;
}

export interface SSOExchangeCodeResult {
  jwt: string;
  user: Record<string, unknown>;
  isNewUser: boolean;
}
