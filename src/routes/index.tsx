import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/app/AuthScreen";
import { Dashboard } from "@/components/app/Dashboard";
import { BACKGROUNDS, useCurrentBg } from "@/lib/backgrounds";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "七彩星光自创语言 · 答题赚葛掉元" },
      { name: "description", content: "七彩星光自创语言：答创语题目，答对赚葛掉元。" },
      { property: "og:title", content: "七彩星光自创语言" },
      { property: "og:description", content: "答创语题目，答对赚葛掉元。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const bg = useCurrentBg();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="relative min-h-screen">
      {Object.entries(BACKGROUNDS).map(([k, url]) => (
        <img
          key={k}
          src={url}
          alt=""
          className={`pointer-events-none fixed inset-0 h-full w-full object-cover transition-opacity duration-700 ${bg === k ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="font-display text-rainbow text-4xl sm:text-5xl">七彩星光自创语言</h1>
          <div className="bg-rainbow mx-auto mt-3 h-1 w-40 rounded-full" />
        </header>
        {!ready ? null : session ? (
          <Dashboard userId={session.user.id} />
        ) : (
          <AuthScreen />
        )}
      </div>
    </div>
  );
}
