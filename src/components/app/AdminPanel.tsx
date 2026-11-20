import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, deleteAccount, resetPassword, getResetLink } from "@/lib/admin.functions";
import { ApiPanel } from "./ApiPanel";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatorPanel } from "./CreatorPanel";
import { useBackground } from "@/lib/backgrounds";

export function AdminPanel({ userId }: { userId: string }) {
  return (
    <Tabs defaultValue="accounts">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="accounts">账号管理</TabsTrigger>
        <TabsTrigger value="questions">全部翻译</TabsTrigger>
        <TabsTrigger value="settings">设置</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>
      <TabsContent value="accounts"><Accounts userId={userId} /></TabsContent>
      <TabsContent value="questions"><CreatorPanel userId={userId} showAll /></TabsContent>
      <TabsContent value="settings"><Settings /></TabsContent>
      <TabsContent value="api"><ApiPanel /></TabsContent>
    </Tabs>
  );
}

function Accounts({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const del = useServerFn(deleteAccount);
  const reset = useServerFn(resetPassword);
  const getLink = useServerFn(getResetLink);

  async function doReset(id: string, name: string) {
    const pw = prompt(`为「${name}」设置新密码（至少6位）`);
    if (!pw) return;
    try {
      await reset({ data: { userId: id, password: pw } });
      toast.success("密码已重设");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function doLink(id: string) {
    try {
      const { link } = await getLink({ data: { userId: id, origin: window.location.origin } });
      await navigator.clipboard.writeText(link).catch(() => {});
      prompt("重设密码链接（已复制，一次有效）", link);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "creator" | "admin">("creator");
  useBackground("adminAccounts");

  const { data } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const rmap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return (profiles ?? []).map((p) => ({ ...p, role: rmap.get(p.id) ?? "user" }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({ data: { username, password, role } });
      toast.success("账号已创建");
      setUsername("");
      setPassword("");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`确定删除账号「${name}」？`)) return;
    try {
      await del({ data: { userId: id } });
      toast.success("已删除");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-display mb-3 text-lg">注册新账号</h2>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-1.5"><Label>用户名</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>密码</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>类型</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="creator">创语账号</option>
              <option value="user">普通账号</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <Button type="submit">创建</Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="font-display mb-3 text-lg">所有账号（{data?.length ?? 0}）</h2>
        <ul className="divide-y divide-border">
          {(data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-semibold">{a.username}</div>
                <div className="text-xs text-muted-foreground">
                  {ROLE_LABEL[a.role]} · {STATUS_LABEL[a.status]}
                  {a.role === "user" && ` · ${Number(a.balance)} 葛掉元`}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="secondary" onClick={() => doReset(a.id, a.username)}>重设密码</Button>
                <Button size="sm" variant="secondary" onClick={() => doLink(a.id)}>重设链接</Button>
              </div>
              {a.id !== userId && (
                <div className="flex flex-wrap gap-1">
                  {a.status !== "active" && <Button size="sm" variant="secondary" onClick={() => setStatus(a.id, "active")}>恢复</Button>}
                  {a.status !== "frozen" && <Button size="sm" variant="secondary" onClick={() => setStatus(a.id, "frozen")}>冻结</Button>}
                  {a.status !== "banned" && <Button size="sm" variant="secondary" onClick={() => setStatus(a.id, "banned")}>封控</Button>}
                  <Button size="sm" variant="destructive" onClick={() => remove(a.id, a.username)}>删除</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function fileToIconDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("图片读取失败"));
    img.src = URL.createObjectURL(file);
  });
}

function Settings() {
  useBackground("adminSettings");
  const qc = useQueryClient();
  const [form, setForm] = useState({ correct_points: "1", wrong_points: "0.5", quiz_mode: "input", cny_rate: "1", show_creator: false });
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  async function uploadIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    try {
      const dataUrl = await fileToIconDataUrl(file);
      const { error } = await supabase.from("settings").update({ favicon_url: dataUrl }).eq("id", 1);
      if (error) throw error;
      toast.success("网址图标已更新");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["favicon"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function restoreIcon() {
    const { error } = await supabase.from("settings").update({ favicon_url: null }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("已恢复默认图标");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["favicon"] });
  }
  useEffect(() => {
    if (data) setForm({ correct_points: String(data.correct_points), wrong_points: String(data.wrong_points), quiz_mode: data.quiz_mode, cny_rate: String(data.cny_rate), show_creator: data.show_creator });
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const c = Number(form.correct_points), w = Number(form.wrong_points);
    const r = Number(form.cny_rate);
    if (!(c >= 0) || !(w >= 0) || !(r >= 0)) { toast.error("请输入有效数字"); return; }
    const { error } = await supabase.from("settings").update({ correct_points: c, wrong_points: w, quiz_mode: form.quiz_mode, cny_rate: r, show_creator: form.show_creator }).eq("id", 1);
    if (error) toast.error(error.message);
    else toast.success("设置已保存");
  }

  return (
    <Card className="p-5">
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>答对加（葛掉元）</Label><Input type="number" step="0.1" value={form.correct_points} onChange={(e) => setForm({ ...form, correct_points: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>答错减（葛掉元）</Label><Input type="number" step="0.1" value={form.wrong_points} onChange={(e) => setForm({ ...form, wrong_points: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>1 葛掉元 = 多少人民币（元）</Label><Input type="number" step="0.01" value={form.cny_rate} onChange={(e) => setForm({ ...form, cny_rate: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>答题形式</Label>
          <div className="grid grid-cols-2 gap-2">
            {([["input", "填空作答"], ["choice", "选择题（A–F 六选一）"]] as const).map(([v, l]) => (
              <Button key={v} type="button" variant={form.quiz_mode === v ? "default" : "secondary"} onClick={() => setForm({ ...form, quiz_mode: v })}>{l}</Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>答题时显示出题账号</Label>
          <div className="grid grid-cols-2 gap-2">
            {([[true, "显示"], [false, "隐藏"]] as const).map(([v, l]) => (
              <Button key={l} type="button" variant={form.show_creator === v ? "default" : "secondary"} onClick={() => setForm({ ...form, show_creator: v })}>{l}</Button>
            ))}
          </div>
        </div>
        <Button type="submit" className="w-full">保存设置</Button>
      </form>
      <ChallengeRules />
      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <Label>网址前面的图标（浏览器标签页图标）</Label>
        <div className="flex items-center gap-3">
          <img
            src={data?.favicon_url || "/favicon.ico"}
            alt="当前图标"
            className="h-10 w-10 rounded-md border border-input object-contain"
          />
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            上传新图标
            <input type="file" accept="image/*" className="hidden" onChange={uploadIcon} />
          </label>
          {data?.favicon_url && (
            <Button type="button" variant="secondary" onClick={restoreIcon}>恢复默认</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">上传任意图片，会自动裁剪为正方形并缩小，保存后立即生效。</p>
      </div>
    </Card>
  );
}

function ChallengeRules() {
  const qc = useQueryClient();
  const [f, setF] = useState({ from: "2", to: "2", c: "0.5", w: "2" });
  const { data: rules } = useQuery({
    queryKey: ["challenge_rules"],
    queryFn: async () => (await supabase.from("challenge_rules").select("*").order("from_attempt")).data ?? [],
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const from = Math.floor(Number(f.from)), to = Math.floor(Number(f.to)), c = Number(f.c), w = Number(f.w);
    if (!(from >= 2) || !(to >= from) || !(c >= 0) || !(w >= 0)) { toast.error("第几次需 ≥2，且结束 ≥ 开始，分值 ≥0"); return; }
    const { error } = await supabase.from("challenge_rules").insert({ from_attempt: from, to_attempt: to, correct_points: c, wrong_points: w });
    if (error) { toast.error(error.message); return; }
    toast.success("已添加挑战难度");
    qc.invalidateQueries({ queryKey: ["challenge_rules"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("challenge_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["challenge_rules"] });
  }
  return (
    <div className="mt-6 space-y-3 border-t border-border pt-5">
      <Label>多次挑战难度（第一轮使用上面的分值；未设置的挑战次数也使用上面的分值）</Label>
      <form onSubmit={add} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input type="number" min={2} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} placeholder="从第几次" />
        <Input type="number" min={2} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} placeholder="到第几次" />
        <Input type="number" step="0.1" value={f.c} onChange={(e) => setF({ ...f, c: e.target.value })} placeholder="答对加" />
        <Input type="number" step="0.1" value={f.w} onChange={(e) => setF({ ...f, w: e.target.value })} placeholder="答错减" />
        <Button type="submit">添加</Button>
      </form>
      <p className="text-xs text-muted-foreground">依次为：从第几次 · 到第几次 · 答对加 · 答错减（例如 10 到 20 次：+0.1 / −10）</p>
      <div className="space-y-2">
        {(rules ?? []).map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
            <span>
              {r.from_attempt === r.to_attempt ? `第${r.from_attempt}次挑战` : `第${r.from_attempt}–${r.to_attempt}次挑战`}：答对 +{Number(r.correct_points)} · 答错 −{Number(r.wrong_points)}
            </span>
            <Button size="sm" variant="destructive" onClick={() => del(r.id)}>删除</Button>
          </div>
        ))}
        {rules?.length === 0 && <p className="text-sm text-muted-foreground">还没有设置挑战难度</p>}
      </div>
    </div>
  );
}
