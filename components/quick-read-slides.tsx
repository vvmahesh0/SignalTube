"use client";

import Link from "next/link";
import { BookOpenText, Brain, Lightbulb, Quote, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { RelativeTime } from "@/components/relative-time";
import { SignalTubeNav } from "@/components/signaltube-nav";
import { decodeHtmlEntities } from "@/lib/presentation";
import type { MemoListItem, MemoRecord, PresentationSlide } from "@/lib/types";

export function QuickReadSlides({ memo, nextMemo }: { memo: MemoRecord; nextMemo?: MemoListItem | null }) {
  const slides = memo.presentationGenerated && memo.presentationSlides?.length ? memo.presentationSlides : [];
  const [index, setIndex] = useState(0);
  const [motionDirection, setMotionDirection] = useState<"next" | "prev">("next");
  const active = slides[index];
  const slideMotionKey = useMemo(
    () => `${motionDirection}-${active?.slideNumber ?? index}`,
    [active?.slideNumber, index, motionDirection]
  );
  const sourceActionLabel =
    memo.sourceType === "youtube"
      ? "Watch video"
      : memo.sourceType === "medium"
        ? "Open Medium"
        : memo.sourceType === "substack"
          ? "Open Substack"
          : "Open article";
  const hasDuration = memo.durationLabel && memo.durationLabel !== "Unknown length";

  return (
    <div className="page-shell">
      <SignalTubeNav active="detail" />
      <main className="presentation-shell">
        <Link href="/library" className="presentation-back">
          <ArrowLeftIcon />
          All memos
        </Link>

        <header className="presentation-header memo-page-header fade-up">
          <div className="presentation-meta memo-page-meta">
            <span className="presentation-channel memo-page-channel">{decodeHtmlEntities(memo.channelName)}</span>
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
          <h1 className="memo-page-title">{decodeHtmlEntities(memo.title)}</h1>
          {memo.tags.length > 0 ? (
            <div className="memo-tags memo-tags-header">
              {memo.tags.slice(0, 3).map((tag) => (
                <span key={tag}>{decodeHtmlEntities(tag)}</span>
              ))}
            </div>
          ) : null}
          <div className="presentation-actions">
            <span className="memo-page-mode-label">Presentation</span>
            <div className="memo-header-actions">
              <PresentationModeActions memo={memo} />
              <a href={memo.sourceUrl || memo.youtubeUrl} target="_blank" rel="noopener noreferrer" className="watch-link">
                {sourceActionLabel}
                <ExternalLinkIcon />
              </a>
            </div>
          </div>
        </header>

        {slides.length ? (
          <section className="presentation-frame fade-up" aria-live="polite">
            <div className="presentation-frame-top">
              <span>{index + 1} / {slides.length}</span>
              <span>{active?.supportingLabel ?? active?.type ?? "Slide"}</span>
              <button type="button" aria-label="Fullscreen preview">
                <FullscreenIcon />
              </button>
            </div>
            <div className="presentation-slide-stage">
              {active ? (
                <div key={slideMotionKey} className={`presentation-slide-motion presentation-slide-motion-${motionDirection}`}>
                  <SlideRenderer slide={active} memo={memo} />
                </div>
              ) : null}
            </div>
            <div className="presentation-frame-controls">
              <button
                type="button"
                onClick={() => {
                  setMotionDirection("prev");
                  setIndex((current) => Math.max(0, current - 1));
                }}
                disabled={index === 0}
              >
                <ArrowLeftIcon />
                Previous
              </button>
              <div className="presentation-dots">
                {slides.map((slide, slideIndex) => (
                  <button
                    key={`${slide.slideNumber}-${slide.title}`}
                    type="button"
                    aria-label={`Open slide ${slideIndex + 1}`}
                    className={slideIndex === index ? "presentation-dot-active" : ""}
                    onClick={() => {
                      setMotionDirection(slideIndex >= index ? "next" : "prev");
                      setIndex(slideIndex);
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMotionDirection("next");
                  setIndex((current) => Math.min(slides.length - 1, current + 1));
                }}
                disabled={index === slides.length - 1}
              >
                Next
                <ArrowRightIcon />
              </button>
            </div>
          </section>
        ) : (
          <section className="presentation-empty-state fade-up">
            <p>This memo does not have a presentation yet.</p>
            <Link href={`/processing?memoId=${encodeURIComponent(memo.id)}&mode=short`} className="memo-mode-action">
              <ArticleIcon />
              Create Short Dive
            </Link>
          </section>
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

function SlideRenderer({ slide, memo }: { slide: PresentationSlide; memo: MemoRecord }) {
  const SlideIcon = slideIconForType(slide);
  const densityClass = slideDensityClass(slide);

  if (slide.type === "title") {
    return (
      <article className={`deck-slide deck-slide-title ${densityClass}`}>
        <div className="deck-slide-icon deck-slide-icon-invert">
          <SlideIcon aria-hidden="true" />
        </div>
        <p>{slide.supportingLabel ?? "SignalTube Memo"}</p>
        <h2>{decodeHtmlEntities(slide.title)}</h2>
        <span>{decodeHtmlEntities(slide.content ?? memo.channelName)}</span>
      </article>
    );
  }

  if (slide.type === "quote") {
    return (
      <article className={`deck-slide deck-slide-quote ${densityClass}`}>
        <div className="deck-slide-icon deck-slide-icon-invert">
          <SlideIcon aria-hidden="true" />
        </div>
        <blockquote>{decodeHtmlEntities(slide.keyLine ?? slide.content ?? slide.title)}</blockquote>
        {slide.note ? <p>{decodeHtmlEntities(slide.note)}</p> : null}
      </article>
    );
  }

  if (slide.type === "action") {
    return (
      <article className={`deck-slide deck-slide-action ${densityClass}`}>
        <div className="deck-slide-icon">
          <SlideIcon aria-hidden="true" />
        </div>
        <p>{slide.supportingLabel ?? "Professional relevance"}</p>
        <h2>{decodeHtmlEntities(slide.title)}</h2>
        {slide.keyLine ? <strong>{decodeHtmlEntities(slide.keyLine)}</strong> : null}
        <ul>
          {(slide.bullets?.length ? slide.bullets : [slide.content ?? slide.note ?? ""]).filter(Boolean).slice(0, 4).map((item) => (
            <li key={item}>{decodeHtmlEntities(item)}</li>
          ))}
        </ul>
      </article>
    );
  }

  if (slide.type === "list") {
    return (
      <article className={`deck-slide deck-slide-list ${densityClass}`}>
        <div className="deck-slide-icon">
          <SlideIcon aria-hidden="true" />
        </div>
        <p>{slide.supportingLabel ?? "Key signal"}</p>
        <h2>{decodeHtmlEntities(slide.title)}</h2>
        <ol>
          {(slide.bullets?.length ? slide.bullets : [slide.content ?? slide.keyLine ?? ""]).filter(Boolean).slice(0, 5).map((item, itemIndex) => (
            <li key={item}>
              <span>{String(itemIndex + 1).padStart(2, "0")}</span>
              {decodeHtmlEntities(item)}
            </li>
          ))}
        </ol>
        {slide.note ? <small>{decodeHtmlEntities(slide.note)}</small> : null}
      </article>
    );
  }

  return (
    <article className={`deck-slide deck-slide-statement ${densityClass}`}>
      <div className="deck-slide-icon">
        <SlideIcon aria-hidden="true" />
      </div>
      <p>{slide.supportingLabel ?? "Core argument"}</p>
      <h2>{decodeHtmlEntities(slide.title)}</h2>
      {slide.keyLine ? <strong>{decodeHtmlEntities(slide.keyLine)}</strong> : null}
      <div className="deck-slide-rule" />
      <span>{decodeHtmlEntities(slide.content ?? slide.goal ?? "")}</span>
      {slide.bullets?.length ? (
        <ul>
          {slide.bullets.slice(0, 3).map((bullet) => (
            <li key={bullet}>{decodeHtmlEntities(bullet)}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function slideIconForType(slide: PresentationSlide) {
  const text = `${slide.type} ${slide.title} ${slide.supportingLabel ?? ""} ${slide.goal ?? ""}`.toLowerCase();

  if (slide.type === "quote" || text.includes("quote")) return Quote;
  if (slide.type === "action" || text.includes("relevance") || text.includes("action")) return Target;
  if (slide.type === "list" || text.includes("concept")) return Brain;
  if (text.includes("summary") || slide.type === "title") return BookOpenText;
  if (text.includes("idea") || text.includes("takeaway")) return Lightbulb;
  return Sparkles;
}

function slideDensityClass(slide: PresentationSlide) {
  const bulletsLength = (slide.bullets ?? []).join(" ").length;
  const contentLength = [slide.title, slide.content, slide.keyLine, slide.note, slide.goal].filter(Boolean).join(" ").length;
  const score = bulletsLength + contentLength;

  if (score > 520 || (slide.bullets?.length ?? 0) >= 5) return "deck-slide-dense";
  if (score > 340 || (slide.bullets?.length ?? 0) >= 4) return "deck-slide-compact";
  return "";
}

function PresentationModeActions({ memo }: { memo: MemoRecord }) {
  const shortReady = Boolean(memo.shortGenerated || memo.articleGenerated);
  const deepReady = Boolean(memo.deepGenerated && memo.deepDive.length);
  const actions = [
    {
      mode: "short",
      href: shortReady ? `/memos/${memo.id}` : `/processing?memoId=${encodeURIComponent(memo.id)}&mode=short`,
      icon: <ArticleIcon />,
      label: shortReady ? "View Short Dive" : "Create Short Dive"
    },
    {
      mode: "deep",
      href: deepReady ? `/memos/${memo.id}/deep` : `/processing?memoId=${encodeURIComponent(memo.id)}&mode=deep`,
      icon: <DeepDiveIcon />,
      label: deepReady ? "View Deep Dive" : "Create Deep Dive"
    }
  ];

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
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M12 7.5H3M6.5 4L2.5 7.5l4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M3 7.5h9M8.5 4l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M4.5 2H2a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V6.5M6.5 1H10m0 0v3.5M10 1L5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 4.5h5M4 6.5h5M4 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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

function DeepDiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2.5 2.5h8M2.5 5h5M2.5 7.5h8M2.5 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 5l1.2 1.2L10 7.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 5V2h3M9.5 2h3v3M8.5 12h3V9M5 12H2V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
