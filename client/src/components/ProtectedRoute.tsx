import { Route, Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({
  path,
  component: C,
}: {
  path: string;
  component: any;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  return (
    <Route path={path}>
      {() => {
        if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
        if (!isAuthenticated) return <Redirect to="/api/login" />;
        return <C />;
      }}
    </Route>
  );
}
