"use client";
import { User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from "next/navigation";

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function UserRoleAssignment() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [reportFormat, setReportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [currentRoleOnly, setCurrentRoleOnly] = useState(false);
const pathname = usePathname();
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [userToRemove, setUserToRemove] = useState<{ userId: string; userName: string } | null>(null);
   const [showDropdown, setShowDropdown] = useState(false);
      const dropdownRef = useRef<HTMLDivElement>(null);
    
      // Fetch user details from localStorage (Replace this with API call if needed)
      const [user, setUser] = useState({
        name: "",
        email: "",
        id: "",
        role: "",
      });


      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''; 
    
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

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    String(user.id || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // Auto-close success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch roles and users
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch roles
        const rolesResponse = await fetch(`${API_BASE_URL}/roles/`, {
          headers: {
            'Accept': 'application/json',

           "X-API-Key": EXCEL_API_KEY

          },
        });
        const rolesData = await rolesResponse.json();
        setRoles(Array.isArray(rolesData) ? rolesData : []);

        // Fetch users
        const usersResponse = await fetch(`${API_BASE_URL}/client-users/`, {
          headers: {
            'Accept': 'application/json',

           "X-API-Key": EXCEL_API_KEY

          },
        });
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch assigned users when role changes
  useEffect(() => {
    if (selectedRole) {
      fetchAssignedUsers(selectedRole);
    } else {
      setAssignedUserIds([]);
    }
  }, [selectedRole]);

  const fetchAssignedUsers = async (roleId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}/users`, {
        headers: {
          'Accept': 'application/json',

         "X-API-Key": EXCEL_API_KEY

        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assigned users: ${response.status}`);
      }

      const data = await response.json();
      const userIds = Array.isArray(data) 
        ? data.map(item => typeof item === 'object' ? item.user_id : item)
        : [];
      
      setAssignedUserIds(userIds);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch assigned users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    if (!assignedUserIds.includes(userId)) {
      setSelectedUsers(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId) 
          : [...prev, userId]
      );
    }
  };

  // Toggle all users selection (only for filtered/visible users)
  const toggleAllUsers = () => {
    const eligibleUsers = filteredUsers
      .filter(user => !assignedUserIds.includes(user.id))
      .map(user => user.id);
    
    setSelectedUsers(prev => 
      prev.length === eligibleUsers.length ? [] : eligibleUsers
    );
  };

  const assignRoles = async () => {
    if (!selectedRole || selectedUsers.length === 0) {
      setError('Please select at least one user and a role');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const promises = selectedUsers.map(userId => 
        fetch(`${API_BASE_URL}/users/${userId}/roles?role_id=${selectedRole}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',

           "X-API-Key": EXCEL_API_KEY

          },
        })
      );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(r => r.ok);

      if (allSuccessful) {
        setSuccess(`Successfully assigned role to ${selectedUsers.length} user(s)`);
        fetchAssignedUsers(selectedRole);
        setSelectedUsers([]);
      } else {
        throw new Error('Some assignments failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to assign roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    const user = users.find(u => u.id === userId);
    setUserToRemove({
      userId,
      userName: user?.name || `User ${userId}`
    });
    setShowConfirmModal(true);
  };

  const confirmRemoveRole = async () => {
    if (!userToRemove || !selectedRole) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setShowConfirmModal(false);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userToRemove.userId}/roles/${selectedRole}`, {
        method: 'DELETE',
        headers: {

         "X-API-Key": EXCEL_API_KEY

        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove role from user ${userToRemove.userId}`);
      }

      setSuccess(`Successfully removed role from ${userToRemove.userName}`);
      fetchAssignedUsers(selectedRole);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove role');
    } finally {
      setIsLoading(false);
      setUserToRemove(null);
    }
  };

  const cancelRemoveRole = () => {
    setShowConfirmModal(false);
    setUserToRemove(null);
  };

  // Add these functions to your component

  const generateCSV = (users: User[], roles: Role[], assignments: Record<string, string[]>) => {
    let csv = 'User ID,User Name,User Email,Assigned Roles\n';

    users.forEach(user => {
      const userRoles = [];
      for (const roleId in assignments) {
        if (assignments[roleId].includes(user.id)) {
          const role = roles.find(r => r.id.toString() === roleId.toString());
          userRoles.push(role?.name || `[ID: ${roleId}]`);
        }
      }

      csv += `"${user.id}","${user.name}","${user.email}","${userRoles.join(', ')}"\n`;
    });

    return csv;
  };

  const generateJSON = (users: User[], roles: Role[], assignments: Record<string, string[]>) => {
    const report = users.map(user => {
      const userRoles = [];
      for (const roleId in assignments) {
        if (assignments[roleId].includes(user.id)) {
          const role = roles.find(r => r.id.toString() === roleId.toString());
          userRoles.push({
            id: roleId,
            name: role?.name || 'Unknown Role'
          });
        }
      }

      return {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        roles: userRoles
      };
    });

    return JSON.stringify(report, null, 2);
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    setError(null);

    try {
      let assignments: Record<string, string[]> = {};

      if (currentRoleOnly && selectedRole) {
        // Only fetch data for the currently selected role
        const response = await fetch(`${API_BASE_URL}/roles/${selectedRole}/users`, {
          headers: {
            'Accept': 'application/json',

            "X-API-Key": EXCEL_API_KEY

          },
        });

        if (response.ok) {
          const data = await response.json();
          assignments[selectedRole] = Array.isArray(data)
            ? data.map(item => typeof item === 'object' ? item.user_id : item)
            : [];
        }
      } else {
        // Fetch all role assignments as before
        await Promise.all(roles.map(async role => {
          const response = await fetch(`${API_BASE_URL}/roles/${role.id}/users`, {
            headers: {
              'Accept': 'application/json',

              "X-API-Key": EXCEL_API_KEY

            },
          });

          if (response.ok) {
            const data = await response.json();
            assignments[role.id] = Array.isArray(data)
              ? data.map(item => typeof item === 'object' ? item.user_id : item)
              : [];
          }
        }));
      }

      // Filter users if we're only showing the current role
      let usersToInclude = users;
      if (currentRoleOnly && selectedRole) {
        const assignedUserIds = assignments[selectedRole] || [];
        usersToInclude = users.filter(user => assignedUserIds.includes(user.id));
      }

      // Generate the report content based on selected format
      let content: string;
      let fileName: string;
      let mimeType: string;

      switch (reportFormat) {
        case 'csv':
          content = generateCSV(usersToInclude, roles, assignments);
          fileName = currentRoleOnly
            ? `user_role_assignments_${selectedRole}.csv`
            : 'user_role_assignments.csv';
          mimeType = 'text/csv';
          break;
        case 'json':
          content = generateJSON(usersToInclude, roles, assignments);
          fileName = currentRoleOnly
            ? `user_role_assignments_${selectedRole}.json`
            : 'user_role_assignments.json';
          mimeType = 'application/json';
          break;
        case 'pdf':
          return await generatePDF(usersToInclude, roles, assignments, currentRoleOnly);
        default:
          throw new Error('Unsupported report format');
      }

      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Report generated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };
  // For PDF generation (requires pdf-lib or similar library)
  const generatePDF = async (users: User[], roles: Role[], assignments: Record<string, string[]>, currentRoleOnly: boolean = false) => {
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);

      // Add title
      const title = currentRoleOnly && selectedRole
        ? `User Role Assignment Report - ${roles.find(r => r.id === selectedRole)?.name || selectedRole}`
        : 'User Role Assignment Report';

      page.drawText(title, {
        x: 50,
        y: 750,
        size: 20,
        color: rgb(0, 0, 0),
      });

      // Rest of your PDF generation code...
      // (keep the existing implementation but use the filtered users list)
    } catch (error) {
      throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

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
                {pathname === '/RoleAssignment' ? 'Consultant Role' :
 pathname === '/CXO' ? 'CXO Role' :
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
                  className={`block px-4 py-2 text-sm ${pathname === '/Dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Consultant Role
                </a>
                <a
                  href="/CXO"
                  className={`block px-4 py-2 text-sm ${pathname === '/CXO' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  CXO Role
                </a>
              </div>
            )}
          </div>
        </div>
      </header>


    <div className="min-h-screen bg-gray-100 p-4 w-full relative">
      
       {/* Add this to your JSX */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <h3 className="text-lg font-semibold mb-2 md:mb-0">Generate Report</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="currentRoleOnly"
                checked={currentRoleOnly}
                onChange={(e) => setCurrentRoleOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded mr-2"
                disabled={!selectedRole || isGeneratingReport}
              />
              <label htmlFor="currentRoleOnly" className="text-sm text-gray-700">
                Current Role Only
              </label>
            </div>
            {/* <select
          value={reportFormat}
          onChange={(e) => setReportFormat(e.target.value as 'csv' | 'json' | 'pdf')}
          className="p-2 border rounded-lg"
          disabled={isGeneratingReport}
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
          <option value="pdf">PDF</option>
        </select> */}
            <button
          onClick={generateReport}
          disabled={isGeneratingReport || isLoading || users.length === 0}
          className={`px-4 py-2 rounded-lg flex items-center justify-center ${
            isGeneratingReport || isLoading || users.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
              {isGeneratingReport ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-full mx-auto">
        {/* Status Messages at the top with auto-close */}
        <div className="w-full mb-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <div className="flex justify-between items-center">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSuccess(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full" style={{ minHeight: '620px' }}>
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800">User Role Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 w-full">
            {/* Users Column */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Users</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {selectedUsers.length} selected
                  </span>
                  <button 
                    onClick={toggleAllUsers}
                    className="text-xs text-blue-600 hover:text-blue-800"
                    disabled={isLoading}
                  >
                    {selectedUsers.length === filteredUsers.filter(u => !assignedUserIds.includes(u.id)).length 
                      ? 'Unselect All' 
                      : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-400"
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
                    placeholder="Search users by name, email, or ID..."
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg
                        className="h-4 w-4 text-gray-400 hover:text-gray-600"
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
                {userSearchTerm && (
                  <p className="mt-1 text-xs text-gray-600">
                    Showing {filteredUsers.length} of {users.length} users
                  </p>
                )}
              </div>
              
              <div className="h-80 overflow-y-auto space-y-2">
                {isLoading && !users.length ? (
                  <div className="p-4 text-center">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {userSearchTerm ? `No users found matching "${userSearchTerm}"` : 'No users found'}
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isAssigned = assignedUserIds.includes(user.id);
                    return (
                      <div 
                        key={user.id} 
                        className={`p-3 rounded-lg transition-colors ${
                          selectedUsers.includes(user.id) 
                            ? 'bg-blue-100 border border-blue-300' 
                            : isAssigned 
                              ? 'bg-white border border-gray-200'
                              : 'hover:bg-gray-100 border border-transparent'
                        }`}
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleUserSelect(user.id)}
                            className="h-4 w-4 text-blue-600 rounded mr-3"
                            disabled={isAssigned}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-xs font-mono text-gray-500">ID: {user.id}</span>
                              <span className="text-sm font-medium truncate">{user.name}</span>
                            </div>
                            <div className="mt-1">
                              <span className="text-xs text-gray-500 truncate">{user.email}</span>
                            </div>
                          </div>
                          {isAssigned && (
                            <span className="ml-auto text-xs text-green-600 whitespace-nowrap">Assigned</span>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Arrow Button Column */}
            <div className="flex flex-col items-center justify-center">
              <button
                onClick={assignRoles}
                disabled={!selectedRole || selectedUsers.length === 0 || isLoading}
                className={`p-3 rounded-full shadow-md transition-all ${
                  !selectedRole || selectedUsers.length === 0 || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {selectedUsers.length > 0 
                  ? `Assign ${selectedUsers.length} user(s) `
                  : "Select users to assign"}
              </p>
            </div>

            {/* Roles Column */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="mb-4">
                <label className="block text-lg font-semibold text-gray-700 mb-2">Roles</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select a role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="h-80 overflow-y-auto">
                {selectedRole ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">
                        {roles.find(r => r.id === selectedRole)?.name || 'Selected Role'}
                      </h4>
                      <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {assignedUserIds.length} assigned
                      </span>
                    </div>

                    {isLoading ? (
                      <div className="text-center py-4">Loading assigned users...</div>
                    ) : assignedUserIds.length > 0 ? (
                      <div className="space-y-2">
                        {assignedUserIds.map(userId => {
                          const user = users.find(u => u.id === userId);
                          return (
                            <div key={userId} className="p-3 bg-white rounded-lg border flex justify-between items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline space-x-2">
                                  <span className="text-xs font-mono text-gray-500">ID: {userId}</span>
                                  <span className="text-sm font-medium truncate">
                                    {user?.name || 'User not found'}
                                  </span>
                                </div>
                                {user?.email && (
                                  <div className="mt-1">
                                    <span className="text-xs text-gray-500 truncate">{user.email}</span>
                                  </div>
                                )}
                              </div>
                              <button 
                                onClick={() => handleDeleteClick(userId)}
                                className="text-red-500 hover:text-red-700 p-1"
                                disabled={isLoading}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No users assigned to this role
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Please select a role
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                  Confirm Role Removal
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to remove the role from <strong>{userToRemove?.userName}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelRemoveRole}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveRole}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? 'Removing...' : 'Remove Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
 </>
 );
}