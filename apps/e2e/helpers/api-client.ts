/**
 * Plain fetch wrapper for tRPC endpoints.
 * Used for fast test setup (creating servers, workspaces, etc.) without going through the UI.
 * No @trpc/client dependency — keeps E2E decoupled from the app's client setup.
 */
export class ApiClient {
  constructor(
    private baseUrl: string,
    private token?: string
  ) {}

  withAuth(token: string): ApiClient {
    return new ApiClient(this.baseUrl, token);
  }

  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: Record<string, unknown> }> {
    return this.mutation("auth.session.login", { email, password });
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

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
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

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
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
