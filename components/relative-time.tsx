"use client";

import { useEffect, useState } from "react";

import { formatAbsoluteDate, timeAgo } from "@/lib/presentation";

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatAbsoluteDate(iso));

  useEffect(() => {
    setLabel(timeAgo(iso));
  }, [iso]);

  return <span>{label}</span>;
}
