"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { RelativeTime } from "@/components/relative-time";
import { decodeHtmlEntities } from "@/lib/presentation";
import type { MemoListItem } from "@/lib/types";

export function ArticleListRow({
  memo,
  style
}: {
  memo: MemoListItem;
  style?: CSSProperties;
}) {
  const thumbnailUrl = memo.thumbnailUrl || (memo.videoId ? `https://img.youtube.com/vi/${memo.videoId}/mqdefault.jpg` : "");

  return (
    <Link
      href={`/memos/${memo.id}`}
      className="article-row"
      style={{
        textDecoration: "none",
        color: "inherit",
        ...style
      }}
    >
      <div className="article-row-thumb">
        {thumbnailUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="" className="article-row-thumb-image" />
          </>
        ) : (
          <div className={`article-row-source-fallback article-row-source-${memo.sourceType}`}>
            {memo.sourceType === "medium" ? "M" : memo.sourceType === "substack" ? "S" : memo.sourceType === "blog" ? "B" : "Y"}
          </div>
        )}
      </div>

      <div className="article-row-body">
        <div className="article-row-title-line">
          <p className="article-row-title">{decodeHtmlEntities(memo.title)}</p>
        </div>
        <p className="article-row-summary">{decodeHtmlEntities(memo.summary)}</p>

        {memo.tags.length > 0 ? (
          <div className="article-row-tags">
            {memo.tags.slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}

        <div className="article-row-meta">
          <span className="article-row-channel-badge">{decodeHtmlEntities(memo.channelName)}</span>
          <span className="article-row-dot">·</span>
          <span className="article-row-meta-clock">
            <ClockIcon />
            {memo.readingTime}
          </span>
          <span className="article-row-dot">·</span>
          <span>
            <RelativeTime iso={memo.processedAt} />
          </span>
        </div>
      </div>

      <div className="article-row-arrow" aria-hidden="true">
        <ArrowRightIcon />
      </div>
    </Link>
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
