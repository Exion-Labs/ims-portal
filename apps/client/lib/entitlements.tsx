"use client";

import React, { createContext, useContext } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { apiFetch, MeResponse } from "@ims/api-client";
import { NotInPlan } from "@ims/ui";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
    },
  },
});

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const EntitlementContext = createContext<{
  me: MeResponse | null;
  isLoading: boolean;
  refetch: () => void;
}>({
  me: null,
  isLoading: true,
  refetch: () => {},
});

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/api/v1/me"),
  });

  return (
    <EntitlementContext.Provider value={{ me: data ?? null, isLoading, refetch }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements() {
  const ctx = useContext(EntitlementContext);
  const enabledFeatures = new Set(ctx.me?.enabledFeatures ?? []);
  const permissions = new Set(ctx.me?.permissions ?? []);

  return {
    ...ctx,
    hasFeature: (featureKey: string) => enabledFeatures.has(featureKey),
    hasPermission: (perm: string) => permissions.has(perm),
  };
}

export function FeatureGate({
  feature,
  fallback = "hide",
  children,
}: {
  feature: string;
  fallback?: "hide" | "not-in-plan";
  children: React.ReactNode;
}) {
  const { me, isLoading, hasFeature } = useEntitlements();
  if (isLoading) return null;
  if (!hasFeature(feature)) {
    if (fallback === "not-in-plan") {
      return <NotInPlan featureKey={feature} planName={me?.planName} />;
    }
    return null;
  }
  return <>{children}</>;
}
