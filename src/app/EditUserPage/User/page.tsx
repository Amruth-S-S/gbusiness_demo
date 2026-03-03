"use client";

import { Suspense } from "react";
import EditUserPage from "./EditUserPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditUserPage />
    </Suspense>
  );
}
