"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { RelativeTime } from "@/components/relative-time";
import { RichText } from "@/components/rich-text";
import { SignalTubeNav } from "@/components/signaltube-nav";
import { decodeHtmlEntities } from "@/lib/presentation";
import type { MemoListItem, MemoRecord, MemoPresentationMode } from "@/lib/types";

export function MemoDetail({
  memo,
  nextMemo,
  variant = "short"
}: {
  memo: MemoRecord;
  nextMemo?: MemoListItem | null;
  variant?: Extract<MemoPresentationMode, "short" | "deep">;
}) {
  const hasDuration = memo.durationLabel && memo.durationLabel !== "Unknown length";
  const sourceActionLabel =
    memo.sourceType === "youtube"
      ? "Watch video"
      : memo.sourceType === "medium"
        ? "Open Medium"
        : memo.sourceType === "substack"
          ? "Open Substack"
          : "Open article";
  const pageLabel = variant === "deep" ? "Deep Dive" : "Short Dive";

  return (
    <div className="page-shell">
      <SignalTubeNav active="detail" />

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "88px 24px 120px", minHeight: "100vh" }}>
        <Link
          href="/library"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            textDecoration: "none",
            color: "var(--ink-faint)",
            fontSize: 13,
            marginBottom: 44,
            width: "fit-content"
          }}
        >
          <ArrowLeftIcon />
          All memos
        </Link>

        <div className="memo-page-header fade-up">
          <div className="memo-page-meta">
            <span className="memo-page-channel">
              {decodeHtmlEntities(memo.channelName)}
            </span>
            {hasDuration ? <span>{memo.durationLabel}</span> : null}
            <span className="memo-page-meta-item">
              <ClockIcon />
              {memo.readingTime}
            </span>
            <span className="memo-page-meta-item">
              <CalendarIcon />
              Created <RelativeTime iso={memo.processedAt} />
            </span>
            <span>For {decodeHtmlEntities(memo.roleName ?? roleLabel(memo.roleLens))}</span>
          </div>

          <h1 className="memo-page-title">
            {decodeHtmlEntities(memo.title)}
          </h1>

          {memo.tags.length > 0 ? (
            <div className="memo-tags memo-tags-header">
              {memo.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{decodeHtmlEntities(tag)}</span>
              ))}
            </div>
          ) : null}

          <div className="memo-page-action-row">
            <span className="memo-page-mode-label">{pageLabel}</span>
            <div className="memo-header-actions">
              <MemoModeActions memo={memo} currentMode={variant} />
              <a href={memo.sourceUrl || memo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="watch-link">
                {sourceActionLabel}
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </div>

        {variant === "short" ? (
          <div className="dive-panel">
            <Section title="Summary" defaultOpen divider={false}>
              <div className="summary-callout">
                <RichText content={decodeHtmlEntities(memo.summary)} tone="summary" />
              </div>
            </Section>

            <Section title="Key Ideas" defaultOpen>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {memo.keyIdeas.map((idea, index) => (
                  <KeyIdea key={`${idea.title}-${index}`} idea={idea} index={index} />
                ))}
              </div>
            </Section>

            <Section title="Key Concepts" defaultOpen>
              <div className="concept-list">
                {memo.concepts.map((concept, index) => (
                  <Concept key={`${concept.term}-${index}`} concept={concept} index={index} />
                ))}
              </div>
            </Section>

            <Section title="Professional Relevance" defaultOpen>
              <div className="relevance-panel">
                <RichText content={decodeHtmlEntities(memo.relevance)} tone="support" />
              </div>
            </Section>
          </div>
        ) : (
          <div className="dive-panel dive-panel-deep">
            {memo.deepDive.map((section, index) => (
              <article key={`${section.heading}-${index}`} className="deep-dive-article">
                <h2 className="deep-dive-heading">{decodeHtmlEntities(section.heading)}</h2>
                <RichText content={decodeHtmlEntities(section.body)} tone="article" />
              </article>
            ))}
          </div>
        )}

        {nextMemo ? (
          <footer className="memo-footer">
            <Link href={`/memos/${nextMemo.id}`} className="read-next-link">
              <span>
                <span className="read-next-kicker">Read next memo</span>
                <span className="read-next-title">{decodeHtmlEntities(nextMemo.title)}</span>
              </span>
              <ArrowRightIcon />
            </Link>
          </footer>
        ) : null}
      </main>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
  divider = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  divider?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [height, setHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      setHeight(node.scrollHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children, open]);

  return (
    <div style={{ borderTop: divider ? "1px solid var(--rule)" : "none", paddingTop: divider ? 32 : 0 }}>
      <button
        onClick={() => setOpen((current) => !current)}
        className="accordion-trigger"
        type="button"
      >
        <span className="accordion-label">{title}</span>
        <span
          style={{
            color: "var(--ink-faint)",
            transition: "transform 240ms var(--ease-out-quart)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            display: "flex"
          }}
        >
          <ChevronIcon />
        </span>
      </button>
      <div
        className="accordion-shell"
        style={{
          maxHeight: open ? `${height + 28}px` : "0px",
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-8px)"
        }}
      >
        <div ref={contentRef} className="accordion-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function KeyIdea({
  idea,
  index
}: {
  idea: MemoRecord["keyIdeas"][number];
  index: number;
}) {
  return (
    <div className="idea-card">
      <span className="idea-card-index">0{index + 1}</span>
      <div>
        <p className="idea-card-title">{decodeHtmlEntities(idea.title)}</p>
        <RichText content={decodeHtmlEntities(idea.body)} tone="support" />
      </div>
    </div>
  );
}

function Concept({
  concept,
  index
}: {
  concept: MemoRecord["concepts"][number];
  index: number;
}) {
  return (
    <div className="concept-row">
      <span className="idea-card-index">0{index + 1}</span>
      <div>
        <p className="concept-row-title">{decodeHtmlEntities(concept.term)}</p>
        <RichText content={decodeHtmlEntities(concept.definition)} tone="support" />
        {concept.whyItMatters ? (
          <div className="concept-row-note">
            <RichText content={`**Why it matters:** ${decodeHtmlEntities(concept.whyItMatters)}`} tone="support" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MemoModeActions({
  memo,
  currentMode
}: {
  memo: MemoRecord;
  currentMode: MemoPresentationMode;
}) {
  const shortReady = Boolean(memo.shortGenerated || memo.articleGenerated);
  const deepReady = Boolean(memo.deepGenerated && memo.deepDive.length);
  const presentationReady = Boolean(memo.presentationGenerated && memo.presentationSlides?.length);
  const actions = [
    currentMode !== "short"
      ? {
          mode: "short" as const,
          ready: shortReady,
          href: shortReady ? `/memos/${memo.id}` : `/processing?memoId=${encodeURIComponent(memo.id)}&mode=short`,
          icon: <ArticleIcon />,
          label: shortReady ? "View Short Dive" : "Create Short Dive"
        }
      : null,
    currentMode !== "deep"
      ? {
          mode: "deep" as const,
          ready: deepReady,
          href: deepReady ? `/memos/${memo.id}/deep` : `/processing?memoId=${encodeURIComponent(memo.id)}&mode=deep`,
          icon: <DeepDiveIcon />,
          label: deepReady ? "View Deep Dive" : "Create Deep Dive"
        }
      : null,
    currentMode !== "presentation"
      ? {
          mode: "presentation" as const,
          ready: presentationReady,
          href: presentationReady ? `/memos/${memo.id}/slides` : `/processing?memoId=${encodeURIComponent(memo.id)}&mode=presentation`,
          icon: <SlidesIcon />,
          label: presentationReady ? "View Presentation" : "Create Presentation"
        }
      : null
  ].filter((action): action is NonNullable<typeof action> => Boolean(action));

  return actions.map((action) => (
    <Link key={action.mode} href={action.href} className="memo-mode-action">
      {action.icon}
      {action.label}
    </Link>
  ));
}

function roleLabel(role?: string) {
  if (role === "ux") return "UX Designer";
  if (role === "dev") return "Developer";
  if (role === "kid") return "I'm a kid";
  return "HAI Designer";
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13 8H3M7 4L3 8l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 5l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7.5 1H11m0 0v3.5M11 1L5.5 6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 2.5h7M3 5h7M3 7.5h5M3 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DeepDiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2.5 2.5h8M2.5 5h5M2.5 7.5h8M2.5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 5l1.2 1.2L10 7.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="10" height="7.5" rx="1.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 11.5h3M6.5 10v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 4v2.8l1.8 1.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="2" y="2.8" width="9" height="8.4" rx="1.5" stroke="currentColor" strokeWidth="1.15" />
      <path d="M4.2 1.5v2M8.8 1.5v2M2.4 5.2h8.2" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}
