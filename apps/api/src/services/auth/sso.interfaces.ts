export interface SSOExchangeCodeResult {
  jwt: string;
  user: Record<string, unknown>;
  isNewUser: boolean;
}
