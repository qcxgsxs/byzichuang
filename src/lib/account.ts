// Usernames (may be Chinese) are mapped to a deterministic, email-safe address for auth.
export function usernameToEmail(username: string): string {
  const norm = username.trim().toLowerCase();
  const bytes = new TextEncoder().encode(norm);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `u${hex}@qicai.app`;
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  creator: "创语账号",
  user: "普通账号",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "正常",
  frozen: "已冻结",
  banned: "已封控",
};
