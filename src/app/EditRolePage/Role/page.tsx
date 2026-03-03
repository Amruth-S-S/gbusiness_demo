"use client";

import { Suspense } from "react";
import EditRolePage from "./EditRolePage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditRolePage />
    </Suspense>
  );
}
