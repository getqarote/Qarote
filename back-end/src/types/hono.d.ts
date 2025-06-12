import { SafeUser } from "../core/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: SafeUser;
  }
}
