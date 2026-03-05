# State Management - App Dashboard

**Part:** apps/app/  
**Generated:** 2026-01-30  
**Pattern:** React Context API + TanStack Query (React Query)

## Overview

The Qarote dashboard uses a **hybrid state management approach**:
- **React Context API** for global application state (auth, workspace, server selection, theme)
- **TanStack Query (React Query)** for server state and data fetching

## React Contexts

### 1. `AuthContext`
Manages authentication state and session.

**State:**
- `user` - Current user object
- `token` - JWT authentication token
- `isLoading` - Initial auth check loading state

**Methods:**
- `login(token, user)` - Store auth data
- `logout()` - Clear auth data
- `refetchUser()` - Refresh user data from API

**Storage:** localStorage (`auth_token`, `auth_user`)

---

### 2. `UserContext`
Manages current user data and plan information.

**State:**
- `user` - Extended user data
- `userPlan` - Current subscription plan
- `planData` - Plan feature details
- `isLoading` - Loading state

**Methods:**
- `refetchUser()` - Refresh user data
- `refetchPlan()` - Refresh plan data

**Integration:** Uses `trpc.user.getProfile` and `trpc.workspace.plan.getCurrent`

---

### 3. `WorkspaceContext`
Manages active workspace and workspace switching (Enterprise).

**State:**
- `workspace` - Current workspace object
- `workspaces` - Available workspaces for user
- `isLoading` - Loading state

**Methods:**
- `switchWorkspace(id)` - Switch active workspace
- `refetchWorkspace()` - Refresh workspace data

**Integration:** Uses `trpc.workspace.core.get`

---

### 4. `ServerContext`
Manages selected RabbitMQ server for dashboard views.

**State:**
- `selectedServerId` - Currently selected server ID
- `servers` - List of available servers
- `hasServers` - Boolean indicating if user has any servers

**Methods:**
- `selectServer(id)` - Change selected server
- `clearServer()` - Deselect server

**Storage:** localStorage (`selectedServerId`)

---

### 5. `VHostContext`
Manages selected virtual host within a RabbitMQ server.

**State:**
- `selectedVHost` - Currently selected virtual host name
- `vhosts` - Available virtual hosts for server

**Methods:**
- `selectVHost(name)` - Change selected vhost
- `clearVHost()` - Deselect vhost

**Storage:** localStorage (`selectedVHost`)

---

### 6. `ThemeContext`
Manages dark/light theme preference.

**State:**
- `theme` - Current theme (light/dark/system)

**Methods:**
- `setTheme(theme)` - Change theme

**Provider:** Uses `next-themes` library

---

## TanStack Query (React Query)

### Query Organization

All queries are organized in **custom hooks** located in `src/hooks/queries/`:

#### `useRabbitMQ.ts`
RabbitMQ server data queries:
- `useServerOverview(serverId)` - Server statistics
- `useQueues(serverId)` - List queues
- `useQueue(serverId, queueName)` - Queue details
- `useExchanges(serverId)` - List exchanges
- `useConnections(serverId)` - Active connections
- `useNodes(serverId)` - Cluster nodes

#### `useServer.ts`
Server management queries:
- `useServers()` - List all servers
- `useServer(id)` - Single server details
- `useTestConnection()` - Mutation for testing connectivity

#### `useAlerts.ts` (Enterprise)
Alert system queries:
- `useAlerts(serverId)` - List alerts
- `useAlertRules()` - List alert rules
- `useCreateAlertRule()` - Mutation for creating rules

#### `useWorkspaceApi.ts` (Enterprise)
Workspace queries:
- `useWorkspace()` - Current workspace
- `useWorkspaceMembers()` - List members
- `useInvitations()` - Pending invitations

#### `usePlans.ts`
Subscription queries:
- `usePlans()` - Available plans
- `useCurrentPlan()` - Active subscription

#### `useProfile.ts`
User profile queries:
- `useProfile()` - User profile data

### Query Key Organization

Centralized in `src/hooks/queries/queryKeys.ts`:

```typescript
export const queryKeys = {
  servers: ['servers'],
  server: (id: string) => ['server', id],
  queues: (serverId: string) => ['queues', serverId],
  queue: (serverId: string, name: string) => ['queue', serverId, name],
  alerts: (serverId: string) => ['alerts', serverId],
  // ... etc
};
```

### Cache Invalidation Strategy

- **On mutation success** - Invalidate related queries
- **On navigation** - Background refetch of stale data
- **On focus** - Refetch critical data (server overview, alerts)
- **Polling** - Live rates data refreshes every 5 seconds

## Data Flow

1. **User logs in** → `AuthContext.login()` → Store token + user
2. **Select server** → `ServerContext.selectServer()` → Trigger queries for server data
3. **Dashboard loads** → Multiple `useQuery` hooks fetch data in parallel
4. **User updates server** → `useMutation` → Invalidate server queries → Auto-refetch
5. **Real-time updates** → Polling queries for live metrics

## State Persistence

**localStorage:**
- `auth_token` - JWT token
- `auth_user` - User object (serialized)
- `selectedServerId` - Last selected server
- `selectedVHost` - Last selected virtual host
- `theme` - Theme preference

**Memory only:**
- React Query cache (5-minute default)
- Component-local state (forms, modals, etc.)

## Performance Optimizations

- **Query deduplication** - Multiple components requesting same data share a single request
- **Background refetching** - Stale data refetches in background
- **Selective cache invalidation** - Only invalidate affected queries
- **Optimistic updates** - UI updates before server response
