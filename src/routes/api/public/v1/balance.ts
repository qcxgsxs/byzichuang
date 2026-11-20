import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CORS, authApi, json } from "@/lib/api-auth.server";

export const Route = createFileRoute("/api/public/v1/balance")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const auth = await authApi(request);
        if (!auth) return json({ error: "invalid_api_key" }, 401);
        const parsed = z.string().trim().min(1).max(30).safeParse(new URL(request.url).searchParams.get("username"));
        if (!parsed.success) return json({ error: "invalid_username" }, 400);
        const { data } = await auth.admin
          .from("profiles")
          .select("username,balance,status")
          .ilike("username", parsed.data)
          .maybeSingle();
        if (!data) return json({ error: "user_not_found" }, 404);
        const balance = Number(data.balance);
        return json({ username: data.username, balance, status: data.status, cny_rate: auth.rate, cny_value: +(balance * auth.rate).toFixed(2) });
      },
    },
  },
});
