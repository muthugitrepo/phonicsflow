"use client";

import * as React from "react";
import type { Profile } from "@/lib/types";

const SessionContext = React.createContext<Profile | null>(null);

export function SessionProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>;
}

export function useSession(): Profile {
  const profile = React.useContext(SessionContext);
  if (!profile) throw new Error("useSession must be used inside <SessionProvider>");
  return profile;
}

/** The Head — sees and administers the whole academy. */
export function useIsTeamHead() {
  return useSession().role === "team_head";
}
