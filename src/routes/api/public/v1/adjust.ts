import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CORS, authApi, json } from "@/lib/api-auth.server";

const Body = z.object({
  username: z.string().trim().min(1).max(30),
  amount: z.number().finite().refine((n) => n !== 0 && Math.abs(n) <= 1_000_000),
  note: z.string().max(200).optional(),
});

const ERR: Record<string, number> = { user_not_found: 404, account_not_active: 403, insufficient_balance: 409 };

export const Route = createFileRoute("/api/public/v1/adjust")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = await authApi(request);
        if (!auth) return json({ error: "invalid_api_key" }, 401);
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "invalid_body" }, 400);
        const { data, error } = await auth.admin.rpc("api_adjust_balance", {
          _username: parsed.data.username,
          _amount: parsed.data.amount,
          _note: parsed.data.note ?? "",
          _key_id: auth.keyId,
        });
        if (error) {
          const code = Object.keys(ERR).find((k) => error.message.includes(k));
          return json({ error: code ?? "failed" }, code ? ERR[code] : 500);
        }
        const r = data as { username: string; balance: number };
        const balance = Number(r.balance);
        return json({ username: r.username, balance, cny_value: +(balance * auth.rate).toFixed(2) });
      },
    },
  },
});
