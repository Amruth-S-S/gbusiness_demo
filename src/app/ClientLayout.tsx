"use client";

import { usePathname } from 'next/navigation';
import Sidebar from './components/Sidebar';
import { useEffect } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";
  const isConsultantPage = pathname === "/consultant" || pathname === "/Consultant";
  const isCXOPage = pathname === "/cxo" || pathname === "/CXO";
  
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Is consultant page:', isConsultantPage);
    console.log('Is CXO page:', isCXOPage);
  }, [pathname, isConsultantPage, isCXOPage]);

  return (
    <div className="flex h-screen">
      {!isLoginPage && !isConsultantPage && !isCXOPage && <Sidebar clientUserId={''} />}
      <div className="w-full overflow-auto">
        {children}
      </div>
    </div>
  );
}