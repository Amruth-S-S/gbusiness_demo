"use client"
import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

// This is for client component props
interface UserPageProps {
    params?: { userId?: string | undefined };
  }

export default function UserPage({ params }: UserPageProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_number: '001',
    customer_number: '',
    customer_other_details: '',
    email: '',
    name: '',
    password: '',
    created_at: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString().split('T')[0],
    subscription: 'Gold',
    username: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_till: new Date().toISOString().split('T')[0],
  });


   const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; 
    
    const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

  // Determine if we're in edit mode based on URL parameter
  useEffect(() => {
    if (params?.userId) {
      setIsEditMode(true);
      fetchUserData(params.userId);
    }
  }, [params]);
  
  // Fetch user data if in edit mode
  const fetchUserData = async (userId: string) => {
    const loadingToast = toast.loading('Loading user data...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/client-users/${userId}`, {
        headers: {
          Accept: "application/json",
          "X-API-Key": EXCEL_API_KEY
        },
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Helper function to format date for input
        const formatDateForInput = (dateString: string) => {
          if (!dateString) return new Date().toISOString().split('T')[0];
          try {
            return new Date(dateString).toISOString().split('T')[0];
          } catch {
            return new Date().toISOString().split('T')[0];
          }
        };

        // Update form with user data
        setFormData({
          client_number: userData.client_number || '001',
          customer_number: userData.customer_number || '',
          customer_other_details: userData.customer_other_details || '',
          email: userData.email || '',
          name: userData.name || '',
          created_at: formatDateForInput(userData.created_at),
          updated_at: formatDateForInput(userData.updated_at),
          // Don't prefill password for security reasons
          password: '',
          subscription: userData.subscription || 'Gold',
          username: userData.username || '',
          valid_from: formatDateForInput(userData.valid_from),
          valid_till: formatDateForInput(userData.valid_till),
        });
        
        toast.success('User data loaded successfully!', { id: loadingToast });
      } else {
        console.error('Failed to fetch user data');
        toast.error('Failed to fetch user data', { id: loadingToast });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('An error occurred while fetching user data', { id: loadingToast });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const loadingToast = toast.loading(
      isEditMode ? 'Updating user...' : 'Creating user...'
    );

    try {
      // Determine if this is a create or update request
      const url = isEditMode 
        ? `${API_BASE_URL}/client-users/${params?.userId}`
        : `${API_BASE_URL}/client-users/`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Create submission data, conditionally including password
      let submissionData;
      if (isEditMode && !formData.password) {
        // If in edit mode and password is empty, omit the password field entirely
        const { password, ...dataWithoutPassword } = formData;
        submissionData = {
          ...dataWithoutPassword,
          updated_at: new Date().toISOString().split('T')[0]
        };
      } else {
        // Otherwise include all fields
        submissionData = { 
          ...formData,
          updated_at: new Date().toISOString().split('T')[0]
        };
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": EXCEL_API_KEY
        },
        body: JSON.stringify(submissionData),
      });

      // Add debugging
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        // Try to parse response - some APIs return empty responses
        let responseData;
        try {
          responseData = await response.json();
          console.log('Response data:', responseData);
        } catch (parseError) {
          console.log('No JSON response or empty response');
        }
        
        const successMessage = isEditMode ? 'User updated successfully!' : 'User created successfully!';
        toast.success(successMessage, { 
          id: loadingToast,
          duration: 4000,
        });
        
        // Small delay before navigation to show the success message
        setTimeout(() => {
          window.location.href = '/UserList';
        }, 1000);
        
      } else {
        // Log the full response for debugging
        const responseText = await response.text();
        console.log('Error response:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }
        
        const errorMessage = errorData.message || (isEditMode ? 'Failed to update user' : 'Failed to create user');
        toast.error(`Error: ${errorMessage}`, { 
          id: loadingToast,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast.error('An error occurred while processing your request.', { 
        id: loadingToast,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    if (isLoading) {
      toast.error('Please wait for the current operation to complete');
      return;
    }
    window.location.href = '/UserList';
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {/* Toast notifications container */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Default options for specific types
          success: {
            duration: 3000,
            style: {
              background: '#10B981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#EF4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
          },
          loading: {
            style: {
              background: '#3B82F6',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#3B82F6',
            },
          },
        }}
      />

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-lg p-8 w-full max-w-2xl"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
            {isEditMode ? 'Edit User' : 'Create User'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Row 1: Client Number and Customer Number */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Client Number</label>
              <input
                type="text"
                name="client_number"
                value={formData.client_number}
                readOnly
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Customer Number</label>
              <input
                type="text"
                name="customer_number"
                value={formData.customer_number}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 2: Email and Name */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 3: Username and Password */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password {isEditMode && "(Leave blank to keep current password)"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEditMode}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    // Eye icon (crossed) when password is visible
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    // Eye icon when password is hidden
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Row 4: Created At and Subscription */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Created At</label>
              <input
                type="date"
                name="created_at"
                value={formData.created_at}
                onChange={handleChange}
                readOnly={isEditMode}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isEditMode ? 'bg-gray-100 cursor-not-allowed' : 'disabled:bg-gray-100 disabled:cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Subscription</label>
              <input
                type="text"
                name="subscription"
                value={formData.subscription}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 5: Valid From and Valid Till */}
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Valid From</label>
              <input
                type="date"
                name="valid_from"
                value={formData.valid_from}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Valid Till</label>
              <input
                type="date"
                name="valid_till"
                value={formData.valid_till}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Row 6: Customer Other Details (Optional) */}
            <div className="md:col-span-2">
              <label className="block text-gray-700 text-sm font-bold mb-2">Customer Other Details (Optional)</label>
              <input
                type="text"
                name="customer_other_details"
                value={formData.customer_other_details}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-1/2 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-1/2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditMode ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}