"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ArticleListRow } from "@/components/article-list-row";
import { SignalTubeNav } from "@/components/signaltube-nav";
import type { AnalysisProviderId, CustomRole, MemoListItem, MemoPresentationMode, ProviderStatus, RoleLensId, SourceType } from "@/lib/types";

type HomeProps = {
  recentMemos: MemoListItem[];
};

type ScreenState = "home" | "processing";

type PreviewState = {
  title: string;
  channelName: string;
  thumbnailUrl: string;
  sourceType?: SourceType;
};

const SOURCE_OPTIONS: Array<{ value: SourceType; label: string; icon: ReactNode }> = [
  { value: "youtube", label: "YouTube", icon: <YouTubeIcon /> },
  { value: "medium", label: "Medium", icon: <MediumIcon /> },
  { value: "substack", label: "Substack", icon: <SubstackIcon /> }
];

const OUTPUT_MODE_OPTIONS: Array<{ value: MemoPresentationMode; label: string; icon: ReactNode }> = [
  { value: "short", label: "Article · Short Dive", icon: <ArticleIcon /> },
  { value: "deep", label: "Article · Deep Dive", icon: <DeepDiveIcon /> },
  { value: "presentation", label: "Presentation", icon: <SlidesIcon /> }
];

const ROLE_OPTIONS: Array<{ value: RoleLensId; label: string; icon?: ReactNode }> = [
  { value: "hai", label: "HAI Designer" },
  { value: "ux", label: "UX Designer" },
  { value: "dev", label: "Developer" },
  { value: "kid", label: "I'm a kid" }
];
const HIDDEN_ROLE_LABELS = new Set([
  "company design head",
  "day trader",
  "philosopher",
  "design head for a design agency company"
]);

const OTHER_ROLE_VALUE = "other";
const CUSTOM_ROLES_KEY = "st_custom_roles";
const LAST_ROLE_KEY = "st_last_role_lens";

const SETUP_STEPS: Record<Exclude<AnalysisProviderId, "auto" | "heuristic">, { installTitle: string; installCommand: string; startTitle: string; startCommand: string }> = {
  claude: {
    installTitle: "Install Claude",
    installCommand: "npm install -g @anthropic-ai/claude-code",
    startTitle: "Start Claude",
    startCommand: "claude"
  },
  codex: {
    installTitle: "Install Codex",
    installCommand: "npm install -g @openai/codex",
    startTitle: "Start Codex",
    startCommand: "codex"
  },
  gemini: {
    installTitle: "Install Gemini",
    installCommand: "npm install -g @google/gemini-cli",
    startTitle: "Start Gemini",
    startCommand: "gemini"
  }
};

const COMPLETION_SOUND_URL = "/assets/notification-complete.wav";

export function SignalTubeHome({ recentMemos }: HomeProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [presentationMode, setPresentationMode] = useState<MemoPresentationMode>("short");
  const [sourceType, setSourceType] = useState<SourceType>("youtube");
  const [roleLens, setRoleLens] = useState<RoleLensId>("hai");
  const [provider, setProvider] = useState<AnalysisProviderId>("auto");
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [screen, setScreen] = useState<ScreenState>("home");
  const [processingUrl, setProcessingUrl] = useState("");
  const [processingSourceType, setProcessingSourceType] = useState<SourceType>("youtube");
  const [processingPresentationMode, setProcessingPresentationMode] = useState<MemoPresentationMode>("short");
  const [processingRoleLens, setProcessingRoleLens] = useState<RoleLensId>("hai");
  const [processingRoleName, setProcessingRoleName] = useState<string | undefined>();
  const [processingRoleDetails, setProcessingRoleDetails] = useState<string | undefined>();
  const [processingProvider, setProcessingProvider] = useState<AnalysisProviderId>("auto");
  const [resultId, setResultId] = useState<string | null>(null);
  const [processingFailed, setProcessingFailed] = useState<string | null>(null);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      try {
        const response = await fetch("/api/provider-status");
        const payload = (await response.json()) as { providers: ProviderStatus[] };
        if (!active || !response.ok) {
          return;
        }
        setProviders(payload.providers);
        const available = payload.providers.filter((item) => item.available && item.id !== "auto" && item.id !== "heuristic");
        const preferred = available.find((item) => item.id === "claude") ?? available[0];
        if (preferred) {
          setProvider(preferred.id);
        }
      } catch {
        if (active) {
          setProviders([]);
        }
      }
    }
    void loadProviders();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setShowOnboarding(window.localStorage.getItem("st_onboarding_seen") !== "1");
  }, []);

  useEffect(() => {
    const loadedRoles = readCustomRoles();
    setCustomRoles(loadedRoles);
    const lastRole = window.localStorage.getItem(LAST_ROLE_KEY) as RoleLensId | null;
    if (lastRole && isAvailableRole(lastRole, loadedRoles) && !isHiddenRole(lastRole, loadedRoles)) {
      setRoleLens(lastRole);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LAST_ROLE_KEY, roleLens);
  }, [roleLens]);

  const roleOptions = useMemo(
    () => [
      ...ROLE_OPTIONS,
      ...customRoles
        .filter((role) => !HIDDEN_ROLE_LABELS.has(role.name.trim().toLowerCase()))
        .map((role) => ({ value: role.id as RoleLensId, label: role.name })),
      { value: OTHER_ROLE_VALUE, label: "Other" }
    ],
    [customRoles]
  );

  useEffect(() => {
    if (screen !== "processing" || !resultId) {
      return;
    }

    const elapsed = processingStartedAt ? Date.now() - processingStartedAt : 0;
    const remaining = Math.max(0, 5600 - elapsed);
    const timer = window.setTimeout(() => {
      startTransition(() => router.push(destinationForMode(resultId, processingPresentationMode)));
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [processingPresentationMode, processingStartedAt, resultId, router, screen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError("Paste a link to get started.");
      return;
    }

    if (sourceType === "youtube" && !isValidYouTubeUrl(trimmed)) {
      setError("That doesn't look like a YouTube URL. Try again.");
      return;
    }
    if (sourceType !== "youtube" && !isValidUrl(trimmed)) {
      const sourceName = sourceType === "medium" ? "Medium" : sourceType === "substack" ? "Substack" : "blog article";
      setError(`That doesn't look like a ${sourceName} URL. Try again.`);
      return;
    }

    setError("");
    setProcessingUrl(trimmed);
    setProcessingSourceType(sourceType);
    setProcessingPresentationMode(presentationMode);
    setProcessingRoleLens(roleLens);
    setProcessingRoleName(roleNameForLens(roleLens, customRoles));
    setProcessingRoleDetails(roleDetailsForLens(roleLens, customRoles));
    setProcessingProvider(provider);
    setProcessingFailed(null);
    setResultId(null);
    setProcessingStartedAt(Date.now());
    setScreen("processing");

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          sourceType,
          presentationMode,
          roleLens,
          roleName: roleNameForLens(roleLens, customRoles),
          roleDetails: roleDetailsForLens(roleLens, customRoles),
          provider
        })
      });
      const payload = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "We could not process this video.");
      }

      setResultId(payload.id);
    } catch (caught) {
      setProcessingFailed(
        caught instanceof Error ? caught.message : "We could not process this video."
      );
    }
  }

  if (screen === "processing") {
    return (
      <div className="page-shell">
        <SignalTubeNav />
        <ProcessingScreen
          url={processingUrl}
          sourceType={processingSourceType}
          presentationMode={processingPresentationMode}
          roleLens={processingRoleLens}
          roleName={processingRoleName}
          provider={processingProvider}
          onExit={() => {
            setScreen("home");
            setProcessingFailed(null);
          }}
          failedMessage={processingFailed}
          done={Boolean(resultId)}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <SignalTubeNav active="home" />
      <main style={{ paddingTop: 56 }}>
        <div
          className="home-landing"
        >
          <div className="home-copy-block">
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 22
              }}
            >
              Reading-first intelligence
            </p>

            <h1 className="hero-title-single-line">
              <span className="hero-title-line">Paste a link.</span>
              <span className="hero-title-line">
                Get the <span className="hero-signal-chip">signal</span>, not the noise.
              </span>
            </h1>

            <p className="hero-subtitle-single-line">
              Turn long-form content into a role-aware article or presentation that helps you understand what matters faster.
            </p>
          </div>

          <div className="home-input-block">
            <form onSubmit={handleSubmit} className={`home-control-card ${focused ? "home-control-card-focused" : ""} ${error ? "home-control-card-error" : ""}`}>
              <div className="home-control-url-row">
                <input
                  type="text"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError("");
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Paste a YouTube, Medium, or Substack link"
                  aria-label="Source URL"
                  className="home-control-input"
                />
                <button type="submit" className="home-control-submit">
                  Generate
                  <ArrowRightIcon />
                </button>
              </div>
              <div className="home-control-options-row">
                <div className="home-control-dropdowns">
                  <InlineDropdown value={sourceType} onChange={(nextSource) => setSourceType(nextSource as SourceType)} options={SOURCE_OPTIONS} />
                  <span className="home-control-divider" />
                  <InlineDropdown
                    value={roleLens}
                    onChange={(nextRole) => {
                      if (nextRole === OTHER_ROLE_VALUE) {
                        setShowCustomRoleModal(true);
                        return;
                      }
                      setRoleLens(nextRole as RoleLensId);
                    }}
                    options={roleOptions}
                  />
                </div>
                <InlineDropdown
                  value={presentationMode}
                  onChange={(nextMode) => setPresentationMode(nextMode as MemoPresentationMode)}
                  options={OUTPUT_MODE_OPTIONS}
                />
              </div>
            </form>

            <ProviderBar providers={providers} value={provider} onChange={setProvider} />

            {error ? (
              <p
                style={{
                  margin: "10px auto 0",
                  color: "#B91C1C",
                  fontSize: 12.5,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 400,
                  textAlign: "left",
                  maxWidth: 720
                }}
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="home-mockup-block">
            <TransformationHero />
          </div>
        </div>

        {recentMemos.length > 0 ? (
          <section
            className="home-recent-section"
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                margin: "0 0 12px",
                paddingBottom: 12,
                borderBottom: "1px solid var(--rule)"
              }}
            >
              Recent
            </p>
            {recentMemos.slice(0, 3).map((memo, index) => (
              <ArticleListRow
                key={memo.id}
                memo={memo}
                style={{
                  animation: "fadeUp 0.4s ease both",
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: "both"
                }}
              />
            ))}
          </section>
        ) : null}
      </main>
      {showOnboarding ? (
        <OnboardingPopup
          providers={providers}
          selectedProvider={provider}
          onProviderSelect={setProvider}
          onClose={() => {
            window.localStorage.setItem("st_onboarding_seen", "1");
            setShowOnboarding(false);
          }}
        />
      ) : null}
      {showCustomRoleModal ? (
        <CustomRoleModal
          provider={provider}
          onCancel={() => setShowCustomRoleModal(false)}
          onAdd={(role) => {
            const nextRoles = [...customRoles, role];
            setCustomRoles(nextRoles);
            writeCustomRoles(nextRoles);
            setRoleLens(role.id as RoleLensId);
            window.localStorage.setItem(LAST_ROLE_KEY, role.id);
            setShowCustomRoleModal(false);
          }}
        />
      ) : null}
    </div>
  );
}

function InlineDropdown({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const longestLabel = options.reduce((longest, option) => Math.max(longest, option.label.length), 0);
      const width = Math.max(rect.width, 220, longestLabel * 9 + 76);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left,
        width,
        zIndex: 2147483000
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  return (
    <div className="inline-picker" ref={rootRef}>
      <button
        type="button"
        className={`inline-picker-trigger ${open ? "inline-picker-trigger-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.icon ? <span className="inline-picker-icon">{selected.icon}</span> : null}
        <span>{selected.label}</span>
        <span className="inline-picker-chevron">
          <ChevronDownIcon />
        </span>
      </button>
      {open && menuStyle
        ? createPortal(
            <div className="inline-picker-menu" style={menuStyle} role="listbox" ref={menuRef}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={option.value === value ? "inline-picker-option-active" : ""}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="inline-picker-icon" aria-hidden={!option.icon}>
                    {option.icon ?? null}
                  </span>
                  <span>{option.label}</span>
                  <span className="inline-picker-check">{option.value === value ? <CheckIcon /> : ""}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function ProviderBar({
  providers,
  value,
  onChange
}: {
  providers: ProviderStatus[];
  value: AnalysisProviderId;
  onChange: (provider: AnalysisProviderId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const available = providers.filter((item) => item.available && item.id !== "auto" && item.id !== "heuristic");
  const active = available.find((item) => item.id === value) ?? available.find((item) => item.id === "claude") ?? available[0];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 176;
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left,
        width,
        zIndex: 2147483000,
        transform: "none"
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  if (!active) {
    return (
      <div className="provider-bar">
        <span className="provider-bar-dot provider-bar-dot-missing" />
        <span>Set up Claude or Codex to generate memos locally.</span>
      </div>
    );
  }

  return (
    <div className="provider-bar" ref={rootRef}>
      <span className="provider-bar-dot" />
      <span>Working with</span>
      {available.length > 1 ? (
        <button type="button" className="provider-bar-button" onClick={() => setOpen((current) => !current)}>
          <ProviderLogo providerId={providerIconId(active.id)} />
          {shortProviderName(active.label)}
          <ChevronDownIcon />
        </button>
      ) : (
        <strong className="provider-bar-single">
          <ProviderLogo providerId={providerIconId(active.id)} />
          {shortProviderName(active.label)}
        </strong>
      )}
      {open && menuStyle
        ? createPortal(
            <div className="provider-bar-menu" style={menuStyle} ref={menuRef}>
              {available.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={provider.id === active.id ? "provider-bar-menu-active" : ""}
                  onClick={() => {
                    onChange(provider.id);
                    setOpen(false);
                  }}
                >
                  <ProviderLogo providerId={providerIconId(provider.id)} />
                  {shortProviderName(provider.label)}
                  <span>{provider.id === active.id ? <CheckIcon /> : ""}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function shortProviderName(label: string) {
  return label.replace(/\s+CLI$/i, "");
}

function providerIconId(providerId: AnalysisProviderId): Exclude<AnalysisProviderId, "auto" | "heuristic"> {
  if (providerId === "claude" || providerId === "codex" || providerId === "gemini") {
    return providerId;
  }

  return "codex";
}

function readCustomRoles(): CustomRole[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CUSTOM_ROLES_KEY) ?? "[]") as CustomRole[];
    const roles = Array.isArray(parsed)
      ? parsed.filter(
          (role) =>
            role.id?.startsWith("custom:") &&
            role.name &&
            role.dayToDay &&
            role.decisions &&
            role.perspective &&
            !HIDDEN_ROLE_LABELS.has(role.name.trim().toLowerCase())
        )
      : [];

    if (Array.isArray(parsed) && roles.length !== parsed.length) {
      writeCustomRoles(roles);
    }

    return roles;
  } catch {
    return [];
  }
}

function writeCustomRoles(roles: CustomRole[]) {
  window.localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
}

function destinationForMode(memoId: string, mode: MemoPresentationMode) {
  if (mode === "presentation") return `/memos/${memoId}/slides`;
  if (mode === "deep") return `/memos/${memoId}/deep`;
  return `/memos/${memoId}`;
}

function isAvailableRole(roleLens: RoleLensId, customRoles: CustomRole[]) {
  if (roleLens === "hai" || roleLens === "ux" || roleLens === "dev" || roleLens === "kid") {
    return true;
  }

  return customRoles.some((role) => role.id === roleLens);
}

function isHiddenRole(roleLens: RoleLensId, customRoles: CustomRole[]) {
  const role = customRoles.find((item) => item.id === roleLens);
  return role ? HIDDEN_ROLE_LABELS.has(role.name.trim().toLowerCase()) : false;
}

function roleNameForLens(roleLens: RoleLensId, customRoles: CustomRole[]) {
  const predefined = ROLE_OPTIONS.find((option) => option.value === roleLens)?.label;
  return predefined ?? customRoles.find((role) => role.id === roleLens)?.name;
}

function roleDetailsForLens(roleLens: RoleLensId, customRoles: CustomRole[]) {
  const role = customRoles.find((item) => item.id === roleLens);
  if (!role) {
    return undefined;
  }

  return [
    `Day-to-day role: ${role.dayToDay}`,
    `Important decisions or outcomes: ${role.decisions}`,
    `Interpretation lens: ${role.perspective}`,
    role.extra ? `Additional context: ${role.extra}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function OnboardingPopup({
  providers,
  selectedProvider,
  onProviderSelect,
  onClose
}: {
  providers: ProviderStatus[];
  selectedProvider: AnalysisProviderId;
  onProviderSelect: (provider: AnalysisProviderId) => void;
  onClose: () => void;
}) {
  const available = providers.filter((item) => item.available && item.id !== "auto" && item.id !== "heuristic");
  const [setupTab, setSetupTab] = useState<Exclude<AnalysisProviderId, "auto" | "heuristic">>("codex");
  const [showAccessNote, setShowAccessNote] = useState(false);
  const activeProvider = available.find((item) => item.id === selectedProvider) ?? available.find((item) => item.id === "claude") ?? available[0];

  const chooseAndClose = (providerId?: AnalysisProviderId) => {
    if (providerId && providerId !== "heuristic") {
      onProviderSelect(providerId);
    }
    onClose();
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <p className="onboarding-kicker">SignalTube</p>
        <h2 id="onboarding-title">{available.length ? "Welcome." : "Get set up in minutes."}</h2>
        <p className="onboarding-copy">
          SignalTube turns YouTube, Medium, and Substack links into structured articles and presentations using a local AI provider on your Mac.
        </p>

        {available.length ? (
          <>
            <p className="onboarding-section-label">Choose provider</p>
            <div className="onboarding-provider-grid">
              {(["claude", "codex", "gemini"] as const).map((providerId) => {
                const status = providers.find((item) => item.id === providerId);
                const isAvailable = Boolean(status?.available);
                const isSelected = activeProvider?.id === providerId;
                return (
                  <button
                    type="button"
                    key={providerId}
                    className={`onboarding-provider-card ${isSelected ? "onboarding-provider-card-active" : ""}`}
                    disabled={!isAvailable}
                    onClick={() => onProviderSelect(providerId)}
                  >
                    <span className={`onboarding-provider-logo onboarding-provider-logo-${providerId}`}>
                      <ProviderLogo providerId={providerId} />
                    </span>
                    <strong>{providerName(providerId)}</strong>
                    <span>
                      <i className={isAvailable ? "provider-ready-dot" : "provider-missing-dot"} />
                      {isAvailable ? "Active" : "Not found"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="onboarding-primary" onClick={() => chooseAndClose(activeProvider?.id)}>
              Get started <ArrowRightIcon />
            </button>
          </>
        ) : showAccessNote ? (
          <div className="onboarding-access-note">
            <p>A compatible subscription or signed-in account may be required.</p>
            <span>Claude, Codex, or Gemini can work here once their local CLI is installed and authenticated on this Mac.</span>
            <button type="button" onClick={() => setShowAccessNote(false)}>
              Back to setup
            </button>
          </div>
        ) : (
          <>
            <div className="onboarding-tabs" role="tablist" aria-label="Provider setup">
              {(["claude", "codex", "gemini"] as const).map((providerId) => (
                <button
                  key={providerId}
                  type="button"
                  role="tab"
                  className={setupTab === providerId ? "onboarding-tab-active" : ""}
                  onClick={() => setSetupTab(providerId)}
                >
                  <ProviderLogo providerId={providerId} />
                  {providerName(providerId)}
                </button>
              ))}
            </div>
            <ProviderSetupGuide providerId={setupTab} />
            <div className="onboarding-actions">
              <button type="button" className="onboarding-primary" onClick={() => chooseAndClose("auto")}>
                Continue <ArrowRightIcon />
              </button>
              <button type="button" className="onboarding-secondary" onClick={() => setShowAccessNote(true)}>
                I don't have access
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TerminalBlock({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState(false);
  async function copyCommands() {
    try {
      await navigator.clipboard.writeText(commands.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="terminal-block">
      <div>
        {commands.map((command, index) => (
          <code key={command}>
            {index > 0 ? <span className="terminal-or">or</span> : null}
            {command}
          </code>
        ))}
      </div>
      <button type="button" onClick={copyCommands} aria-label="Copy setup commands">
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ProviderSetupGuide({ providerId }: { providerId: Exclude<AnalysisProviderId, "auto" | "heuristic"> }) {
  const guide = SETUP_STEPS[providerId];

  return (
    <div className="onboarding-setup-steps">
      <div className="onboarding-setup-heading">
        <span className={`onboarding-provider-logo onboarding-provider-logo-${providerId}`}>
          <ProviderLogo providerId={providerId} />
        </span>
        <strong>{providerName(providerId)}</strong>
      </div>
      <div className="onboarding-setup-step">
        <span>STEP 1 / 2</span>
        <div>
          <h3>{guide.installTitle}</h3>
          <TerminalBlock commands={[guide.installCommand]} />
        </div>
      </div>
      <div className="onboarding-setup-step">
        <span>STEP 2 / 2</span>
        <div>
          <h3>{guide.startTitle}</h3>
          <TerminalBlock commands={[guide.startCommand]} />
        </div>
      </div>
    </div>
  );
}

type RolePlaceholderSet = {
  key: string;
  dayToDay: string;
  dayToDayHelper: string;
  decisions: string;
  decisionsHelper: string;
  perspective: string;
  perspectiveHelper: string;
  extra: string;
  extraHelper: string;
};

const GENERIC_ROLE_PLACEHOLDERS: RolePlaceholderSet = {
  key: "generic",
  dayToDay: "e.g. I review research, design workflows, write briefs, or explain technical ideas to clients",
  dayToDayHelper: "This helps SignalTube understand your day-to-day context.",
  decisions: "e.g. shipping faster, improving trust, making better product decisions, or reducing errors",
  decisionsHelper: "This helps SignalTube focus on what is most relevant to your work.",
  perspective: "e.g. focus on product implications, simplify jargon, or surface business signals",
  perspectiveHelper: "This shapes how the content is explained and what gets emphasized.",
  extra: "e.g. I work in healthcare, I am new to AI, or I need outputs I can quickly share with my team",
  extraHelper: "Optional, but useful if you want more tailored output."
};

function CustomRoleModal({
  onAdd,
  onCancel,
  provider
}: {
  onAdd: (role: CustomRole) => void;
  onCancel: () => void;
  provider: AnalysisProviderId;
}) {
  const [name, setName] = useState("");
  const [dayToDay, setDayToDay] = useState("");
  const [decisions, setDecisions] = useState("");
  const [perspective, setPerspective] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const [placeholderSet, setPlaceholderSet] = useState<RolePlaceholderSet>(GENERIC_ROLE_PLACEHOLDERS);
  const [placeholderPulse, setPlaceholderPulse] = useState(false);
  const [lastAdaptedRole, setLastAdaptedRole] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (placeholderSet.key === "generic") {
      setPlaceholderPulse(false);
      return;
    }

    setPlaceholderPulse(true);
    const timer = window.setTimeout(() => setPlaceholderPulse(false), 260);
    return () => window.clearTimeout(timer);
  }, [placeholderSet.key]);

  async function adaptPlaceholdersForRole(rawRoleName: string) {
    const trimmedRoleName = rawRoleName.trim();

    if (!trimmedRoleName) {
      setPlaceholderSet(GENERIC_ROLE_PLACEHOLDERS);
      setLastAdaptedRole("");
      return;
    }

    if (trimmedRoleName.toLowerCase() === lastAdaptedRole.toLowerCase()) {
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      const response = await fetch("/api/role-placeholders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: trimmedRoleName, provider })
      });

      if (!response.ok) {
        throw new Error("Placeholder generation failed.");
      }

      const payload = (await response.json()) as {
        placeholders?: {
          dayToDay: string;
          decisions: string;
          perspective: string;
          extra: string;
        };
      };

      if (requestId !== requestIdRef.current || !payload.placeholders) {
        return;
      }

      setPlaceholderSet({
        key: `adaptive:${trimmedRoleName.toLowerCase()}`,
        dayToDay: payload.placeholders.dayToDay,
        dayToDayHelper: GENERIC_ROLE_PLACEHOLDERS.dayToDayHelper,
        decisions: payload.placeholders.decisions,
        decisionsHelper: GENERIC_ROLE_PLACEHOLDERS.decisionsHelper,
        perspective: payload.placeholders.perspective,
        perspectiveHelper: GENERIC_ROLE_PLACEHOLDERS.perspectiveHelper,
        extra: payload.placeholders.extra,
        extraHelper: GENERIC_ROLE_PLACEHOLDERS.extraHelper
      });
      setLastAdaptedRole(trimmedRoleName);
    } catch {
      setPlaceholderSet(GENERIC_ROLE_PLACEHOLDERS);
      setLastAdaptedRole(trimmedRoleName);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedDayToDay = dayToDay.trim();
    const trimmedDecisions = decisions.trim();
    const trimmedPerspective = perspective.trim();

    if (!trimmedName) {
      setError("Please enter a role name.");
      return;
    }

    if (!trimmedDayToDay) {
      setError("Please tell us a little about what you do in this role.");
      return;
    }

    if (!trimmedDecisions) {
      setError("Please tell us what matters most in your work.");
      return;
    }

    if (!trimmedPerspective) {
      setError("Please describe the perspective you want SignalTube to use.");
      return;
    }

    onAdd({
      id: `custom:${Date.now().toString(36)}`,
      name: trimmedName,
      dayToDay: trimmedDayToDay,
      decisions: trimmedDecisions,
      perspective: trimmedPerspective,
      extra: extra.trim() || undefined,
      createdAt: new Date().toISOString()
    });
  }

  return (
    <div className="role-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="custom-role-title">
      <form className="role-modal-card" onSubmit={handleSubmit}>
        <button type="button" className="role-modal-close" onClick={onCancel} aria-label="Close custom role modal">
          <CloseIcon />
        </button>
        <h2 id="custom-role-title">Create a custom role</h2>
        <p className="role-modal-copy">
          Help SignalTube understand your role so it can make the content more relevant, useful, and tailored to you.
        </p>

        <label className="role-modal-field">
          <span>Role name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
              if (!event.target.value.trim()) {
                setPlaceholderSet(GENERIC_ROLE_PLACEHOLDERS);
                setLastAdaptedRole("");
              }
            }}
            onBlur={(event) => {
              void adaptPlaceholdersForRole(event.target.value);
            }}
            placeholder="e.g. Growth marketer, AI researcher, PM for developer tools"
          />
          <small>Choose a name you will easily recognize later.</small>
        </label>

        <label className={`role-modal-field ${placeholderPulse ? "role-modal-field-pulse" : ""}`}>
          <span>What do you do in your role day to day?</span>
          <textarea
            value={dayToDay}
            onChange={(event) => {
              setDayToDay(event.target.value);
              setError("");
            }}
            placeholder={placeholderSet.dayToDay}
          />
          <small>{placeholderSet.dayToDayHelper}</small>
        </label>

        <label className={`role-modal-field ${placeholderPulse ? "role-modal-field-pulse" : ""}`}>
          <span>What kinds of decisions or outcomes matter most in your work?</span>
          <textarea
            value={decisions}
            onChange={(event) => {
              setDecisions(event.target.value);
              setError("");
            }}
            placeholder={placeholderSet.decisions}
          />
          <small>{placeholderSet.decisionsHelper}</small>
        </label>

        <label className={`role-modal-field ${placeholderPulse ? "role-modal-field-pulse" : ""}`}>
          <span>What perspective should SignalTube use when interpreting content for you?</span>
          <textarea
            value={perspective}
            onChange={(event) => {
              setPerspective(event.target.value);
              setError("");
            }}
            placeholder={placeholderSet.perspective}
          />
          <small>{placeholderSet.perspectiveHelper}</small>
        </label>

        <label className={`role-modal-field ${placeholderPulse ? "role-modal-field-pulse" : ""}`}>
          <span>Anything else we should know?</span>
          <textarea
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder={placeholderSet.extra}
          />
          <small>{placeholderSet.extraHelper}</small>
        </label>

        {error ? <p className="role-modal-error">{error}</p> : null}

        <div className="role-modal-actions">
          <button type="button" className="role-modal-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="role-modal-primary">
            Add role <ArrowRightIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

function providerName(providerId: Exclude<AnalysisProviderId, "auto" | "heuristic">) {
  if (providerId === "claude") return "Claude";
  if (providerId === "gemini") return "Gemini";
  return "Codex";
}

function ProviderLogo({ providerId }: { providerId: Exclude<AnalysisProviderId, "auto" | "heuristic"> }) {
  const src =
    providerId === "claude"
      ? "/assets/claude-logo.svg"
      : providerId === "gemini"
        ? "/assets/gemini-logo.svg"
        : "/assets/codex-logo.svg";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="provider-logo-img" />
  );
}

function ArticleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2.5h8M4 5.5h8M4 8.5h6M4 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DeepDiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 2.5h10M3 5.5h7M3 8.5h10M3 11.5h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M12 5.5l1.5 1.5L12 8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 13h4M8 11v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <rect width="14" height="10" rx="2.5" fill="#FF0000" />
      <path d="M5.5 3l3.5 2-3.5 2V3z" fill="white" />
    </svg>
  );
}

function MediumIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <rect width="13" height="13" rx="3" fill="#111827" />
      <text x="6.5" y="9.3" fontFamily="Georgia,serif" fontSize="8.5" fontWeight="700" fill="white" textAnchor="middle">
        M
      </text>
    </svg>
  );
}

function SubstackIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <rect width="13" height="13" rx="3" fill="#FF6719" />
      <text x="6.5" y="9.3" fontFamily="Georgia,serif" fontSize="8.5" fontWeight="700" fill="white" textAnchor="middle">
        S
      </text>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProcessingScreen({
  url,
  sourceType,
  presentationMode,
  roleLens,
  roleName,
  provider,
  done,
  failedMessage,
  onExit,
  initialPreview,
  copyLines
}: {
  url: string;
  sourceType: SourceType;
  presentationMode: MemoPresentationMode;
  roleLens: RoleLensId;
  roleName?: string;
  provider: AnalysisProviderId;
  done: boolean;
  failedMessage: string | null;
  onExit: () => void;
  initialPreview?: PreviewState;
  copyLines?: [string, string];
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [preview, setPreview] = useState<PreviewState | null>(initialPreview ?? null);
  const completionSoundPlayedRef = useRef(false);
  const sourceIcon = SOURCE_OPTIONS.find((option) => option.value === sourceType)?.icon ?? <YouTubeIcon />;
  const outputIcon = OUTPUT_MODE_OPTIONS.find((option) => option.value === presentationMode)?.icon ?? <ArticleIcon />;
  const providerLabel = provider === "claude" ? "Claude" : provider === "codex" ? "Codex" : provider === "gemini" ? "Gemini" : "your selected AI";
  const processingSteps = useMemo(() => processingStepsForProvider(providerLabel), [providerLabel]);

  const videoId = useMemo(() => {
    return url.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || "";
  }, [url]);

  useEffect(() => {
    let active = true;

    async function loadPreview() {
      if (initialPreview) {
        return;
      }

      try {
        const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}&sourceType=${sourceType}`);
        const payload = (await response.json()) as PreviewState;
        if (active && response.ok) {
          setPreview(payload);
        }
      } catch {
        if (active) {
          setPreview(null);
        }
      }
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [initialPreview, sourceType, url]);

  useEffect(() => {
    let total = 0;
    const timers: number[] = [];

    processingSteps.forEach((step, index) => {
      total += step.duration;
      const timer = window.setTimeout(() => {
        setStepIndex(index + 1);
      }, total);
      timers.push(timer);
    });

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [processingSteps]);

  useEffect(() => {
    if (!done || failedMessage || completionSoundPlayedRef.current) {
      return;
    }

    completionSoundPlayedRef.current = true;
    const audio = new Audio(COMPLETION_SOUND_URL);
    audio.volume = 0.42;
    void audio.play().catch(() => {
      // Audio feedback can be blocked by the OS/app context; generation should still complete normally.
    });
  }, [done, failedMessage]);

  const thumbnailUrl =
    preview?.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "");
  const visibleStepIndex = done ? processingSteps.length : Math.max(1, stepIndex);
  const sourceLabel = SOURCE_OPTIONS.find((option) => option.value === sourceType)?.label ?? "Source";
  const roleLabel = roleName ?? ROLE_OPTIONS.find((option) => option.value === roleLens)?.label ?? "HAI Designer";
  const outputLabel = outputModeLabel(presentationMode);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px"
      }}
    >
      <div style={{ maxWidth: 540, width: "100%" }} className="fade-up">
        <div className="processing-card">
          <div className="processing-card-media">
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt=""
                className="processing-card-image"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>

          <div className="processing-card-title">
            {preview?.title ? (
              preview.title
            ) : (
              <div className="processing-card-title-skeleton" aria-hidden="true" />
            )}
          </div>
          <div className="processing-meta-row">
            <span className={`processing-source-chip processing-source-${sourceType}`}>
              <span className="processing-chip-icon">{sourceIcon}</span>
              {sourceLabel}
            </span>
            <span className="processing-arrow">→</span>
            <span className="processing-output-chip">
              <span className="processing-chip-icon">{outputIcon}</span>
              {outputLabel}
            </span>
            <span>{roleLabel}</span>
          </div>
        </div>

        <section className="processing-progress-card" aria-live="polite">
          <div className="processing-progress-header">
            <h3>{done ? `Your ${outputLabel} is ready.` : `Building your ${outputLabel}...`}</h3>
            <span>{visibleStepIndex} / {processingSteps.length}</span>
          </div>
          <p className="processing-copy">
            <span>{copyLines?.[0] ?? "This takes a moment."}</span>
            <span>{copyLines?.[1] ?? "We use the video transcript or extracted article text, but not the previously already generated format content to stay close to source."}</span>
          </p>
          <MilestoneList steps={processingSteps} currentIndex={visibleStepIndex} done={done} />
          {failedMessage ? (
            <div style={{ marginTop: 20 }}>
              <button type="button" onClick={onExit} className="processing-error-button">
                {failedMessage}
              </button>
            </div>
          ) : (
            <p className="processing-provider-line">
              <ProviderLogo providerId={providerIconId(provider)} />
              <span>{done ? `${providerLabel} finished.` : `${providerLabel} is processing...`}</span>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function outputModeLabel(mode: MemoPresentationMode) {
  if (mode === "presentation") return "Presentation";
  if (mode === "deep") return "Deep Dive";
  return "Short Dive";
}

function processingStepsForProvider(providerLabel: string) {
  return [
    { label: "Retrieving content", duration: 900 },
    { label: "Reading through the source", duration: 950 },
    { label: `Working with ${providerLabel}`, duration: 900 },
    { label: "Identifying key ideas", duration: 820 },
    { label: "Writing the analysis", duration: 1080 },
    { label: "Defining key concepts", duration: 620 },
    { label: "Assembling your memo", duration: 520 }
  ];
}

function MilestoneTrack({
  steps,
  currentIndex,
  done
}: {
  steps: Array<{ label: string; duration: number }>;
  currentIndex: number;
  done: boolean;
}) {
  const progressPercent =
    steps.length <= 1
      ? 100
      : ((Math.max(1, currentIndex) - 1) / (steps.length - 1)) * 100;

  return (
    <div className="milestone-track" aria-hidden="true">
      <div className="milestone-track-line" />
      <div
        className="milestone-track-fill"
        style={{
          width: `${done ? 100 : progressPercent}%`
        }}
      />
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const state =
          done || stepNumber < currentIndex ? "done" : stepNumber === currentIndex ? "active" : "idle";

        return (
          <div key={step.label} className={`milestone-node milestone-node-${state}`}>
            {state === "done" ? (
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M4 7l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MilestoneList({
  steps,
  currentIndex,
  done
}: {
  steps: Array<{ label: string; duration: number }>;
  currentIndex: number;
  done: boolean;
}) {
  return (
    <div className="milestone-list">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const state =
          done || stepNumber < currentIndex ? "done" : stepNumber === currentIndex ? "active" : "idle";

        return (
          <div key={step.label} className={`milestone-list-item milestone-list-item-${state}`}>
            <div className={`milestone-list-badge milestone-list-badge-${state}`}>
              {state === "done" ? (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M4 7l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : state === "active" ? (
                <div className="milestone-list-badge-pulse" />
              ) : (
                <div className="milestone-list-badge-dot" />
              )}
            </div>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TransformationHero() {
  const shadow = "0 2px 12px rgba(12,16,34,0.07), 0 1px 3px rgba(12,16,34,0.05)";
  return (
    <div
      className="home-mockup"
      style={{ "--mock-shadow": shadow } as CSSProperties}
    >
      <div className="home-mockup-column">
        <div className="home-mockup-youtube">
          <div className="home-mockup-video">
            <div className="home-mockup-play">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3.5 2.5l5.5 3.5-5.5 3.5v-7z" fill="white" />
              </svg>
            </div>
            <span>1:12:04</span>
            <i />
          </div>
          <div className="home-mockup-youtube-meta">
            <b />
            <div>
              <span />
              <small />
            </div>
          </div>
        </div>

        <div className="home-mockup-source-card">
          <div className="home-mockup-source-head">
            <span>S</span>
            <i />
          </div>
          <b />
          <b />
          <div>
            <small />
            <small />
            <small />
          </div>
        </div>
      </div>

      <div className="home-mockup-signal">
        <div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7h9M8.5 4l3.5 3-3.5 3" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span>Signal</span>
      </div>

      <div className="home-mockup-column">
        <div className="home-mockup-article">
          <div className="home-mockup-article-meta">
            <span />
            <i />
          </div>
          <b />
          <b />
          <div className="home-mockup-quote">
            <span />
            <span />
            <span />
          </div>
          <div className="home-mockup-mini-row">
            <i />
            <span />
            <i />
            <span />
            <i />
            <span />
          </div>
          <em>Article</em>
        </div>

        <div className="home-mockup-slides">
          <b />
          <b />
          <div>
            <span />
            <span />
            <span />
          </div>
          <footer>
            <i />
            <i />
            <i />
            <i />
            <i />
            <em>Slides</em>
          </footer>
        </div>
      </div>
    </div>
  );
}

function isValidYouTubeUrl(value: string) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(value);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.3l2.6 2.6L10 3.4" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 3.5V2.2a.7.7 0 00-.7-.7H2.2a.7.7 0 00-.7.7v5.6a.7.7 0 00.7.7h1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
