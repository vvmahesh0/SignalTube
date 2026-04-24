"use client";

import { createPortal } from "react-dom";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { ArticleListRow } from "@/components/article-list-row";
import { SignalTubeNav } from "@/components/signaltube-nav";
import { filterAndSortMemos, groupMemosByDate } from "@/lib/library-query";
import type { MemoListItem, MemoSortOrder } from "@/lib/types";

export function LibraryScreen({ memos }: { memos: MemoListItem[] }) {
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<MemoSortOrder>("newest");
  const deferredQuery = useDeferredValue(query);
  const filteredMemos = useMemo(
    () => filterAndSortMemos(memos, deferredQuery, sortOrder),
    [deferredQuery, memos, sortOrder]
  );
  const groups = groupMemosByDate(filteredMemos, sortOrder);

  return (
    <div className="page-shell">
      <SignalTubeNav active="library" />
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "88px 24px 80px", minHeight: "100vh" }}>
        <div style={{ marginBottom: 48 }} className="fade-up">
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.022em",
              color: "var(--ink)",
              margin: "0 0 6px"
            }}
          >
            Library
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--ink-faint)",
              fontWeight: 300,
              margin: 0
            }}
          >
            {memos.length} {memos.length === 1 ? "memo" : "memos"}
          </p>
        </div>

        {memos.length > 0 ? (
          <div className="library-controls fade-up">
            <label className="library-search">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your memos"
                aria-label="Search memos"
              />
            </label>

            <SortDropdown value={sortOrder} onChange={setSortOrder} />
          </div>
        ) : null}

        {memos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }} className="fade-in">
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                color: "var(--ink-mid)",
                fontStyle: "italic",
                margin: "0 0 10px"
              }}
            >
              Nothing here yet.
            </p>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--ink-faint)",
                fontWeight: 300,
                margin: 0
              }}
            >
              Generate your first memo from the home screen.
            </p>
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="library-empty-state fade-in">
            <p>No matching memos.</p>
            <span>Try a different title, channel, concept, or tag.</span>
          </div>
        ) : (
          <div>
            {groups.map((group, groupIndex) => (
              <section
                key={group.label}
                style={{
                  marginBottom: 44,
                  animation: "fadeUp 0.4s ease both",
                  animationDelay: `${groupIndex * 0.08}s`,
                  animationFillMode: "both"
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                    color: "var(--ink-faint)",
                    margin: 0,
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--rule)"
                  }}
                >
                  {group.label}
                </p>

                {group.items.map((memo, index) => (
                  <ArticleListRow
                    key={memo.id}
                    memo={memo}
                    style={{
                      animation: "fadeUp 0.4s ease both",
                      animationDelay: `${groupIndex * 0.08 + index * 0.05}s`,
                      animationFillMode: "both"
                    }}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: MemoSortOrder; onChange: (value: MemoSortOrder) => void }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const options: Array<{ value: MemoSortOrder; label: string }> = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "reading", label: "Reading time" }
  ];
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
    if (!open) return;
    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 168;
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      setMenuStyle({ position: "fixed", top: rect.bottom + 6, left, width, zIndex: 2147483000 });
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
    <div className="library-sort-dropdown" ref={rootRef}>
      <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
        {selected.label}
        <ChevronDownIcon />
      </button>
      {open && menuStyle
        ? createPortal(
            <div className="library-sort-menu" style={menuStyle} role="listbox" ref={menuRef}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={option.value === value ? "library-sort-menu-active" : ""}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
