"use client"
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation';
import router from 'next/router';

// Role page props interface
interface RolePageProps {
  params?: { roleId?: string | undefined };
  searchParams?: { id?: string; updatedAt?: string };
}

export default function RolePage({ params, searchParams }: RolePageProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    created_at: '',
    updated_at: '',
  });


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; 
    
    const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';
  // Determine if we're in edit mode based on URL parameter
  useEffect(() => {
    // Check for both routes - /EditRolePage/Role?id=xyz or params.roleId
    const roleId = searchParams?.id || params?.roleId;
    
    if (roleId) {
      setIsEditMode(true);
      fetchRoleData(roleId);
    }
  }, [params, searchParams]);
  
  // Fetch role data if in edit mode
  const fetchRoleData = async (roleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        headers: {
          Accept: "application/json",
          "X-API-Key": EXCEL_API_KEY
          
        },
      });

      if (response.ok) {
        const roleData = await response.json();
        // Update form with role data
        setFormData({
          name: roleData.name || '',
          description: roleData.description || '',
          created_at: roleData.created_at || '',
          updated_at: roleData.updated_at  || '',
        });
      } else {
        console.error('Failed to fetch role data');
        alert('Failed to fetch role data');
      }
    } catch (error) {
      console.error('Error fetching role data:', error);
      alert('An error occurred while fetching role data');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };


 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const roleId = searchParams?.id || params?.roleId;
      const url = isEditMode 
        ? `${API_BASE_URL}/roles/${roleId}` 
        : `${API_BASE_URL}/roles/`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
         "X-API-Key": EXCEL_API_KEY
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Role updated successfully!', {
          onClose: () => router.push('/RoleList'),
          autoClose: 2000 // Auto close after 2 seconds
        });
      } else {
        throw new Error('Failed to update role');
      }
    } catch (error) {
      toast.error('Error updating role');
    }
  };
  // Handle cancel button
  const handleCancel = () => {
    window.location.href = '/RoleList';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-8 w-full max-w-2xl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          {isEditMode ? 'Edit Role' : 'Create Role'}
        </h2>

        <div className="space-y-6">
          {/* Role Name */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Role Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter role name"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Created At:</label>
            <input
              type="date"
              name="created_at"
             value={new Date().toISOString().split('T')[0]}
              // onChange={handleChange}
              readOnly
              // placeholder="Enter role name"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* <div className="mb-4">
  <label className="block text-gray-700 text-sm font-bold mb-2">Last Updated:</label>
  <input
    type="text"
    value={updatedAt ? new Date(updatedAt).toLocaleString() : 'Not updated yet'}
    readOnly
    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
  />
  </div> */}

          {/* Role Description */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Enter role description"
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="w-1/2 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-1/2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isEditMode ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </form>
    </div>
  );
}

function setUpdatedAt(arg0: string) {
  throw new Error('Function not implemented.');
}
