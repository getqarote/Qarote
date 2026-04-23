/**
 * Plain fetch wrapper for tRPC endpoints.
 * Used for fast test setup (creating servers, workspaces, etc.) without going through the UI.
 * No @trpc/client dependency — keeps E2E decoupled from the app's client setup.
 */
export class ApiClient {
  constructor(
    private baseUrl: string,
    private cookie?: string
  ) {}

  withAuth(cookie: string): ApiClient {
    return new ApiClient(this.baseUrl, cookie);
  }

  async login(
    email: string,
    password: string
  ): Promise<{ cookie: string; user: Record<string, unknown> }> {
    const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    const cookie = setCookieHeaders
      .map((c: string) => c.split(";")[0])
      .join("; ");

    const data = await response.json();
    return { cookie, user: data.user || data };
  }

  async createServer(data: {
    name: string;
    host: string;
    port: number;
    amqpPort: number;
    username: string;
    password: string;
    vhost: string;
    useHttps: boolean;
  }) {
    return this.mutation("rabbitmq.server.createServer", data);
  }

  async query(procedure: string, input?: Record<string, unknown>) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.cookie) {
      headers.Cookie = this.cookie;
    }

    const params = input
      ? `?input=${encodeURIComponent(JSON.stringify(input))}`
      : "";
    const url = `${this.baseUrl}/trpc/${procedure}${params}`;

    const response = await fetch(url, { method: "GET", headers });
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        `tRPC query ${procedure} failed: ${JSON.stringify(data.error || data)}`
      );
    }

    return data.result?.data;
  }

  async mutation(procedure: string, input: Record<string, unknown>) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.cookie) {
      headers.Cookie = this.cookie;
    }

    const url = `${this.baseUrl}/trpc/${procedure}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        `tRPC mutation ${procedure} failed: ${JSON.stringify(data.error || data)}`
      );
    }

    return data.result?.data;
  }
}
