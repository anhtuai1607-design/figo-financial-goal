import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCloudSync } from "@/lib/cloud-sync";
import { Splash } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Local session read (instant); the backend still verifies every data request.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const { ready, error } = useCloudSync(user.id);
  if (error) return <div className="py-20 text-center text-sm text-destructive">{error}</div>;
  if (!ready) return <Splash />;
  return <Outlet />;
}
