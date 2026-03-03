"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface User {
  id: string;
  username: string;
  role: string;
  email: string;
  name: string;
  password: string;
  subscription: string;
  customer_number: string;
  customer_other_details: string;
  client_number: string;
  created_at: Date;
  updated_at: Date;
}

export default function EditUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');
  
  const [formData, setFormData] = useState<User>({
    id: userId || '',
    username: '',
    role: '',
    email: '',
    name: '',
    password: '',
    subscription: '',
    customer_number: '',
    customer_other_details: '',
    client_number: '',
    created_at: new Date(),
    updated_at: new Date(),
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; 
    
    const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) {
        setError("No user ID provided");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_BASE_URL}/client-users/${userId}`, {
          headers: {
            Accept: 'application/json',
            "X-API-Key": EXCEL_API_KEY
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setFormData({
          id: userId,
          username: data.username || '',
          role: data.role || '',
          email: data.email || '',
          name: data.name || '',
          password: data.password || '',
          subscription: data.subscription || '',
          customer_number: data.customer_number || '',
          customer_other_details: data.customer_other_details || '',
          client_number: data.client_number || '',
          created_at: data.created_at || '',
          updated_at: data.updated_at || '',
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE_URL}/client-users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          "X-API-Key": EXCEL_API_KEY
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('User updated successfully!', {
          onClose: () => router.push('/UserList'),
          autoClose: 2000 // Close after 2 seconds
        });
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Failed to update user: ${response.status}`;
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('An error occurred while updating the user');
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle cancel button click
  const handleCancel = () => {
    router.push('/UserList');
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-8 flex justify-center items-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6 text-blue-600">Edit User</h2>
              <p className="text-lg mb-4">Loading user data...</p>
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
            <h2 className="text-2xl font-bold mb-6 text-red-600">Error</h2>
            <p className="font-bold">Could not load user data:</p>
            <p>{error}</p>
            <div className="mt-4 flex space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Try Again
              </button>
              <Link href="/UserList" className="bg-gray-600 text-white px-4 py-2 rounded">
                Back to User List
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-blue-600">Edit User</h2>
            <Link 
              href="/UserList" 
              className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Back to List
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Number */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Client Number</label>
                <input
                  type="text"
                  name="client_number"
                  value={formData.client_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Customer Number */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Customer Number</label>
                <input
                  type="text"
                  name="customer_number"
                  value={formData.customer_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password with Toggle */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Created At */}
              <div>
                <label className='block text-gray-700 text-sm font-bold mb-2'>Created At</label>
                <input
                  type='date'
                  name='created_at'
                  value={formData.created_at ? new Date(formData.created_at).toISOString().split('T')[0] : ''}
                  onChange={handleChange}
                  className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />                
              </div>

              {/* Updated At */}
              <div>
                <label className='block text-gray-700 text-sm font-bold mb-2'>Updated At</label>
                <input
                  type='date'
                  name='updated_at'
                  value={formData.updated_at ? new Date(formData.updated_at).toISOString().split('T')[0] : ''}
                  onChange={handleChange}
                  className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />                
              </div>

              {/* Subscription */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Subscription</label>
                <input
                  type="text"
                  name="subscription"
                  value={formData.subscription}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Customer Other Details */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Other Details</label>
                <input
                  type="text"
                  name="customer_other_details"
                  value={formData.customer_other_details}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Button */}
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
                className="w-1/2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Update User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}