import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BACKGROUNDS } from "@/lib/backgrounds";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "重设密码 · 七彩星光自创语言" },
      { name: "description", content: "通过管理员提供的链接重设账号密码。" },
      { property: "og:title", content: "重设密码 · 七彩星光自创语言" },
      { property: "og:description", content: "通过管理员提供的链接重设账号密码。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return void toast.error("密码至少6位");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return void toast.error("链接已失效，请让管理员重新获取");
    setDone(true);
    toast.success("密码已重设");
  }

  return (
    <div className="relative min-h-screen">
      <img src={BACKGROUNDS.login} alt="" className="pointer-events-none fixed inset-0 h-full w-full object-cover" />
      <div className="relative mx-auto max-w-sm px-4 py-16">
        <h1 className="font-display text-rainbow mb-6 text-center text-3xl">重设密码</h1>
        <Card className="p-6">
          {done ? (
            <Link to="/" className="block text-center font-semibold text-primary">返回登录 →</Link>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5"><Label>新密码</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
              <Button type="submit" className="w-full">确认重设</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
