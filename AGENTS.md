<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accounts log in by username; usernames map to synthetic emails via src/lib/account.ts (auto-confirm on) — users never enter emails.
- Answers live in question_answers (hidden from normal users); scoring only via the submit_answer DB function so balances cannot be forged.
- External apps use 葛掉元 via /api/public/v1/* with admin-issued API keys (stored as SHA-256 hashes); balance changes go through api_adjust_balance (service role only).
- Two backend rows are load-bearing and must survive any schema reset or remix: the `on_auth_user_created` trigger on auth.users (runs public.handle_new_user, which creates the profile and role — without it a signup is a dead account) and the single `settings` row with id = 1 (submit_answer and the 设置 tab read it; without it scoring breaks and saving settings silently does nothing).
