import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useBackground } from "@/lib/backgrounds";

type Rule = { from_attempt: number; to_attempt: number; correct_points: number; wrong_points: number; created_at: string };

export function pointsFor(
  attempt: number,
  base: { correct: number; wrong: number },
  rules: Rule[],
) {
  if (attempt >= 2) {
    const r = rules
      .filter((x) => attempt >= x.from_attempt && attempt <= x.to_attempt)
      .sort((a, b) => b.from_attempt - a.from_attempt || b.created_at.localeCompare(a.created_at))[0];
    if (r) return { correct: Number(r.correct_points), wrong: Number(r.wrong_points) };
  }
  return base;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!; a[i] = a[j]!; a[j] = t;
  }
  return a;
}

export function QuizPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [startedRound, setStartedRound] = useState(1);
  const { data } = useQuery({
    queryKey: ["quiz", userId],
    queryFn: async () => {
      const [{ data: settings }, { data: questions }, { data: logs }, { data: rules }] = await Promise.all([
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("questions").select("id,prompt,created_at").order("created_at"),
        supabase.from("answer_logs").select("question_id").eq("user_id", userId),
        supabase.from("challenge_rules").select("*"),
      ]);
      const counts = new Map<string, number>();
      for (const l of logs ?? []) counts.set(l.question_id, (counts.get(l.question_id) ?? 0) + 1);
      return { settings, questions: questions ?? [], counts, rules: (rules ?? []) as Rule[] };
    },
  });

  const info = useMemo(() => {
    if (!data || data.questions.length === 0) return null;
    const cs = data.questions.map((q) => data.counts.get(q.id) ?? 0);
    const min = Math.min(...cs);
    const max = Math.max(...cs);
    const pending = data.questions.filter((q) => (data.counts.get(q.id) ?? 0) === min);
    return { min, roundDone: min >= 1 && min === max, pending };
  }, [data]);

  const pendingKey = info?.pending.map((q) => q.id).sort().join(",") ?? "";
  const order = useMemo(() => shuffle(info?.pending ?? []), [pendingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const gated = !!info && info.roundDone && startedRound !== info.min + 1;
  const current = gated ? undefined : order[0];
  useBackground(data && !current ? "quizDone" : "quiz");
  if (!data) return null;

  const base = { correct: Number(data.settings?.correct_points ?? 1), wrong: Number(data.settings?.wrong_points ?? 0.5) };
  const attempt = info ? info.min + 1 : 1;
  const pts = pointsFor(attempt, base, data.rules);
  const roundLabel = attempt === 1 ? "第一轮" : `第${attempt}次挑战`;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        {roundLabel} · 答对 +{pts.correct} 葛掉元 · 答错 −{pts.wrong} 葛掉元 · 本轮剩余 {gated ? 0 : order.length}/{data.questions.length}
      </p>
      {current ? (
        <QuestionCard
          key={current.id + attempt}
          question={current}
          pool={order}
          mode={data.settings?.quiz_mode ?? "input"}
          showCreator={!!data.settings?.show_creator}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["quiz", userId] });
            qc.invalidateQueries({ queryKey: ["me", userId] });
          }}
        />
      ) : info ? (
        <Card className="space-y-4 p-8 text-center">
          <p>🎉 已完成{info.min === 1 ? "第一轮" : `第${info.min}次挑战`}！</p>
          <p className="text-sm text-muted-foreground">
            第{info.min + 1}次挑战：答对 +{pts.correct} 葛掉元 · 答错 −{pts.wrong} 葛掉元
          </p>
          <Button onClick={() => setStartedRound(info.min + 1)}>开始第{info.min + 1}次挑战</Button>
        </Card>
      ) : (
        <Card className="p-8 text-center text-muted-foreground">暂时没有题目啦，等创语账号出新题吧 ✨</Card>
      )}
    </div>
  );
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function QuestionCard({
  question,
  pool,
  mode,
  showCreator,
  onDone,
}: {
  showCreator: boolean;
  question: { id: string; prompt: string };
  pool: { prompt: string }[];
  mode: string;
  onDone: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState<string | null>(pool.length > 1 ? pool[0]!.prompt : null);

  useEffect(() => {
    if (pool.length <= 1) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRolling(pool[Math.floor(Math.random() * pool.length)]!.prompt);
      if (i >= 10) { clearInterval(t); setRolling(null); }
    }, 70);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: choices } = useQuery({
    queryKey: ["choices", question.id],
    enabled: mode === "choice",
    queryFn: async () => {
      const { data } = await supabase.rpc("get_choices", { _question_id: question.id });
      return (data as string[]) ?? [];
    },
  });

  const { data: creator } = useQuery({
    queryKey: ["creator", question.id],
    enabled: showCreator,
    queryFn: async () => (await supabase.rpc("question_creator", { _question_id: question.id })).data as string | null,
  });

  async function submit(value: string) {
    if (!value.trim()) { toast.error("请填写答案"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_answer", { _question_id: question.id, _answer: value });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { correct: boolean; delta: number };
    if (r.correct) toast.success(`答对了！+${r.delta} 葛掉元`);
    else toast.error(`答错了 ${r.delta} 葛掉元`);
    onDone();
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex justify-between text-xs text-muted-foreground"><span>请翻译</span>{showCreator && creator && <span>出题：{creator}</span>}</div>
      <div className="font-display text-rainbow text-center text-3xl break-words">{rolling ?? question.prompt}</div>
      {mode === "choice" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(choices ?? []).map((c, i) => (
            <Button key={c} variant="secondary" disabled={busy || !!rolling} onClick={() => submit(c)} className="h-auto justify-start py-3 text-left whitespace-normal">
              <span className="mr-2 font-bold">{LETTERS[i]}.</span>{c}
            </Button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit(answer); }} className="flex gap-2">
          <Input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="输入翻译" />
          <Button type="submit" disabled={busy || !!rolling}>提交</Button>
        </form>
      )}
    </Card>
  );
}
