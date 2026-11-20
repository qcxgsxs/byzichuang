import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuizPanel } from "./QuizPanel";
import { CreatorPanel } from "./CreatorPanel";
import { AdminPanel } from "./AdminPanel";
import { useBackground } from "@/lib/backgrounds";

function Bg({ k }: { k: Parameters<typeof useBackground>[0] }) {
  useBackground(k);
  return null;
}

export function Dashboard({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["me", userId],
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      return { profile, role: roles?.[0]?.role ?? "user" };
    },
  });

  if (isLoading || !data) return <p className="text-center text-muted-foreground">加载中…</p>;
  const { profile, role } = data;

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="font-display text-xl">{profile?.username}</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABEL[role]} · {STATUS_LABEL[profile?.status ?? "active"]}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {role === "user" && (
            <div className="rounded-full bg-secondary px-4 py-1.5 text-sm">
              <span className="font-bold text-primary">{Number(profile?.balance ?? 0)}</span> 葛掉元
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            退出
          </Button>
        </div>
      </Card>

      {profile?.status === "banned" ? (
        <Card className="p-6 text-center text-destructive"><Bg k="banned" />你的账号已被封控，无法使用。</Card>
      ) : profile?.status === "frozen" ? (
        <Card className="p-6 text-center text-muted-foreground"><Bg k="frozen" />你的账号已被冻结，暂时无法操作。</Card>
      ) : role === "admin" ? (
        <AdminPanel userId={userId} />
      ) : role === "creator" ? (
        <CreatorPanel userId={userId} />
      ) : (
        <QuizPanel userId={userId} />
      )}
    </div>
  );
}
