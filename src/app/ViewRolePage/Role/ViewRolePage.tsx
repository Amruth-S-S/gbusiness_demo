"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';


interface Role {
  id: string;
  name: string;
  description: string;
  created_at: Date;
}

const ViewRolePage = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleId = searchParams.get('id');

  useEffect(() => {
    const fetchRole = async () => {
      if (!roleId) {
        setError('No role ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://gbusiness-be-35486280762.us-central1.run.app/roles/${roleId}`, {
          headers: {
            Accept: 'application/json',
            'X-API-Key': 'xxAJf365FZZidPt496lk9M2XDbvQCMKevOSuBgx2k6BAjp3ALe4vLTjXtcmgatoQtvsSLED3lx7zEgyHcohd1Wa2iJWTlukzQTuauvTbGYjSgMtFq5AUQLuAcMW44mp',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch role: ${response.status}`);
        }

        const data = await response.json();
        setRole(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [roleId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 flex justify-center items-center">
            <div className="text-center">
              <p className="text-lg mb-4">Loading role details...</p>
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
              onClick={() => router.push('/RoleList')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Back to Role List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 text-center">
            <p className="text-gray-500">Role not found</p>
            <button 
              onClick={() => router.push('/RoleList')}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Back to Role List
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
          <h1 className="text-2xl font-bold text-blue-600">Role Details</h1>
          <button
            onClick={() => router.push('/RoleList')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to List
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Role Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Role Name</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">{role.name || "—"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created At</label>
                  <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded">
                    {role.created_at ? new Date(role.created_at).toLocaleDateString() : "—"}
                  </p>
                </div>
             

            <div>
              <label className="block text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded whitespace-pre-wrap">
                {role.description || "—"}
              </p>
            </div>
             </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => router.push(`/EditRolePage/Role?id=${role.id}`)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Edit Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ViewRolePageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViewRolePage />
    </Suspense>
  );
}