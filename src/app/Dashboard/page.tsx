"use client"
import { useState, useRef, useEffect } from "react";
import React from 'react';
import { usePathname } from "next/navigation";

export default function Page() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  const [, setUser] = useState({
    name: "",
    email: "",
    id: "",
    role: "",
  });

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Fetch user details from localStorage inside useEffect
  useEffect(() => {
    setUser({
      name: localStorage.getItem("loggedInUserName") || "",
      email: localStorage.getItem("loggedInUserEmail") || "",
      id: localStorage.getItem("loggedInUserId") || "",
      role: localStorage.getItem("loggedInUserRole") || "",
    });
  }, []);

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
    <div className="flex h-screen bg-gray-100">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Spacer */}
        {isMobile && <div className="h-16"></div>}
        
        <header className={`bg-white border-b p-4 shadow-md ${isMobile ? 'fixed top-0 left-0 right-0 z-30' : ''}`}>
          <div className={`flex justify-between items-center ${isMobile ? 'w-full' : 'max-w-screen-xl mx-auto'}`}>
            {/* Mobile Menu Button Placeholder - You can add actual menu functionality here */}
            {isMobile && (
              <div className="w-8"></div> // Spacer for mobile layout balance
            )}

            {/* Right-aligned dropdown showing current screen */}
            <div className="relative ml-auto">
              <button
                onClick={toggleDropdown}
                className={`flex items-center gap-2 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}
              >
                <span className="font-medium">
                  {pathname === '/Dashboard' ? 'Consultant Role' :
                    pathname === '/CXO' ? 'CXO Role' : 'Select Screen'}
                </span>
                <svg
                  className={`transition-transform ${showDropdown ? 'rotate-180' : ''} ${
                    isMobile ? 'w-3 h-3' : 'w-4 h-4'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className={`absolute right-0 mt-2 bg-white border rounded-lg shadow-lg py-1 z-50 ${
                    isMobile ? 'w-40' : 'w-48'
                  }`}
                >
                  <a
                    href="/Dashboard"
                    className={`block px-4 py-2 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    } ${
                      pathname === '/Dashboard' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Consultant Role
                  </a>
                  <a
                    href="/CXO"
                    className={`block px-4 py-2 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    } ${
                      pathname === '/CXO' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    CXO Role
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 bg-gray-200 overflow-y-auto flex flex-col ${
          isMobile ? 'p-3' : 'p-6'
        }`}>
          {/* Top Section - Data Management, Prompt Repository, Settings */}
          <div className={`grid gap-4 mb-6 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-3'
          }`}>
            {/* Data Management */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`flex items-center font-semibold mb-3 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                <span className="mr-2">📊</span> Data Management
              </h3>
              <div className={`space-y-2 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Configure Sources
                </div>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Upload Data
                </div>
                {isMobile && (
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    Data Sources
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Repository */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`flex items-center font-semibold mb-3 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                <span className="mr-2">📝</span> Prompt Repository
              </h3>
              <div className={`space-y-2 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Saved Prompts
                </div>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Templates
                </div>
                {isMobile && (
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    Prompt History
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`flex items-center font-semibold mb-3 ${
                isMobile ? 'text-sm' : 'text-base'
              }`}>
                <span className="mr-2">⚙</span> Settings
              </h3>
              <div className={`space-y-2 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Board Settings
                </div>
                <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                  Permissions
                </div>
                {isMobile && (
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    User Settings
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section - Visualization Area */}
          <div className={`grid gap-4 ${
            isMobile ? 'grid-cols-1' : 'grid-cols-3'
          }`}>
            {/* Revenue Over Time - Placeholder */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`font-semibold mb-4 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                Revenue Over Time
              </h3>
              <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${
                isMobile ? 'h-40' : 'h-64'
              }`}>
                <div className="text-gray-500 text-center">
                  <div className="text-2xl mb-2">📈</div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    Chart Visualization
                  </div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    {isMobile ? 'Tap to expand' : 'Hover for details'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sales by Quarter - Placeholder */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`font-semibold mb-4 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                Sales Analytics
              </h3>
              <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${
                isMobile ? 'h-40' : 'h-64'
              }`}>
                <div className="text-gray-500 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    Sales Data
                  </div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    {isMobile ? 'Tap to expand' : 'Hover for details'}
                  </div>
                </div>
              </div>
            </div>

            {/* Traffic Sources - Placeholder */}
            <div className="bg-white p-4 border rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <h3 className={`font-semibold mb-4 ${
                isMobile ? 'text-base' : 'text-lg'
              }`}>
                Performance Metrics
              </h3>
              <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${
                isMobile ? 'h-40' : 'h-64'
              }`}>
                <div className="text-gray-500 text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    KPI Dashboard
                  </div>
                  <div className={isMobile ? 'text-xs' : 'text-sm'}>
                    {isMobile ? 'Tap to expand' : 'Hover for details'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Mobile-only Section */}
          {isMobile && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {/* Quick Actions */}
              <div className="bg-white p-4 border rounded-lg shadow-lg">
                <h3 className="flex items-center text-sm font-semibold mb-3">
                  <span className="mr-2">🚀</span> Quick Actions
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    New Analysis
                  </div>
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    Recent Files
                  </div>
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    Export Data
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white p-4 border rounded-lg shadow-lg">
                <h3 className="flex items-center text-sm font-semibold mb-3">
                  <span className="mr-2">🔔</span> Updates
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    System Alerts
                  </div>
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    New Features
                  </div>
                  <div className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
                    Maintenance
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
 </>
  );
}