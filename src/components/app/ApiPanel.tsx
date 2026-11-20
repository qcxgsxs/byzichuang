import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createApiKey } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useBackground } from "@/lib/backgrounds";

export function ApiPanel() {
  useBackground("adminSettings");
  const qc = useQueryClient();
  const create = useServerFn(createApiKey);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data } = useQuery({
    queryKey: ["api_keys"],
    queryFn: async () => (await supabase.from("api_keys").select("id,name,key_prefix,revoked,created_at").order("created_at")).data ?? [],
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { key } = await create({ data: { name } });
      setNewKey(key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function revoke(id: string) {
    if (!confirm("停用后使用此密钥的APP将无法再访问，确定？")) return;
    await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["api_keys"] });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-display mb-3 text-lg">API 密钥（给其他APP使用葛掉元）</h2>
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="APP名称" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">生成</Button>
        </form>
        {newKey && (
          <div className="mt-3 space-y-1 rounded-md border border-primary p-3 text-sm">
            <div className="text-primary">新密钥只显示这一次，请立即保存：</div>
            <code className="block break-all">{newKey}</code>
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(newKey).then(() => toast.success("已复制"))}>复制</Button>
          </div>
        )}
        <ul className="mt-3 divide-y divide-border">
          {(data ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between py-2 text-sm">
              <span>{k.name} · {k.key_prefix}… {k.revoked && "（已停用）"}</span>
              {!k.revoked && <Button size="sm" variant="destructive" onClick={() => revoke(k.id)}>停用</Button>}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-2 p-5 text-sm">
        <h2 className="font-display text-lg">接口说明</h2>
        <p>请求头带上 <code>X-API-Key: 你的密钥</code></p>
        <p className="font-semibold">查询余额</p>
        <code className="block break-all">GET {origin}/api/public/v1/balance?username=用户名</code>
        <p className="font-semibold">增加/扣除葛掉元（amount 为负数即扣除）</p>
        <code className="block break-all">POST {origin}/api/public/v1/adjust</code>
        <code className="block break-all">{'{"username":"小明","amount":-2,"note":"兑换"}'}</code>
        <p>返回内容包含余额 balance 和折合人民币 cny_value。</p>
      </Card>
    </div>
  );
}
