# Implementation Plan - Real-time Dashboard Updates

## Goal
Enable real-time updates on the `ParentDashboard` by integrating the `useRealtime` hook. This ensures that when a balance deduction or refill alert occurs (e.g., triggered by another user or a background process), the dashboard automatically reflects the changes without a manual refresh.

## Steps

### 1. Update `ParentDashboard` (`src/app/(dashboard)/dashboard/parent/page.tsx`)
- Import `useRealtime` from `@/hooks/useRealtime`.
- Integrate the hook within the component:
  ```typescript
  useRealtime({
      userId: dashboardData?.user?.id || session?.user?.email, // Fallback to email if id not yet loaded
      onBalanceUpdate: () => fetchDashboardData(), // Refresh data on balance change
      onRefillAlert: (data) => {
          toast(`${data.medicationName} needs refill!`, { icon: '💊' });
          fetchDashboardData();
      },
      onNotification: () => fetchDashboardData(), // Refresh on new notification
  });
  ```
- Make sure `dashboardData.user.id` is available. If not, use `session.user` as a temporary identifier or wait for data load.

### 2. Verify Build
- Run `npm run build` to ensure no type errors or build issues are introduced.

## Notes
- `useRealtime` uses Server-Sent Events (SSE) which is compatible with Next.js App Router.
- The `simulate-deduction` API route currently only updates the database. For full real-time broadcasting to *other* users, the server would need to post to the `/api/socket` endpoint. For now, we rely on the client's own action refreshing the data, but adding the listener prepares the dashboard for future server-sent events.
