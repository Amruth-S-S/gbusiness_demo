"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
  email: string;
  name: string;
  created_at: Date;
  subscription: string;
  customer_number: string;
  customer_other_details: string;
  client_number: string;
  updated_at: Date;
}

// Separate component that uses useSearchParams
function ViewUserContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''; 

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        setError('No user ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/client-users/${userId}`, {
          headers: {
            Accept: 'application/json',
            "X-API-Key": EXCEL_API_KEY,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId, API_BASE_URL, EXCEL_API_KEY]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 flex justify-center items-center">
            <div className="text-center">
              <p className="text-lg mb-4">Loading user details...</p>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            <button
              onClick={() => router.push('/UserList')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Back to User List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <p className="text-gray-500">User not found</p>
            <button
              onClick={() => router.push('/UserList')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Back to User List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">User Details</h1>
          <button
            onClick={() => router.push('/UserList')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Column */}
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black-500">Client Number</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.client_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-500">Name</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.name || "—"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.email || "—"}</p>
                </div>

                {user.customer_other_details && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-black-500">Other Details</label>
                    <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                      {user.customer_other_details}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Second Column */}
            <div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black-500">Customer Number</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.customer_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-500">Username</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-500">Created At</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black-500">Subscription</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{user.subscription || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => router.push(`/EditUserPage/User?id=${user.id}`)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Edit User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component wrapped with Suspense
const ViewUserPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 flex justify-center items-center">
            <div className="text-center">
              <p className="text-lg mb-4">Loading...</p>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ViewUserContent />
    </Suspense>
  );
};

export default ViewUserPage;