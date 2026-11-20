import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useBackground } from "@/lib/backgrounds";

// Used by creators (own questions) and admins (all questions, all translations visible).
export function CreatorPanel({ userId, showAll = false }: { userId: string; showAll?: boolean }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const key = ["questions", userId, showAll];
  useBackground(showAll ? "adminQuestions" : "creator");

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase.from("questions").select("id,prompt,created_by,created_at").order("created_at", { ascending: false });
      if (!showAll) q = q.eq("created_by", userId);
      const [{ data: questions }, { data: answers }, { data: profiles }] = await Promise.all([
        q,
        supabase.from("question_answers").select("question_id,answer"),
        showAll ? supabase.from("profiles").select("id,username") : Promise.resolve({ data: [] as { id: string; username: string }[] }),
      ]);
      const amap = new Map((answers ?? []).map((a) => [a.question_id, a.answer]));
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p.username]));
      return (questions ?? []).map((x) => ({ ...x, answer: amap.get(x.id) ?? "", author: pmap.get(x.created_by) }));
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || !answer.trim()) { toast.error("题目和答案都要填写"); return; }
    const { data: q, error } = await supabase
      .from("questions")
      .insert({ prompt: prompt.trim(), created_by: userId })
      .select("id")
      .single();
    if (error || !q) { toast.error(error?.message ?? "添加失败"); return; }
    const { error: e2 } = await supabase.from("question_answers").insert({ question_id: q.id, answer: answer.trim() });
    if (e2) {
      await supabase.from("questions").delete().eq("id", q.id);
      { toast.error(e2.message); return; }
    }
    setPrompt("");
    setAnswer("");
    toast.success("题目已添加");
    qc.invalidateQueries({ queryKey: key });
  }

  async function remove(id: string) {
    if (!confirm("确定删除这道题？")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-display mb-3 text-lg">写入新题目</h2>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>自创语言（题目）</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>翻译（答案）</Label>
            <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </div>
          <Button type="submit">添加</Button>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="font-display mb-3 text-lg">{showAll ? "全部自创语言翻译" : "我的题目"}（{data?.length ?? 0}）</h2>
        <ul className="divide-y divide-border">
          {(data ?? []).map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-primary break-words">{q.prompt}</div>
                <div className="text-sm break-words">→ {q.answer}</div>
                {showAll && <div className="text-xs text-muted-foreground">出题：{q.author ?? "已删除账号"}</div>}
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(q.id)}>
                删除
              </Button>
            </li>
          ))}
          {data?.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">还没有题目</li>}
        </ul>
      </Card>
    </div>
  );
}
