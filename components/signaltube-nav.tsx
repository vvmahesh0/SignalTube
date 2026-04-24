import Link from "next/link";

export function SignalTubeNav({ active = "home" }: { active?: "home" | "library" | "detail" }) {
  const libraryActive = active === "library";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 56,
        background: "rgba(248,250,252,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--rule)"
      }}
    >
      <Link
        href="/"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none"
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em"
          }}
        >
          Signal<span style={{ color: "var(--accent)" }}>Tube</span>
        </span>
      </Link>
      <Link
        href="/library"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: libraryActive ? "var(--bg-subtle)" : "none",
          border: `1px solid ${libraryActive ? "var(--rule)" : "transparent"}`,
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          color: libraryActive ? "var(--ink)" : "var(--ink-mid)",
          fontSize: 13.5,
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          transition: "all 0.2s",
          textDecoration: "none"
        }}
      >
        <LibraryIcon />
        Library
      </Link>
    </nav>
  );
}

function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="6.5" y="3" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M11 3.5l2.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
