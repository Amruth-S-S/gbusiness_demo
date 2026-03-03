"use client";

import { useSearchParams } from 'next/navigation';
import RolePage from '@/app/Role/page';
import { Suspense } from 'react';

export default function EditRolePage() {
  const params = useSearchParams();
  const id = params?.get('id') ?? undefined;
  const updatedAt = params?.get('updatedAt') ?? undefined;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RolePage searchParams={{ id, updatedAt }} />
    </Suspense>
  );
}