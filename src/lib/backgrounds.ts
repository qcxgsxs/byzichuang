import { useEffect, useSyncExternalStore } from "react";
import b1 from "@/assets/bg/bg1.jpg.asset.json";
import b2 from "@/assets/bg/bg2.jpg.asset.json";
import b3 from "@/assets/bg/bg3.jpg.asset.json";
import b4 from "@/assets/bg/bg4.jpg.asset.json";
import b5 from "@/assets/bg/bg5.jpg.asset.json";
import b6 from "@/assets/bg/bg6.jpg.asset.json";
import b7 from "@/assets/bg/bg7.jpg.asset.json";
import b8 from "@/assets/bg/bg8.jpg.asset.json";
import b9 from "@/assets/bg/bg9.jpg.asset.json";
import b10 from "@/assets/bg/bg10.jpg.asset.json";

// One photo per screen/menu.
export const BACKGROUNDS = {
  login: b1.url,
  register: b2.url,
  quiz: b3.url,
  quizDone: b4.url,
  creator: b5.url,
  adminAccounts: b6.url,
  adminQuestions: b7.url,
  adminSettings: b8.url,
  frozen: b9.url,
  banned: b10.url,
} as const;
export type BgKey = keyof typeof BACKGROUNDS;

let current: BgKey = "login";
const listeners = new Set<() => void>();
function set(k: BgKey) {
  current = k;
  listeners.forEach((l) => l());
}
export function useCurrentBg() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => current,
  );
}
export function useBackground(k: BgKey) {
  useEffect(() => set(k), [k]);
}
