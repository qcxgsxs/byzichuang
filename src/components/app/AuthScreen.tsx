import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useBackground } from "@/lib/backgrounds";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useBackground(mode === "login" ? "login" : "register");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) { toast.error("请输入用户名"); return; }
    if (password.length < 6) { toast.error("密码至少6位"); return; }
    setBusy(true);
    const email = usernameToEmail(username);
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() }, emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message.includes("registered") ? "用户名已存在" : error.message);
      else toast.success("注册成功！");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("用户名或密码错误");
    }
    setBusy(false);
  }

  return (
    <Card className="mx-auto max-w-sm border-border p-6">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 text-sm font-semibold transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            {m === "login" ? "登录" : "注册"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>用户名</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
        </div>
        <div className="space-y-1.5">
          <Label>密码</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "login" ? "进入星光" : "注册普通账号"}
        </Button>
        {mode === "register" && (
          <p className="text-center text-xs text-muted-foreground">首个注册的账号将自动成为管理员</p>
        )}
      </form>
    </Card>
  );
}
