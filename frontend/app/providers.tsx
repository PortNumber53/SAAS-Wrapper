"use client";

import * as React from "react";
import type { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>{children}</React.Suspense>
  );
}
