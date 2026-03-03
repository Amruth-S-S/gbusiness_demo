"use client"; // Mark this as a Client Component

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { User } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  created_at: Date;
}

const RoleList = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [roleToDelete, setRoleToDelete] = useState<{ roleId: string; roleName: string } | null>(null);

  const usersPerPage = 9; // Set the number of users per page
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user details from localStorage (Replace this with API call if needed)
  const [user, setUser] = useState({
    name: "",
    email: "",
    id: "",
    role: "",
  });

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

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

  const downloadExcel = () => {
    // Use filteredRoles if you want to download only the currently filtered data
    // Or use roles if you want to download all data regardless of filters
    const dataToExport = searchTerm ? filteredRoles : roles;

    // Prepare data for Excel
    const excelData = dataToExport.map(role => ({
      'Role Name': role.name || '—',
      'Description': role.description || '—',
      'Created At': role.created_at ? new Date(role.created_at).toLocaleDateString() : '-'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Save the file
    saveAs(data, `roles_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Check for success message in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');

    if (success === 'created') {
      toast.success('Role created successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'updated') {
      toast.success('Role updated successfully!');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

 // Fetch roles from the API
useEffect(() => {
  const fetchRoles = async () => {
    setIsLoading(true);
    setError(null);

    console.log("Fetching roles from proxy API...");

    try {
      // Use the proxy API route instead of direct backend call
      const response = await fetch(`${API_BASE_URL}/roles`, {
        headers: {
          Accept: 'application/json',
          "X-API-Key": EXCEL_API_KEY
        },
      });

      console.log("Proxy API Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.details || response.statusText}`);
      }

      let data = await response.json();
      console.log("Proxy API data:", data);

      // Check if data is actually an array
      if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        if (data && typeof data === 'object') {
          // Maybe it's wrapped in another object?
          if (Array.isArray(data.roles)) {
            data = data.roles;
          } else if (data.data && Array.isArray(data.data)) {
            data = data.data;
          } else {
            throw new Error(`Response is not an array: ${JSON.stringify(data).substring(0, 100)}...`);
          }
        } else {
          throw new Error(`Response is not an array: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      }

      setRoles(data);
      toast.success(`Loaded ${data.length} roles successfully`);
    } catch (error) {
      console.error('Error fetching roles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to load roles: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  fetchRoles();
}, []);

  // Filter roles based on search term - Fixed with proper type checking
  const filteredRoles = roles.filter(role => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    return (
      (role.name && typeof role.name === 'string' && role.name.toLowerCase().includes(searchLower)) ||
      (role.description && typeof role.description === 'string' && role.description.toLowerCase().includes(searchLower)) ||
      (role.id && String(role.id).toLowerCase().includes(searchLower))
    );
  });

  // Handle delete click - show confirmation modal
  const handleDeleteClick = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    setRoleToDelete({
      roleId,
      roleName: role?.name || `Role ${roleId}`
    });
    setShowConfirmModal(true);
  };

  // Confirm delete role
  const confirmDelete = async () => {
    if (!roleToDelete) return;

    setIsDeleting(true);
    setShowConfirmModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/roles/${roleToDelete.roleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
           "X-API-Key": EXCEL_API_KEY
        },
      });

      if (response.ok) {
        // Remove the deleted role from the list
        setRoles((prevRoles) => prevRoles.filter((role) => role.id !== roleToDelete.roleId));
        toast.success(`Role "${roleToDelete.roleName}" deleted successfully!`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete role: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('An error occurred while deleting the role');
    } finally {
      setIsDeleting(false);
      setRoleToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowConfirmModal(false);
    setRoleToDelete(null);
  };

  // Handle edit role
  const handleEdit = (roleId: string) => {
    // Navigate to the edit page with query parameter
    router.push(`/EditRolePage/Role?id=${roleId}`);
  };

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleView = (roleId: string) => {
    router.push(`/ViewRolePage/Role?id=${roleId}`);
  };

  // Pagination logic - use filtered roles
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredRoles.length / usersPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Debug component - shows API response for troubleshooting
  // const DebugPanel = () => (
  //   <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
  //     <h3 className="font-bold mb-2">Debug Information:</h3>
  //     <p>Loading state: {isLoading ? 'Loading...' : 'Completed'}</p>
  //     <p>Error state: {error || 'None'}</p>
  //     <p>Role count: {roles.length}</p>
  //     <div className="mt-2">
  //       <p className="font-bold">Raw role data:</p>
  //       <pre className="bg-gray-200 p-2 mt-1 overflow-auto max-h-40 text-xs">
  //         {JSON.stringify(roles, null, 2)}
  //       </pre>
  //     </div>
  //   </div>
  // );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">Role List</h1>
          </div>
          <div className="bg-white shadow-md rounded-lg p-8 flex justify-center items-center">
            <div className="text-center">
              <p className="text-lg mb-4">Loading roles...</p>
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
          {/* <DebugPanel /> */}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">Role List</h1>
          </div>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-bold">Error loading roles:</p>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
          {/* <DebugPanel /> */}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="bg-white border-b p-4 shadow-md">
        <div className="flex justify-between items-center max-w-screen-xl mx-auto">
          {/* Left-aligned items (empty for now, can add logo or other items later) */}
          <div></div>

          {/* Right-aligned dropdown showing current screen */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-2 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors"
            >
              <span className="text-sm font-medium">
                {location.pathname === '/RoleList' ? 'Consultant Role' :
                  location.pathname === '/CXO' ? 'CXO Role' :
                    'Select Screen'}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
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
                className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg py-1 z-50"
              >
                <a
                  href="/Dashboard"
                  className={`block px-4 py-2 text-sm ${location.pathname === '/Dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Consultant Role
                </a>
                <a
                  href="/CXO"
                  className={`block px-4 py-2 text-sm ${location.pathname === '/CXO' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  CXO Role
                </a>
              </div>
            )}
          </div>
        </div>
      </header>



      <div className="min-h-screen bg-gray-100 p-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-blue-600">Role List</h1>
            <div className="flex space-x-4">
              <button
                onClick={downloadExcel}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Download Roles
              </button>
              <Link
                href="/Role"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Create Role
              </Link>
            </div>
          </div>

          {roles.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <p className="text-gray-500">No roles found</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              {/* Search Bar */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search roles by name, description, or ID..."
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      type="button"
                    >
                      <svg
                        className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <p className="mt-2 text-sm text-gray-600">
                    Showing {filteredRoles.length} of {roles.length} roles
                  </p>
                )}
              </div>

              {filteredRoles.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">
                    {searchTerm ? `No roles found matching "${searchTerm}" ` : 'No roles found'}
                  </p>
                </div>
              ) : (
                <>
                  <table className="min-w-full">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Role Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentRoles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                          <td
                            className="px-6 py-4 text-sm text-gray-700 cursor-pointer hover:text-blue-600"
                            onDoubleClick={() => handleView(role.id)}
                            title="Double-click to view details"
                          >
                            {role.name || "—"}
                          </td>
                          <td
                            className="px-6 py-4 text-sm text-gray-700 cursor-pointer hover:text-blue-600"
                            onDoubleClick={() => handleView(role.id)}
                            title="Double-click to view details"
                          >
                            {role.description || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {role.created_at ? new Date(role.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex space-x-4">
                              {/* Edit Icon */}
                              <button
                                onClick={() => handleEdit(role.id)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Edit Role"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>

                              {/* Delete Icon */}
                              <button
                                onClick={() => handleDeleteClick(role.id)}
                                disabled={isDeleting}
                                className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                                title="Delete Role"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>

                              {/* View Icon */}
                              <button
                                onClick={() => handleView(role.id)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                title="View Role Details"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path
                                    fillRule="evenodd"
                                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination controls inside the card */}
                  {totalPages > 1 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex-1 flex justify-between items-center">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md transition-colors ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                          Previous
                        </button>

                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                                <button
                                  key={number}
                                  onClick={() => paginate(number)}
                                  className={`px-4 py-2 mx-1 rounded transition-colors ${currentPage === number ? 'bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-700 text-white'}`}
                                >
                                  {number}
                                </button>
                              ))}
                            </nav>
                          </div>
                        </div>

                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md transition-colors ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Uncomment this for debugging */}
          {/* <DebugPanel /> */}
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 8.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirm Role Deletion
                  </h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the role <strong>"{roleToDelete?.roleName}"</strong>? This action cannot be undone and will remove all associated permissions and user assignments.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Role'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RoleList;