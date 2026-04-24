"use client";

import { useEffect, useState } from "react";

import type { ProviderStatus } from "@/lib/types";

export function ProviderStatusPill() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/provider-status");
        const payload = (await response.json()) as { providers: ProviderStatus[] };
        if (active && response.ok) {
          setProviders(payload.providers);
        }
      } catch {
        if (active) {
          setProviders([]);
        }
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const selected = providers.find((provider) => provider.selected) ?? providers[0];
  if (!selected) {
    return null;
  }
  const activeTool =
    selected.id === "auto"
      ? providers.find((provider) => provider.id === "codex" && provider.available) ??
        providers.find((provider) => provider.id === "claude" && provider.available)
      : selected;
  const providerName = activeTool?.label ?? selected.label;

  return (
    <div className={`provider-pill ${selected.available ? "provider-pill-ready" : "provider-pill-missing"}`}>
      <span className="provider-pill-dot" />
      <span className="provider-pill-main">
        {selected.available ? selected.label : "Provider setup needed"}
        {selected.available ? <small>({providerName})</small> : null}
      </span>
      <span className="provider-pill-state">{selected.available ? "Ready" : selected.detail}</span>
    </div>
  );
}
