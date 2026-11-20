import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_ICON = "/favicon.ico";

export function Favicon() {
  const { data } = useQuery({
    queryKey: ["favicon"],
    queryFn: async () =>
      ((await supabase.rpc("get_favicon")).data as string | null),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data === undefined) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = data || DEFAULT_ICON;
    link.type = data ? "image/png" : "image/x-icon";
  }, [data]);

  return null;
}
