"use client";

import { useEffect, useRef, useState } from 'react';
import styles from '../CXO/CXO.module.css';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { ChartData } from 'chart.js';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import Spinner from '../components/Spinner';
import { useRouter } from 'next/navigation';
import { User, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Image from 'next/image';
import loginImage from '../assets/logo.jpg';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

interface Board {
  name: string;
  is_active: boolean;
  path?: string;
}

interface MainBoard {
  main_board_id: string;
  name: string;
  boards: {
    [key: string]: Board;
  };
}

interface Prompt {
  prompt_text: string;
  id: string;
  prompt_title: string;
  prompt_content: string;
  user_name: string;
  created_at: string;
}

interface UserData {
  email: string;
  userId: string;
  userRole: string;
  userName: string;
}

export default function CXO() {
  const [navItems, setNavItems] = useState<MainBoard[]>([]);
  const [selectedMainBoardId, setSelectedMainBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [newPromptName, setNewPromptName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState("prompts");
  const [, setShowCharts] = useState(false);
  const [isRunClicked, setIsRunClicked] = useState(false);
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [userData, setUserData] = useState<UserData>({
    email: "",
    userId: "",
    userRole: "",
    userName: "",
  });
  const [isMounted, setIsMounted] = useState(false);

  interface ChartData {
    chart_type: string;
    data_format: ChartDataFormat;
    insight: string[];
  }

  interface ChartDataFormat {
    labels: string[];
    categories?: string[];
    values: number[] | number[][];
    isStacked?: boolean;
  }

  type RunResult = {
    message: string[];
    table: {
      columns: string[];
      data: string[][];
    };
    charts: ChartData[];
  };

  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  const [searchTerm, setSearchTerm] = useState("");

  const [filteredPrompt, setFilteredPrompt] = useState<Prompt[]>([]);


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; // For Next.js
    // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // For Create React App
    
    const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || ''; 

  // Add this useEffect to filter prompts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPrompt(prompts);
    } else {
      const query = searchTerm.toLowerCase();
      const filtered = prompts.filter(prompt =>
        (prompt.prompt_title && prompt.prompt_title.toLowerCase().includes(query)) ||
        (prompt.prompt_text && prompt.prompt_text.toLowerCase().includes(query))
      );
      setFilteredPrompt(filtered);
    }
  }, [prompts, searchTerm]);

  const filteredPrompts = prompts.filter(prompt =>
    prompt.prompt_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prompt.user_name && prompt.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  // Set mounted state to true after component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load user data from storage after component mounts
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    try {
      // First try to get from sessionStorage (email/password login)
      const sessionData = sessionStorage.getItem('currentUserData');
      if (sessionData) {
        const parsedData = JSON.parse(sessionData);
        setUserData({
          email: parsedData.email || "",
          userId: parsedData.userId || "",
          userRole: parsedData.userRole || "",
          userName: parsedData.userName || "",
        });
        return;
      }

      // Fallback to localStorage (OTP login)
      const localStorageData = {
        email: localStorage.getItem('loggedInUserEmail') || "",
        userId: localStorage.getItem('loggedInUserId') || "",
        userRole: localStorage.getItem('loggedInUserRole') || "",
        userName: localStorage.getItem('loggedInUserName') || "",
      };

      if (localStorageData.userId) {
        setUserData(localStorageData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [isMounted]);

  // Fetch main boards from the API
  useEffect(() => {
    if (!isMounted || !userData.userId) return;

    const fetchNavItems = async () => {
      try {
        setLoading(true);
        console.log('Fetching nav items for user:', userData.userId);

        const response = await fetch(
          `${API_BASE_URL}/main-boards/get_all_info_tree?user_id=${userData.userId}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              "X-API-Key": EXCEL_API_KEY
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setNavItems(data);
        } else {
          console.error('Failed to fetch main boards and boards:', response.statusText);
          setError(`Failed to fetch data: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching main boards and boards:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNavItems();
  }, [isMounted, userData.userId]);

  // Handle click outside dropdown
  useEffect(() => {
    if (!isMounted) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMounted]);

  const handleRunPrompt = async () => {
    setIsLoading(true);
    setIsRunClicked(true);

    if (!newPromptName?.trim()) {
      console.error("Error: Prompt cannot be empty");
      alert("Please enter a valid prompt.");
      setIsLoading(false);
      return;
    }

    if (!selectedBoardId) {
      console.error("Error: Board ID is missing");
      alert("Board ID is required to run the prompt.");
      setIsLoading(false);
      return;
    }

    try {
      const url = new URL(
        `${API_BASE_URL}/main-boards/boards/prompts/run_prompt_v3?`
      );

      url.searchParams.append("input_text", newPromptName.trim());
      url.searchParams.append("board_id", selectedBoardId);
      url.searchParams.append("user_name", userData.userName || "Unknown User");
      url.searchParams.append("use_cache", "true");

      console.log("Making request to:", url.href);

      const response = await axios.post(
        url.href,
        {
          input_text: newPromptName.trim(),
          board_id: selectedBoardId,
          user_name: userData.userName || "Unknown User",
          use_cache: true,
        },
        {
          headers: {
          "X-API-Key": EXCEL_API_KEY
          },
        }
      );

      if (response?.data) {
        console.log("Prompt run successfully:", response.data);
        setRunResult(response.data);

        if (response.data.message?.length > 0) {
          setActiveTab("message");
        } else if (response.data.table?.columns?.length > 0) {
          setActiveTab("table");
        } else if (response.data.charts?.length > 0) {
          setActiveTab("charts");
        }

        const chartKeywords = ["chart", "visualization"];
        const responseDetails = response.data.detail?.toLowerCase() || "";
        const shouldShowCharts =
          chartKeywords.some((keyword) =>
            newPromptName.toLowerCase().includes(keyword)
          ) ||
          chartKeywords.some((keyword) => responseDetails.includes(keyword));

        setShowCharts(shouldShowCharts);
      } else {
        console.warn("Warning: API returned no data.");
        alert("No data was returned from the server.");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Axios Error:", error.response?.data || error.message);
        alert(
          `Server Error (${error.response?.status || "Unknown"}): ${error.response?.data?.message || error.message || "An error occurred"}`
        );
      } else if (error instanceof Error) {
        console.error("Error:", error.message);
        alert(`Error: ${error.message}`);
      } else {
        console.error("Unknown Error:", error);
        alert("An unknown error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch prompts when a board is selected
  useEffect(() => {
    const fetchPrompts = async () => {
      if (!selectedBoardId) return;

      setPromptsLoading(true);
      setError(null);
      console.log("Fetching prompts for board ID:", selectedBoardId);

      try {
        const response = await fetch(
          `${API_BASE_URL}/main-boards/boards/prompts/boards/${selectedBoardId}`,
          {
            headers: {
             "X-API-Key": EXCEL_API_KEY
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(`Failed to fetch prompts: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Fetched prompts data:", data);

        if (!Array.isArray(data)) {
          console.error("Expected array but got:", typeof data);
          setPrompts([]);
          throw new Error("Invalid response format: Expected an array of prompts");
        }

        if (data.length === 0) {
          console.log("No prompts found for this board");
          setPrompts([]);
          return;
        }

        const firstItem = data[0];
        console.log("First prompt structure:", firstItem);

        setPrompts(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        console.error("Error fetching prompts:", error);
      } finally {
        setPromptsLoading(false);
      }
    };

    fetchPrompts();
  }, [selectedBoardId]);

  const handleMainBoardClick = (mainBoardId: string) => {
    setSelectedMainBoardId(mainBoardId);
  };

  const handleBackClick = () => {
    setActiveTab("prompts");
    setSelectedMainBoardId(null);
  };

  const handleBoardClick = (boardId: string) => {
    setActiveTab("prompts");
    setSelectedBoardId(boardId);
    setShowBoardModal(true);
  };

  const handleCloseBoardModal = () => {
    setShowBoardModal(false);
    setSelectedBoardId(null);
    setActiveTab("prompts");
    setSelectedPrompt(null);
    setNewPromptName('');
    setIsRunClicked(false);
  };

  const handleViewPromptsClick = () => {
    setShowPromptsModal(true);
  };

  const handleClosePromptsModal = () => {
    setShowPromptsModal(false);
    setCurrentPromptIndex(0);
    setSearchTerm('');
  };

  const handlePromptClick = (prompt: Prompt) => {
    setNewPromptName(prompt.prompt_text);
    setShowPromptsModal(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNextPrompt = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
    }
  };

  const handlePreviousPrompt = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(currentPromptIndex - 1);
    }
  };

  const selectedMainBoard = navItems.find(
    (item) => item.main_board_id === selectedMainBoardId
  );

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('currentUserData');
      localStorage.removeItem('loggedInUserEmail');
      localStorage.removeItem('loggedInUserId');
      localStorage.removeItem('loggedInUserRole');
      localStorage.removeItem('loggedInUserName');
      localStorage.removeItem('client_user_id');
    }
    router.push('/');
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleRePrompt = async () => {
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/main-boards/boards/prompts/re_prompt`,
        null,
        {
          params: {
            input_text: newPromptName,
            board_id: selectedBoardId,
          },
          headers: {
           "X-API-Key": EXCEL_API_KEY
          },
        }
      );

      console.log('API Response:', response.data);

      const fetchedPromptName = response.data.newPromptName || response.data;
      setNewPromptName(fetchedPromptName);

      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios Error:', error.response?.data || error.message);
        alert(
          `Server Error (${error.response?.status || 'Unknown'}): ${error.response?.data?.message || error.message || 'An error occurred'}`
        );
      } else if (error instanceof Error) {
        console.error('Error:', error.message);
        alert(`Error: ${error.message}`);
      } else {
        console.error('Unknown Error:', error);
        alert('An unknown error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading until component is mounted and user data is loaded
  if (!isMounted || loading) {
    return <div>Loading...</div>;
  }

  // Show error if user is not authenticated
  if (!userData.userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="mb-4">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const getPieData = (chartData: ChartData) => {
    if (!chartData || !chartData.data_format) {
      console.log("No chart data found.");
      return {
        labels: [],
        datasets: [{ data: [], backgroundColor: [] }],
      };
    }

    const { labels, values } = chartData.data_format;

    return {
      labels,
      datasets: [
        {
          data: values as number[],
          backgroundColor: labels.map(() => getRandomColor()),
        },
      ],
    };
  };

  const getChartData = (chartData: ChartData, type: "bar" | "line") => {
    if (!chartData || !chartData.data_format) {
      console.log("No chart data found.");
      return {
        labels: [],
        datasets: [],
      };
    }

    const { labels, categories, values } = chartData.data_format;

    return {
      labels,
      datasets: (categories || []).map((category, index) => ({
        label: category,
        data: (values as number[][]).map((value) => value[index]),
        backgroundColor: getRandomColor(),
      })),
    };
  };

  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return hsl(hue, 70, 60);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - BIGGER LOGO */}
      <div className={`hidden md:block bg-gray-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-center">
          {isSidebarOpen ? (
            <Image
              src={loginImage}
              alt="Logo"
              width={220}
              height={220}
              className="rounded-md"
            />
          ) : (
            <Image
              src={loginImage}
              alt="Logo"
              width={64}
              height={64}
              className="rounded-md"
            />
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile Sidebar - BIGGER LOGO */}
      <div className={`md:hidden fixed top-0 left-0 h-full bg-gray-200 z-50 transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-72`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Image
              src={loginImage}
              alt="Logo"
              width={180}
              height={180}
              className="rounded-md"
            />
            <button onClick={toggleSidebar} className="p-2">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="mt-8 space-y-2">
            <a 
              href="/Dashboard" 
              className="block py-3 px-4 text-blue-700 hover:bg-gray-300 rounded"
              onClick={toggleSidebar}
            >
              Consultant Role
            </a>
            <a 
              href="/CXO" 
              className="block py-3 px-4 text-blue-700 hover:bg-gray-300 rounded"
              onClick={toggleSidebar}
            >
              CXO Role
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-red-400 rounded text-white text-left"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-200 py-3 px-4 flex justify-between items-center shadow-md">
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={toggleSidebar}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center gap-4">
              <a href="/Dashboard" className="text-blue-700 text-sm hover:underline">
                Consultant Role
              </a>
              <a href="/CXO" className="text-blue-700 text-sm hover:underline">
                CXO Role
              </a>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex-1 flex justify-center">
            <button
              onClick={toggleMobileMenu}
              className="text-blue-700 text-sm font-medium"
            >
              Menu
            </button>
          </div>

          {/* Desktop Logout */}
          <div className="hidden md:block">
            <button
              onClick={handleLogout}
              className="py-2 px-4 bg-blue-600 hover:bg-red-400 rounded text-white text-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          <div className={styles.dashboardContainer}>
            {!selectedMainBoardId ? (
              <div className={styles.mainboards}>
                {navItems.map((item) => (
                  <div
                    key={item.main_board_id}
                    className={styles.card}
                    onClick={() => handleMainBoardClick(item.main_board_id)}
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            ) : (
              selectedMainBoard && (
                <div className={styles.boardsContainer}>
                  <div className={styles.breadcrumbContainer}>
                    <span
                      className={styles.breadcrumbLink}
                      onClick={handleBackClick}
                    >
                      Home
                    </span>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <span className={styles.breadcrumbCurrent}>
                      {selectedMainBoard.name}
                    </span>
                  </div>

                  <div className={styles.boardsRow}>
                    {Object.keys(selectedMainBoard.boards)
                      .filter((boardId) => selectedMainBoard.boards[boardId].is_active)
                      .map((boardId) => (
                        <div
                          key={boardId}
                          className={styles.card}
                          onClick={() => handleBoardClick(boardId)}
                        >
                          {selectedMainBoard.boards[boardId].name}
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>


          {/* Board Modal (First Modal) */}
          {showBoardModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <div className={styles.modalHeader}>
                  <h3>Run Your Prompt</h3>
                  <button
                    className={styles.closeButton}
                    onClick={handleCloseBoardModal}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.modalContent}>
                  {/* Input Field */}
                  <textarea
                    className={styles.inputField}
                    placeholder="Dynamic Prompt Entry..."
                    value={newPromptName}
                    rows={8}
                    ref={textareaRef}
                    onChange={(e) => setNewPromptName(e.target.value)}
                  />

                  {/* Action Buttons */}
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      // className={styles.viewPromptsButton}
                      onClick={handleViewPromptsClick}
                    >
                      View Prompts
                    </button>
                    {/* <button
                  onClick={handleRunPrompt}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  disabled={!newPromptName.trim() || isLoading}
                >
                  {isLoading ? "Running..." : "Run"}
                </button> */}
                    <button
                      onClick={handleRePrompt}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      disabled={isLoading} // Disable the button while loading
                    >
                      Reprompt {isLoading && <Spinner />}
                    </button>
                    <button
                      onClick={handleRunPrompt}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      disabled={!newPromptName.trim() || isLoading}
                    >
                      {isLoading ? "Running..." : "Run"}
                    </button>
                  </div>


                  {isRunClicked && runResult && (
                    <div className="run-results mt-6">
                      {/* Tab buttons for navigation */}
                      <div className="tabs flex justify-end space-x-2 mb-4">
                        {['message', 'table', 'charts'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`tab-button px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>

                      {/* Tab Content */}
                      <div className="tab-content max-h-[60vh] overflow-y-auto">
                        {activeTab === 'message' && (
                          <div className="message-tab">
                            {runResult?.message && runResult.message.length > 0 ? (
                              <div>
                                <h4 className="font-medium text-lg">Message:</h4>
                                <p>{runResult.message[0]}</p>
                              </div>
                            ) : (
                              <p>No message found.</p>
                            )}
                          </div>
                        )}

                        {activeTab === 'table' && runResult.table && (
                          <div className="table-tab">
                            {runResult?.table && runResult.table.columns?.length > 0 ? (
                              <div className="mt-4">
                                {/* <button
                                          onClick={downloadExcel}
                                          className="mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                          Download as excel
                                        </button> */}
                                {/* <h4 className="font-medium text-lg">Table Data:</h4> */}
                                <div className="max-h-94 overflow-y-auto border border-gray-300 rounded">
                                  <table className="min-w-full table-auto">
                                    <thead>
                                      <tr>
                                        {runResult.table.columns.map((col, idx) => (
                                          <th key={idx} className="p-2 border-b text-left">
                                            {col}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {runResult.table.data.length > 0 ? (
                                        runResult.table.data.map((row, rowIdx) => (
                                          <tr key={rowIdx}>
                                            {row.map((cell, cellIdx) => (
                                              <td key={cellIdx} className="p-2 border-b">
                                                {cell}
                                              </td>
                                            ))}
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td
                                            colSpan={runResult.table.columns.length}
                                            className="text-center p-2"
                                          >
                                            No data available.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <p>No table data found.</p>
                            )}
                          </div>
                        )}

                        {activeTab === 'charts' && runResult.charts && (
                          <div className="charts-tab">
                            {/* <button
                                      onClick={downloadPPT}
                                      className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md"
                                    >
                                      Download as PPT
                                    </button> */}
                            {/* <p className="text-center">Charts will be displayed here.</p> */}

                            {/* Flex container for charts */}
                            <div className="my-4 flex flex-wrap justify-center gap-6">
                              {runResult.charts.map((chart: ChartData, index: number) => {
                                switch (chart.chart_type) {
                                  case 'pie':
                                    return (
                                      <div key={index} className="w-full max-w-[400px] flex-1 chart-container">
                                        <h5 className="text-lg font-semibold text-center">Pie Chart</h5>
                                        <div style={{ height: "400px" }}>
                                          <Pie data={getPieData(chart)}
                                            options={{
                                              maintainAspectRatio: false,
                                              plugins: { legend: { display: true, position: "top" } }
                                            }}
                                          />
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                                          <h6 className="text-md font-semibold mb-2">Insights:</h6>
                                          <ul className="list-disc list-inside">
                                            {chart.insight.map((insight, insightIndex) => (
                                              <li key={insightIndex} className="text-sm">
                                                {insight}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    );
                                  case 'bar':
                                    return (
                                      <div key={index} className="w-full max-w-[500px] flex-1 chart-container">
                                        <h5 className="text-lg font-semibold text-center">Bar Chart</h5>
                                        <div style={{ height: "400px" }}>
                                          <Bar
                                            data={getChartData(chart, 'bar')}
                                            options={{
                                              maintainAspectRatio: false,
                                              plugins: { legend: { display: true, position: "top" } },
                                              scales: { y: { beginAtZero: true } },
                                            }}
                                          />
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                                          <h6 className="text-md font-semibold mb-2">Insights:</h6>
                                          <ul className="list-disc list-inside">
                                            {chart.insight.map((insight, insightIndex) => (
                                              <li key={insightIndex} className="text-sm">
                                                {insight}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    );
                                  case 'line':
                                    return (
                                      <div key={index} className="w-full max-w-[500px] flex-1 chart-container">
                                        <h5 className="text-lg font-semibold text-center">Line Chart</h5>
                                        <div style={{ height: "400px" }}>
                                          <Line
                                            data={getChartData(chart, 'line')}
                                            options={{
                                              maintainAspectRatio: false,
                                              plugins: { legend: { display: true, position: "top" } },
                                              scales: { y: { beginAtZero: true } },
                                            }}
                                          />
                                        </div>
                                        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                                          <h6 className="text-md font-semibold mb-2">Insights:</h6>
                                          <ul className="list-disc list-inside">
                                            {chart.insight.map((insight, insightIndex) => (
                                              <li key={insightIndex} className="text-sm">
                                                {insight}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    );
                                  default:
                                    return null;
                                }
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Prompts Modal (Second Modal) */}
          {showPromptsModal && (
            <div className={styles.modalOverlay}>
              <div className={`${styles.promptsModal} ${styles.slideInLeft}`}>
                <div className={styles.modalHeader}>
                  {/* <h3>Prompts</h3> */}

                  <button
                    className={styles.closeButton}
                    onClick={handleClosePromptsModal}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.modalContent}>
                  {/* Search Bar in Header */}
                  <div className={styles.searchContainer}>
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={styles.searchInput}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className={styles.clearSearchButton}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {promptsLoading ? (
                    <div className={styles.loadingOverlay}>
                      <div className={styles.spinner}></div>
                    </div>
                  ) : error ? (
                    <div className={styles.error}>{error}</div>
                  ) : filteredPrompt.length === 0 ? (
                    <div className={styles.noResults}>
                      {searchTerm ? `No prompts found for "${searchTerm}"` : "No prompts found for this board."}
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className={styles.clearSearchLink}
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className={styles.promptContainer}>
                      {/* Search Results Info */}
                      {searchTerm && (
                        <div className={styles.searchResultsInfo}>
                          <span>Found {filteredPrompt.length} prompt{filteredPrompt.length !== 1 ? 's' : ''} for "{searchTerm}"</span>
                          <button
                            onClick={() => setSearchTerm('')}
                            className={styles.clearSearchLink}
                          >
                            Clear search
                          </button>
                        </div>
                      )}

                      {/* Scrollable Prompts List */}
                      <div className={styles.scrollablePrompts}>
                        {filteredPrompts.map((prompt: Prompt, index: number) => (
                          <div
                            key={prompt.id || index}
                            className={styles.promptCard}
                            onClick={() => handlePromptClick(prompt)}
                          >
                            <div className={styles.promptNumber}>
                              {index + 1}. {/* Display the prompt number */}
                            </div>
                            <h4>{prompt.prompt_title}</h4>
                            <p>{prompt.prompt_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompts Modal */}
          {showPromptsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-white border-b p-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Prompts</h3>
                  <button
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                    onClick={handleClosePromptsModal}
                  >
                    ×
                  </button>
                </div>
                
                <div className="p-4">
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full p-2 pr-10 border rounded-md"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {promptsLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : error ? (
                    <div className="text-red-500 text-center p-4">{error}</div>
                  ) : filteredPrompt.length === 0 ? (
                    <div className="text-center text-gray-500 p-4">
                      {`searchTerm ? No prompts found for "${searchTerm}" : "No prompts found for this board."`}
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="block mx-auto mt-2 text-blue-600 hover:underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPrompts.map((prompt: Prompt, index: number) => (
                        <div
                          key={prompt.id || index}
                          className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handlePromptClick(prompt)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-gray-600 flex-shrink-0">
                              {index + 1}.
                            </span>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 mb-1">
                                {prompt.prompt_title}
                              </h4>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {prompt.prompt_text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function hsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
