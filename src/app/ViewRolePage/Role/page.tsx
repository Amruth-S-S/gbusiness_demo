"use client";

import { Suspense } from "react";
import ViewRolePage from "./ViewRolePage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewRolePage />
    </Suspense>
  );
}
