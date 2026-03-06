// container with data sources and info object

'use client';

import { useState, useEffect, SetStateAction, useRef, ReactNode, useCallback } from "react";
import PptxGenJS from "pptxgenjs";
import { useSearchParams } from "next/navigation";
import { FaPlay, FaPen, FaTrash, FaEdit, FaCheck, FaBan } from "react-icons/fa";
import { FaFileUpload, FaCaretUp, FaCaretDown, FaUpload, FaTimes, FaComment, FaBars } from 'react-icons/fa';
import axios from "axios";
import React from "react";
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { PencilIcon, TrashIcon, PlusIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon, Edit } from 'lucide-react';
import { Pie, Bar, Line } from "react-chartjs-2";
import { MdArrowDropDown, MdArrowDropUp } from 'react-icons/md';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import Spinner from "../components/Spinner";
import { FiSave } from "react-icons/fi";
import { toast } from "react-toastify";
import styles from "../CXO/CXO.module.css";
import ExcelTableComponent from "../components/ExcelTableComponent";
import TimelineSettings from "../components/TimelineSettings";
import ParameterSettings from "../components/ParameterSettings";
import { usePathname } from 'next/navigation';
import TallySetting from "../components/TallySetting";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Prompt = {
  output_type: string;
  name: string;
  filename: string;
  created_by: string;
  id: string;
  prompt_text: string;
  user_name?: string;
  prompt_title: string;
  created_at: Date | string;
  updated_at: Date | string;
  data_source_id?: number;
  dataset_name?: string;
};

type RunResult = {
  message?: string[];
  table?: {
    columns: string[];
    data: string[][];
  };
  detail?: string;
};

interface Item {
  id?: string;
  name?: string;
  configuration_details: Record<string, string>;
}

interface ChartDataFormat {
  labels: string[];
  categories?: string[];
  values: number[] | number[][];
  isStacked?: boolean;
}

interface ChartData {
  chart_type: string;
  data_format: ChartDataFormat;
  insight: string[];
}

interface MasterDataItem {
  id: string;
  fieldName: string;
  fieldDescription: string;
  fieldType: string;
  fieldLength: string;
  fieldValue: string;
}

interface MasterDataTable {
  id: string;
  table_name: string;
  description: string;
}

type DocumentationColumn = {
  column_name: string;
  description: string;
};

type DocumentationItem = {
  id: string;
  data_source_id: number;
  source_name: string;
  source_type: string;
  columns: DocumentationColumn[];
};

interface PromptComment {
  id: number;
  comment_text: string;
  prompt_id: number;
  user_id: number | null;
  user_name: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export default function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const boardId = searchParams.get("board_id");
  const [promptOutputTypes, setPromptOutputTypes] = useState<Record<string, 'C' | 'T' | 'CT'>>({});
  const [isDropdownOpenn, setIsDropdownOpenn] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [, setLoading] = useState(false);
  const [, setShowCharts] = useState(false);
  type TableRow = {
    approval_status: 'pending' | 'approved' | 'rejected';
    id: string;
    table_name: string;
    table_description: string;
    files: {
      approval_status: 'pending' | 'approved' | 'rejected';
      id: string;
      month_year: string;
      filename: string;
      created_at: string;
    }[];
  };

  const [rows, setRows] = useState<TableRow[]>([]);
  const [newPromptName, setNewPromptName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModallOpen, setIsModallOpen] = useState(false);
  type RunResult = {
    data: any;
    message: string[];
    table: {
      columns: string[];
      data: string[][];
    };
    charts: ChartData[];
  };

  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view,] = useState("manage-tables");
  const [isRunClicked, setIsRunClicked] = useState(false);
  const [hasReprompted, setHasReprompted] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [formData, setFormData] = useState({ tableName: "", tableDescription: "" });
  const [editPromptId, setEditPromptId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [, setLoadingPromptPlay] = useState<string | null>(null);
  const [loadingPromptsRepository,] = useState(false);
  const [activeTab, setActiveTab] = useState("prompts");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<TableRow | null>(null);
  const [, setDocId] = useState<string | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editRowKey, setEditRowKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Record<string, string>>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isUploadModalOpenMaster, setUploadModalOpenMaster] = useState(false);
  const [selectedFileMaster, setSelectedFileMaster] = useState<File | null>(null);
  const [itemss, setItemss] = useState<MasterDataItem[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [tableNameMaster, setTableNameMaster] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValuess, setEditValuess] = useState<Partial<MasterDataItem>>({});
  const [showTableModal, setShowTableModal] = useState(false);
  const [tables, setTables] = useState<MasterDataTable[]>([]);
  const [newTable, setNewTable] = useState({ table_name: '', description: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTable, setEditingTable] = useState<MasterDataTable | null>(null);
  const [editTableData, setEditTableData] = useState({ table_name: '', description: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  type MasterDataTable = { id: string; table_name: string; description?: string };
  const [settingsToDelete, setSettingsToDelete] = useState<MasterDataTable | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dropDownOpen, setDropDownOpen] = useState<Record<string, boolean>>({});
  const [loadingg, setLoadingg] = useState(false);
  const [errorr, setErrorr] = useState<string | null>(null);
  const [rowss, setRowss] = useState<MasterDataItem[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ email: '', subject: '', message: '', tableOption: 'limited', reportType: '' });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    rowToDelete: TableRow | null;
  }>({ isOpen: false, rowToDelete: null });

  const [isViewTablesModalOpen, setIsViewTablesModalOpen] = useState(false);
  const [pgTables, setPgTables] = useState<any[]>([]);
  const [pgTablesLoading, setPgTablesLoading] = useState(false);
  const [pgDbInfo, setPgDbInfo] = useState<{ database_name: string; table_count: number } | null>(null);
  const [searchTermRepository, setSearchTermRepository] = useState("");
  const [isSavingInfoObject, setIsSavingInfoObject] = useState(false);
  const [isDeletingInfoObject, setIsDeletingInfoObject] = useState(false);

  const filteredRepositoryPrompts = prompts.filter(prompt =>
    prompt.prompt_text.toLowerCase().includes(searchTermRepository.toLowerCase()) ||
    (prompt.user_name && prompt.user_name.toLowerCase().includes(searchTermRepository.toLowerCase()))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPrompt, setFilteredPrompt] = useState<Prompt[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApprovalItem, setSelectedApprovalItem] = useState<{
    type: 'table' | 'file';
    id: string;
    tableId?: string;
    name: string;
  } | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
  const [selectedPgTable, setSelectedPgTable] = useState<any | null>(null);
  const [showAddDataSourceModal, setShowAddDataSourceModal] = useState(false);
  const [addDataSourceForm, setAddDataSourceForm] = useState({ source_name: "", description: "", row_limit: 100000 });
  const [isAddingDataSource, setIsAddingDataSource] = useState(false);
  const [data, setData] = useState<DocumentationItem[]>([]);
  const [dataFiltered, setDataFiltered] = useState<DocumentationItem[]>([]);
  const [deleteDataSourceConfirm, setDeleteDataSourceConfirm] = useState<{ isOpen: boolean; source: any | null }>({ isOpen: false, source: null });
  const [isDeletingDataSource, setIsDeletingDataSource] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

  const handleDeleteDataSource = async () => {
    if (!deleteDataSourceConfirm.source) return;
    if (typeof window === 'undefined') return;
    let userId: string | null = null;
    const currentUserData = sessionStorage.getItem("currentUserData");
    if (currentUserData) {
      try { const parsed = JSON.parse(currentUserData); userId = String(parsed.userId); } catch (e) { }
    }
    if (!userId) { alert("User session not found."); return; }
    setIsDeletingDataSource(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/data-sources/${deleteDataSourceConfirm.source.id}?user_id=${parseInt(userId, 10)}`,
        { method: "DELETE", headers: { accept: "application/json", "X-API-Key": EXCEL_API_KEY } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to delete");
      toast.success(`Data source deleted! ${data.remaining_sources} remaining.`);
      fetchDataSources();
      setDeleteDataSourceConfirm({ isOpen: false, source: null });
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsDeletingDataSource(false);
    }
  };

  const handleAddPgTableAsDataSource = async () => {
    if (!selectedPgTable) return;
    if (typeof window === 'undefined') return;
    let userId: string | null = null;
    const currentUserData = sessionStorage.getItem("currentUserData");
    if (currentUserData) {
      try { const parsed = JSON.parse(currentUserData); userId = String(parsed.userId); } catch (e) { }
    }
    if (!userId) { alert("User session not found."); return; }
    setIsAddingDataSource(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/data-sources/board/${boardId}/add-pg?user_id=${parseInt(userId, 10)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json", "X-API-Key": EXCEL_API_KEY },
          body: JSON.stringify({
            table_name: selectedPgTable.table_name,
            source_name: addDataSourceForm.source_name,
            description: addDataSourceForm.description,
            row_limit: addDataSourceForm.row_limit,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || "Failed to add data source");
      toast.success(`Table "${selectedPgTable.table_name}" added as data source! (Slot ${data.slot_number}/${data.total_slots})`);
      fetchDataSources();
      setShowAddDataSourceModal(false);
      setSelectedPgTable(null);
      setAddDataSourceForm({ source_name: "", description: "", row_limit: 100000 });
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsAddingDataSource(false);
    }
  };

  const fetchDataSources = async () => {
    if (typeof window === 'undefined') return;
    let userId: string | null = null;
    const currentUserData = sessionStorage.getItem("currentUserData");
    if (currentUserData) {
      try { const parsed = JSON.parse(currentUserData); userId = String(parsed.userId); } catch (e) { }
    }
    if (!userId || !boardId) return;
    setDataSourcesLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/data-sources/board/${boardId}?user_id=${parseInt(userId, 10)}`,
        { headers: { accept: "application/json", "X-API-Key": EXCEL_API_KEY } }
      );
      if (!response.ok) throw new Error("Failed to fetch data sources");
      const data = await response.json();
      setDataSources(data);
    } catch (error) {
      console.error("Failed to fetch data sources:", error);
    } finally {
      setDataSourcesLoading(false);
    }
  };

  useEffect(() => {
    if (boardId) fetchDataSources();
  }, [boardId]);

  const getDatasetName = (prompt: Prompt): string | null => {
    if (prompt.dataset_name) return prompt.dataset_name;
    if (prompt.data_source_id && dataSources.length > 0) {
      const match = dataSources.find(ds => ds.id === prompt.data_source_id || ds.data_source_id === prompt.data_source_id);
      if (match) return match.source_name || match.name;
    }
    return null;
  };

  const downloadPromptsAsTXT = () => {
    const promptsToDownload = searchTerm ? filteredPrompts : prompts;
    if (promptsToDownload.length === 0) { toast.error("No prompts to download"); return; }
    let textContent = "PROMPTS EXPORT\n";
    textContent += `Exported on: ${new Date().toLocaleString()}\n`;
    textContent += `Total Prompts: ${promptsToDownload.length}\n`;
    textContent += "=".repeat(80) + "\n\n";
    promptsToDownload.forEach((prompt) => {
      textContent += `Prompt Text: ${prompt.prompt_text}\n`;
      textContent += "\n" + "=".repeat(80) + "\n\n";
    });
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompts_board_${boardId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${promptsToDownload.length} prompts as TXT!`);
    setShowExportModal(false);
  };

  const handleSubmitMultipleFiles = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!selectedDate || selectedFiles.length === 0) { alert('Please select both date and files'); return; }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('month_year', selectedDate);
      selectedFiles.forEach((file) => { formData.append('file', file); });
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/data-management-table/status/upload/${selectedTableId}`,
        { method: 'POST', headers: { 'Accept': 'application/json', 'X-API-Key': EXCEL_API_KEY }, body: formData }
      );
      if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      alert('Files uploaded successfully!');
      handleCloseUploadModal();
    } catch (error) {
      alert('An unknown error occurred. Please try again later.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewTables = async () => {
    if (typeof window === 'undefined') return;
    let userId: string | null = null;
    const currentUserData = sessionStorage.getItem("currentUserData");
    if (currentUserData) {
      try { const parsed = JSON.parse(currentUserData); userId = String(parsed.userId); } catch (e) { }
    }
    if (!userId) { alert("User session not found."); return; }
    setPgTablesLoading(true);
    setIsViewTablesModalOpen(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/data-sources/pg-tables/${boardId}?user_id=${parseInt(userId, 10)}`,
        { headers: { accept: "application/json", "X-API-Key": EXCEL_API_KEY } }
      );
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setPgTables(data.tables || []);
      setPgDbInfo({ database_name: data.database_name, table_count: data.table_count });
    } catch (error) {
      setPgTables([]);
    } finally {
      setPgTablesLoading(false);
    }
  };

  const downloadPromptsAsCSV = () => {
    const promptsToDownload = searchTerm ? filteredPrompts : prompts;
    if (promptsToDownload.length === 0) { toast.error("No prompts to download"); return; }
    const headers = ['No.', 'Prompt Text', 'Created By', 'Created At', 'Updated At'];
    const rows = promptsToDownload.map((prompt, index) => [
      index + 1,
      `"${prompt.prompt_text.replace(/"/g, '""')}"`,
      `"${(prompt.user_name || prompt.created_by || 'Unknown').replace(/"/g, '""')}"`,
      new Date(prompt.created_at).toLocaleString(),
      new Date(prompt.updated_at).toLocaleString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompts_board_${boardId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${promptsToDownload.length} prompts as CSV!`);
    setShowExportModal(false);
  };

  const handleImportPrompts = async () => {
    if (!importFile) { toast.error("Please select a file to import"); return; }
    if (!boardId) { toast.error("Board ID is missing"); return; }
    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      let promptsToImport: { prompt_text: string; prompt_title?: string }[] = [];
      if (!importFile.name.endsWith('.csv')) {
        const sections = fileContent.split('='.repeat(80));
        promptsToImport = sections.slice(1).filter(section => section.trim()).map(section => {
          const titleMatch = section.match(/\d+\.\s*(.*?)\n/);
          const textMatch = section.match(/Prompt Text:\s*(.*?)\n/);
          if (textMatch) return { prompt_title: titleMatch ? titleMatch[1].trim() : 'Imported Prompt', prompt_text: textMatch[1].trim() };
          return null;
        }).filter((p): p is { prompt_text: string; prompt_title: string } => p !== null);
      }
      if (promptsToImport.length === 0) { toast.error("No valid prompts found"); setIsImporting(false); return; }
      let loggedInUserName = localStorage.getItem('loggedInUserName') || 'Unknown User';
      let successCount = 0, failCount = 0;
      for (const prompt of promptsToImport) {
        try {
          const response = await fetch(`${API_BASE_URL}/main-boards/boards/prompts/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY },
            body: JSON.stringify({ board_id: boardId, prompt_text: prompt.prompt_text, prompt_title: prompt.prompt_title || 'Imported Prompt', prompt_out: "out_string", user_name: loggedInUserName, created_by: loggedInUserName }),
          });
          if (response.ok) { const newPrompt = await response.json(); setPrompts(prev => [...prev, newPrompt]); successCount++; } else failCount++;
        } catch (error) { failCount++; }
      }
      setIsImporting(false);
      setImportFile(null);
      if (successCount > 0) toast.success(`Successfully imported ${successCount} prompt${successCount > 1 ? 's' : ''}!`);
      if (failCount > 0) toast.warning(`Failed to import ${failCount} prompt${failCount > 1 ? 's' : ''}`);
    } catch (error) {
      toast.error("Failed to read the import file");
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) setFilteredPrompt(prompts);
    else {
      const query = searchTerm.toLowerCase();
      setFilteredPrompt(prompts.filter(prompt =>
        (prompt.prompt_title && prompt.prompt_title.toLowerCase().includes(query)) ||
        (prompt.prompt_text && prompt.prompt_text.toLowerCase().includes(query))
      ));
    }
  }, [prompts, searchTerm]);

  const filteredPrompts = prompts.filter(prompt =>
    prompt.prompt_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (prompt.user_name && prompt.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTablesByApproval = rows.filter(row => {
    if (approvalFilter === 'all') return true;
    return row.approval_status === approvalFilter;
  });

  const [user, setUser] = useState({ name: "", email: "", id: "", role: "" });

  useEffect(() => {
    const currentUserData = sessionStorage.getItem("currentUserData");
    if (currentUserData) {
      try {
        const parsed = JSON.parse(currentUserData);
        setUser({ name: parsed.userName || "", email: parsed.email || "", id: String(parsed.userId) || "", role: parsed.userRole || "" });
      } catch (e) { }
    }
  }, []);

  const toggleDropdown = () => setShowDropdown(!showDropdown);
  const toggleDropdowns = (id: SetStateAction<string | null>) => setIsDropdownOpenn(isDropdownOpenn === id ? null : id);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDirectApprove = async (type: 'table' | 'file', id: string, tableId?: string) => {
    if (typeof window === 'undefined') return;
    try {
      let endpoint;
      let userId: string | null = null;
      const currentUserData = sessionStorage.getItem("currentUserData");
      if (currentUserData) {
        try { const parsed = JSON.parse(currentUserData); userId = String(parsed.userId); } catch (e) { }
      }
      if (!userId) { alert("User session not found."); return; }
      if (type === 'table') {
        const tableRow = rows.find(r => r.id === id);
        if (!tableRow) { toast.error("Table not found"); return; }
        const loadingToast = toast.loading("Adding CSV as data source...");
        try {
          const addCsvResponse = await fetch(
            `${API_BASE_URL}/main-boards/boards/data-sources/board/${boardId}/add-csv?user_id=${parseInt(userId, 10)}`,
            { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify({ data_management_table_id: parseInt(id, 10), source_name: tableRow.table_name, description: tableRow.table_description }) }
          );
          if (!addCsvResponse.ok) { const errorData = await addCsvResponse.json(); toast.dismiss(loadingToast); toast.error(`Failed to add CSV: ${errorData.detail || "Unknown error"}`); return; }
          const csvResult = await addCsvResponse.json();
          toast.update(loadingToast, { render: "CSV added! Now approving...", type: "info", isLoading: true });
          endpoint = `${API_BASE_URL}/main-boards/boards/data-management-table/status/approve/${id}?new_approval_status=true`;
          const approveResponse = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY } });
          if (!approveResponse.ok) { const errorData = await approveResponse.json(); toast.dismiss(loadingToast); toast.error(`Failed to approve: ${errorData.message || "Unknown error"}`); return; }
          setRows(prevRows => prevRows.map(row => row.id === id ? { ...row, approval_status: 'approved' } : row));
          await fetchDataSources();
          toast.dismiss(loadingToast);
          toast.success(`✅ Info-Object approved and added to Slot ${csvResult.slot_number}/${csvResult.total_slots}!`, { autoClose: 4000 });
        } catch (error) {
          toast.dismiss(loadingToast);
          toast.error("An error occurred during approval");
        }
      } else {
        endpoint = `${API_BASE_URL}/main-boards/boards/data-management-table/status/approve/${id}?new_approval_status=true`;
        const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY } });
        if (!response.ok) { const errorData = await response.json(); toast.error(`Failed to approve: ${errorData.message || "Unknown error"}`); return; }
        setRows(prevRows => prevRows.map(row => {
          if (row.id === tableId) return { ...row, files: row.files.map(file => file.id === id ? { ...file, approval_status: 'approved' } : file) };
          return row;
        }));
        toast.success("File approved successfully!");
      }
    } catch (error) {
      toast.error("An error occurred while approving");
    }
  };

  const handleMultipleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    setSelectedFiles(files);
  };

  const generatePPTBlob = async (includeTable: boolean | undefined, tableOption: string | undefined) => {
    try {
      const params = new URLSearchParams();
      params.append('include_charts', 'true');
      params.append('include_summary', 'true');
      if (includeTable !== undefined) params.append('include_table', String(includeTable));
      if (tableOption) params.append('table_option', tableOption);
      const response = await fetch(`http://localhost:8002/client-users/generate-ppt?${params.toString()}`, {
        method: 'GET',
        headers: { "X-API-Key": "xxAJf365FZZidPt496lk9M2XDbvQCMKevOSuBgx2k6BAjp3ALe4vLTjXtcmgatoQtvsSLED3lx7zEgyHcohd1Wa2iJWTlukzQTuauvTbGYjSgMtFq5AUQLuAcMW44mp" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (error) {
      throw new Error(`PPT generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const sendViaEmail = async (includeTable: boolean | undefined, tableOption: string | undefined) => {
    try {
      const pptBlob = await generatePPTBlob(includeTable, tableOption);
      const formData = new FormData();
      formData.append('file', pptBlob, 'DataAnalysisReport.pptx');
      formData.append('email', emailData.email);
      formData.append('user_id', '0');
      formData.append('subject', emailData.subject || 'Your GBusiness AI Report');
      formData.append('message', emailData.message || 'Please find your report attached.');
      const response = await fetch('http://localhost:8002/client-users/generate-and-send-ppt', {
        method: 'POST',
        headers: { "X-API-Key": "xxAJf365FZZidPt496lk9M2XDbvQCMKevOSuBgx2k6BAjp3ALe4vLTjXtcmgatoQtvsSLED3lx7zEgyHcohd1Wa2iJWTlukzQTuauvTbGYjSgMtFq5AUQLuAcMW44mp" },
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      alert('Email sent successfully!');
    } catch (error) {
      alert(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setShowEmailModal(false);
      setShowDownloadModal(false);
    }
  };

  const downloadPrompts = () => {
    const promptsToDownload = searchTerm ? filteredPrompts : prompts;
    if (promptsToDownload.length === 0) { toast.error("No prompts to download"); return; }
    let textContent = "PROMPTS EXPORT\n";
    promptsToDownload.forEach((prompt) => { textContent += `Prompt Text: ${prompt.prompt_text}\n\n${"=".repeat(80)}\n\n`; });
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompts_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${promptsToDownload.length} prompts successfully!`);
  };

  const handlePromptClick = (prompt: Prompt) => {
    setNewPromptName(prompt.prompt_text);
    setShowPromptsModal(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleViewPromptsClick = () => setShowPromptsModal(true);
  const handleClosePromptsModal = () => { setSearchTerm(''); setShowPromptsModal(false); setCurrentPromptIndex(0); };

  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PromptComment[]>>({});
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleCommentClick = async (promptId: string) => {
    setCurrentPromptId(promptId);
    setIsCommentOpen(true);
    setEditingCommentId(null);
    setCommentText('');
    await fetchComments(promptId);
  };

  const fetchComments = async (promptId: string) => {
    try {
      setCommentsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/main-boards/boards/prompts/${promptId}/comments?order_by=created_at&order_dir=DESC`,
        { headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY } }
      );
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      const comments: PromptComment[] = Array.isArray(data) ? data : data.comments || [];
      setCommentsMap(prev => ({ ...prev, [promptId]: comments }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCloseComment = () => { setIsCommentOpen(false); setCommentText(''); setEditingCommentId(null); };
  const getCurrentPromptComments = (): PromptComment[] => { if (!currentPromptId) return []; return commentsMap[currentPromptId] || []; };

  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentPromptId) return;
    try {
      setCommentSaving(true);
      if (editingCommentId !== null) {
        const response = await fetch(
          `${API_BASE_URL}/main-boards/boards/prompts/comments/${editingCommentId}?comment_text=${encodeURIComponent(commentText)}`,
          { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY } }
        );
        if (!response.ok) throw new Error('Failed to update comment');
        const data = await response.json();
        setCommentsMap(prev => ({ ...prev, [currentPromptId]: (prev[currentPromptId] || []).map(c => c.id === editingCommentId ? data.comment : c) }));
        setEditingCommentId(null);
      } else {
        const response = await fetch(
          `${API_BASE_URL}/main-boards/boards/prompts/${currentPromptId}/comments?comment_text=${encodeURIComponent(commentText)}`,
          { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY } }
        );
        if (!response.ok) throw new Error('Failed to create comment');
        const data = await response.json();
        setCommentsMap(prev => ({ ...prev, [currentPromptId]: [data.comment ?? data, ...(prev[currentPromptId] || [])] }));
      }
      setCommentText('');
    } catch (error) {
      console.error('Error saving comment:', error);
    } finally {
      setCommentSaving(false);
    }
  };

  const handleEditComment = (commentId: number) => {
    if (!currentPromptId) return;
    const commentToEdit = commentsMap[currentPromptId]?.find(c => c.id === commentId);
    if (commentToEdit) { setCommentText(commentToEdit.comment_text); setEditingCommentId(commentId); }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!currentPromptId) return;
    try {
      setDeletingCommentId(commentId);
      const response = await fetch(`${API_BASE_URL}/main-boards/boards/prompts/comments/${commentId}`, { method: "DELETE", headers: { "X-API-Key": EXCEL_API_KEY } });
      if (!response.ok) throw new Error('Failed to delete comment');
      setCommentsMap(prev => ({ ...prev, [currentPromptId]: (prev[currentPromptId] || []).filter(c => c.id !== commentId) }));
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatDate = (date: Date | string | number) => { if (!date) return ''; return new Date(date).toLocaleString(); };
  const getCommentCount = (promptId: string): number => commentsMap[promptId]?.length || 0;
  const handleToggleDropdown = (id: SetStateAction<string | null>) => { setExpandedRow(prev => (prev === id ? null : id as string)); setIsOpen(!isOpen); };

  const [items, setItems] = useState<Item[]>([]);
  const [newItemMode, setNewItemMode] = useState<boolean>(false);
  const [isNewItemDropdownOpen, setIsNewItemDropdownOpen] = useState<boolean>(false);
  const [dropdownRows, setDropdownRows] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  const handleAddDropdownRow = () => setDropdownRows([...dropdownRows, { key: '', value: '' }]);
  const handleDropdownInputChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedRows = [...dropdownRows]; updatedRows[index][field] = value; setDropdownRows(updatedRows);
  };
  const handleDeleteDropdownItem = (index: number) => setDropdownRows(dropdownRows.filter((_, i) => i !== index));
  const handleEditDropdownItem = (index: number) => { console.log("Editing dropdown row:", index); };
  const handleAddItem = () => setNewItemMode(false);
  const handleEditItem = (id: number) => console.log(`Edit item: ${id}`);
  const handleSaveItem = (id: number) => console.log(`Save item: ${id}`);
  const handleDeleteItem = (id: number) => console.log(`Delete item: ${id}`);

  const getPieData = (chartData: ChartData) => {
    if (!chartData || !chartData.data_format) return { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
    const { labels, values } = chartData.data_format;
    return { labels, datasets: [{ data: values as number[], backgroundColor: labels.map(() => getRandomColor()) }] };
  };

  const getChartData = (chartData: ChartData, type: "bar" | "line") => {
    if (!chartData || !chartData.data_format) return { labels: [], datasets: [] };
    const { labels, categories, values } = chartData.data_format;
    return { labels, datasets: (categories || []).map((category, index) => ({ label: category, data: (values as number[][]).map((value) => value[index]), backgroundColor: getRandomColor() })) };
  };

  const getRandomColor = () => { const hue = Math.floor(Math.random() * 360); return hsl(hue, 70, 60); };

  const handleeOpenModal = () => { setIsModallOpen(true); setEditRow(null); setFormData({ tableName: "", tableDescription: "" }); };
  const handleeCloseModal = () => { setIsModallOpen(false); setEditRow(null); setFormData({ tableName: "", tableDescription: "" }); };

  const downloadExcel = () => {
    if (!runResult?.table || runResult.table.data.length === 0) { alert("No data to download."); return; }
    const ws = XLSX.utils.aoa_to_sheet([runResult.table.columns, ...runResult.table.data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Table Data");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, "table_data.xlsx");
  };

  const downloadPPT = (includeTableData = true, tableRowOption = 'limited') => {
    try {
      let ppt = new PptxGenJS();
      ppt.author = "Data Analysis Tool";
      ppt.title = "Insight Analysis Report";
      const THEME = { primary: "2B579A", secondary: "4472C4", background: "FFFFFF", text: "2F3542", headerBackground: "F2F2F2" };
      ppt.defineSlideMaster({ title: "MASTER_SLIDE", background: { color: THEME.background }, objects: [{ rect: { x: 0, y: 0, w: "100%", h: 0.6, fill: { color: THEME.primary } } }] });
      ppt.defineSlideMaster({ title: "CLEAN_MASTER_SLIDE", background: { color: THEME.background } });
      const titleSlide = ppt.addSlide({ masterName: "MASTER_SLIDE" });
      titleSlide.addText("Insights Analysis Report", { x: 0.5, y: 2.0, fontFace: "Arial", fontSize: 36, color: THEME.primary, bold: true, align: "center" });
      titleSlide.addText("Generated on " + new Date().toLocaleDateString(), { x: 0.5, y: 3.0, fontFace: "Arial", fontSize: 18, color: THEME.text, align: "center" });
      let fileName = "Analysis_Report";
      if (!includeTableData) fileName += "_Charts_Only";
      else if (tableRowOption === 'all') fileName += "_All_Data";
      else fileName += "_Limited_Data";
      fileName += ".pptx";
      ppt.writeFile({ fileName });
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  const fetchData = useCallback(async () => {
    if (!boardId || !user?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/main-boards/boards/ai-documentation/board/${boardId}/all`, {
        params: { user_id: user?.id },
        headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY },
      });
      setData(response.data.sources || []);
    } catch (error) {
      console.error("Error fetching AI documentation:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId, user?.id]);

  const fetchDataFiltered = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/main-boards/boards/ai-documentation/`, {
        headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY },
      });
      const filteredData = response.data.filter((item: { board_id: string }) => String(item.board_id) === String(boardId));
      setDataFiltered(filteredData);
    } catch (error) {
      console.error("Error fetching AI documentation:", error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (boardId) { fetchData(); fetchDataFiltered(); } else setLoading(false);
  }, [boardId, fetchData, fetchDataFiltered]);

  useEffect(() => {
    if (boardId) setLoading(true);
  }, []);

  const handleSaveFilteredClicks = async (id: string, boardId: string | null) => {
    if (!id || !boardId) return;
    try {
      const source = dataFiltered.find((s) => String(s.id) === String(id)) as any;
      if (!source) return;
      const columns: { column_name: string; description: string }[] = source.columns || Object.entries((source.configuration_details as Record<string, string>) || {}).map(([k, v]) => ({ column_name: k, description: String(v) }));
      const updatedDetails: Record<string, string> = {};
      columns.forEach((col) => { updatedDetails[col.column_name] = editValues[id]?.[col.column_name] ?? col.description; });
      const payload = { board_id: parseInt(boardId), column_count: columns.length, configuration_details: JSON.stringify(updatedDetails), data_source_id: source.data_source_id, name: source.source_name || source.name, source_type: source.source_type };
      const response = await fetch(`${API_BASE_URL}/main-boards/boards/ai-documentation/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify(payload) });
      if (!response.ok) { alert(`Error: ${JSON.stringify(await response.json())}`); return; }
      setDataFiltered(prevData => prevData.map(item => {
        if (String(item.id) !== String(id)) return item;
        const anyItem = item as any;
        const updatedConfig: Record<string, string> = {};
        columns.forEach(col => { updatedConfig[col.column_name] = editValues[id]?.[col.column_name] ?? col.description; });
        return { ...anyItem, configuration_details: updatedConfig, columns: anyItem.columns ? anyItem.columns.map((col: any) => ({ ...col, description: editValues[id]?.[col.column_name] ?? col.description })) : undefined } as any;
      }));
      setEditRowId(null); setEditRowKey(null);
      setEditValues(prev => { const updated = { ...prev }; delete updated[id]; return updated; });
      toast.success("Documentation updated successfully!");
    } catch (error) {
      alert("A network error occurred.");
    }
  };

  const handleSaveClicks = async (id: string, boardId: string | null) => {
    if (!id || !boardId) return;
    try {
      const source = data.find((s) => s.id === id);
      if (!source) return;
      const updatedDetails: Record<string, string> = {};
      source.columns.forEach((col) => { updatedDetails[col.column_name] = editValues[id]?.[col.column_name] ?? col.description; });
      const payload = { board_id: parseInt(boardId), column_count: source.columns.length, configuration_details: JSON.stringify(updatedDetails), data_source_id: source.data_source_id, name: source.source_name, source_type: source.source_type };
      const response = await fetch(`${API_BASE_URL}/main-boards/boards/ai-documentation/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify(payload) });
      if (!response.ok) { alert(`Error: ${JSON.stringify(await response.json())}`); return; }
      setData(prevData => prevData.map(item => { if (item.id !== id) return item; return { ...item, columns: item.columns.map(col => ({ ...col, description: editValues[id]?.[col.column_name] ?? col.description })) }; }));
      setEditRowId(null); setEditRowKey(null);
      setEditValues(prev => { const updated = { ...prev }; delete updated[id]; return updated; });
      toast.success("Documentation updated successfully!");
    } catch (error) {
      alert("A network error occurred.");
    }
  };

  useEffect(() => {
    const fetchTableData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/main-boards/boards/data-management-table/get_all_tables_with_files`, { headers: { "X-API-Key": EXCEL_API_KEY } });
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        const filteredData = data.filter((row: { board_id: number }) => row.board_id === parseInt(boardId!));
        setRows(filteredData);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        else setError("An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    if (view === "manage-tables" && boardId) fetchTableData();
  }, [view, boardId]);

  useEffect(() => {
    const fetchPrompts = async () => {
      if (!boardId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/main-boards/boards/prompts/boards/${boardId}`, { headers: { "X-API-Key": EXCEL_API_KEY } });
        if (!response.ok) throw new Error("Failed to fetch prompts");
        const data: Prompt[] = await response.json();
        setPrompts(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, [boardId]);

  const handleRunnPrompt = async (promptText: string, promptId?: string) => {
    setIsLoading(true);
    if (!promptText.trim()) { alert("Please enter a valid prompt."); setIsLoading(false); return; }
    if (!boardId) { alert("Board ID is required."); setIsLoading(false); return; }
    try {
      const url = new URL(`${API_BASE_URL}/main-boards/boards/prompts/run_prompt_v3?`);
      url.searchParams.append("input_text", promptText);
      url.searchParams.append("board_id", boardId);
      url.searchParams.append("user_name", "");
      url.searchParams.append("use_cache", "true");
      const response = await axios.post(url.href, { input_text: promptText, board_id: boardId, user_name: " ", use_cache: true }, { headers: { "X-API-Key": EXCEL_API_KEY } });
      if (response?.data) {
        setRunResult(response.data);
        if (promptId) {
          const hasCharts = (response.data.charts ?? []).length > 0;
          const hasTable = response.data.table?.columns?.length > 0;
          const outputType = hasCharts && hasTable ? 'CT' : hasCharts ? 'C' : hasTable ? 'T' : null;
          if (outputType) setPromptOutputTypes(prev => ({ ...prev, [promptId]: outputType }));
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) alert(`Error: ${error.response?.data?.message || error.message}`);
      else alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayClick = async (prompt: Prompt) => {
    setLoadingPromptPlay(prompt.id);
    const promptText = prompt.prompt_text;
    setSelectedPrompt(promptText);
    try {
      await handleRunnPrompt(promptText, prompt.id);
      setIsResultModalOpen(true);
      if ((runResult?.charts ?? []).length > 0) setActiveTab('charts');
      else if (runResult?.table && runResult.table.columns?.length > 0) setActiveTab('table');
      else setActiveTab('message');
    } catch (error) {
      console.error("Error running prompt", error);
    } finally {
      setLoadingPromptPlay(null);
    }
  };

  const handleOpenUploadModal = (id: SetStateAction<string | null>) => { setSelectedTableId(id); setIsUploadModalOpen(true); };
  const handleChange = (e: { target: { name: string; value: string; }; }) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRunPrompt = async () => {
    setIsLoading(true);
    setIsRunClicked(true);
    if (!newPromptName?.trim()) { alert("Please enter a valid prompt."); setIsLoading(false); return; }
    if (!boardId) { alert("Board ID is required."); setIsLoading(false); return; }
    try {
      const url = new URL(`${API_BASE_URL}/main-boards/boards/prompts/run_prompt_v3?`);
      url.searchParams.append("input_text", newPromptName.trim());
      url.searchParams.append("board_id", boardId);
      url.searchParams.append("user_name", "");
      url.searchParams.append("use_cache", "true");
      const response = await axios.post(url.href, { input_text: newPromptName.trim(), board_id: boardId, user_name: "", use_cache: true }, { headers: { "X-API-Key": EXCEL_API_KEY } });
      if (response?.data) {
        setRunResult(response.data);
        const hasCharts = (response.data.charts ?? []).length > 0;
        const hasTable = response.data.table?.columns?.length > 0;
        const hasMessage = response.data.message?.length > 0;
        if (hasCharts && hasTable) setActiveTab("charts");
        else if (hasTable) setActiveTab("table");
        else if (hasCharts) setActiveTab("charts");
        else if (hasMessage) setActiveTab("message");
        setShowCharts(chartKeywords.some(k => newPromptName.toLowerCase().includes(k)));
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) alert(`Server Error: ${error.response?.data?.message || error.message}`);
      else if (error instanceof Error) alert(`Error: ${error.message}`);
      else alert("An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const chartKeywords = ["chart", "visualization"];

  const handleRePrompt = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/main-boards/boards/prompts/re_prompt?`, null, {
        params: { input_text: newPromptName, board_id: boardId },
        headers: { 'X-API-Key': EXCEL_API_KEY },
      });
      const fetchedPromptName = response.data.newPromptName || response.data;
      setNewPromptName(fetchedPromptName);
      if (textareaRef.current) textareaRef.current.focus();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) alert(`Server Error: ${error.response?.data?.message || error.message}`);
      else alert('An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletes = async (row: TableRow) => { setDeleteConfirmation({ isOpen: true, rowToDelete: row }); };

  const confirmDelete = async () => {
    if (!deleteConfirmation.rowToDelete) return;
    const row = deleteConfirmation.rowToDelete;
    setIsDeletingInfoObject(true);
    const loadingToast = toast.loading(`Deleting "${row.table_name}"...`);
    try {
      const response = await fetch(`${API_BASE_URL}/main-boards/boards/data-management-table/${row.id}`, { method: "DELETE", headers: { "X-API-Key": EXCEL_API_KEY } });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to delete"); }
      setRows(prevRows => prevRows.filter(item => item.id !== row.id));
      toast.dismiss(loadingToast);
      toast.success(`Info-Object "${row.table_name}" deleted successfully!`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeletingInfoObject(false);
      setDeleteConfirmation({ isOpen: false, rowToDelete: null });
    }
  };

  const cancelDelete = () => setDeleteConfirmation({ isOpen: false, rowToDelete: null });

  const handleEdit = (rowId: TableRow) => { setEditRow(rowId); setFormData({ tableName: rowId.table_name, tableDescription: rowId.table_description }); setIsModallOpen(true); };
  const handleEditPrompt = (prompt: Prompt) => { setEditPromptId(prompt.id); setNewPromptName(prompt.prompt_text); setIsModalOpen(true); };

  const handleDeletePrompt = async (promptId: string) => {
    toast(({ closeToast }) => (
      <div>
        <p style={{ marginBottom: '12px', color: '#333', fontSize: '13px' }}>Are you sure you want to delete this prompt?</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => { closeToast(); performDelete(promptId); }} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
          <button onClick={closeToast} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
    ), { position: "top-center", autoClose: false, hideProgressBar: true, closeOnClick: false, pauseOnHover: true, draggable: false, closeButton: false });
  };

  const performDelete = async (promptId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/main-boards/boards/prompts/${promptId}`, { method: "DELETE", headers: { "X-API-Key": EXCEL_API_KEY } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      toast.success("Prompt deleted successfully!", { position: "top-right", autoClose: 3000 });
      setPrompts(prompts.filter(prompt => prompt.id !== promptId));
    } catch (error) {
      toast.error("Failed to delete prompt.", { position: "top-right", autoClose: 3000 });
    }
  };

  const handleSavePrompt = async () => {
    setIsLoading(true);
    if (!newPromptName.trim()) { alert("Prompt cannot be empty!"); setIsLoading(false); return; }
    if (!boardId) { alert("Error: boardId is missing."); setIsLoading(false); return; }
    let loggedInUserName = null;
    try {
      const currentUserData = sessionStorage.getItem('currentUserData');
      if (currentUserData) { const userData = JSON.parse(currentUserData); loggedInUserName = userData.userName; }
    } catch (error) { }
    if (!loggedInUserName) loggedInUserName = localStorage.getItem('loggedInUserName');
    if (!loggedInUserName || loggedInUserName.trim() === "" || loggedInUserName === "Unknown User") { alert("Error: User name is missing. Please log in again."); setIsLoading(false); return; }
    const promptData = { board_id: boardId, prompt_text: newPromptName.trim(), prompt_out: "out_string", user_name: loggedInUserName, created_by: loggedInUserName };
    const url = editPromptId ? `${API_BASE_URL}/main-boards/boards/prompts/${editPromptId}` : `${API_BASE_URL}/main-boards/boards/prompts/`;
    const method = editPromptId ? "PUT" : "POST";
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify(promptData) });
      if (!response.ok) { const errorData = await response.json(); alert(`Failed to save prompt: ${errorData.message || "Unknown error"}`); setIsLoading(false); return; }
      const newPromptData = await response.json();
      setPrompts(prevPrompts => editPromptId ? prevPrompts.map(prompt => prompt.id === editPromptId ? { ...prompt, ...newPromptData } : prompt) : [...prevPrompts, newPromptData]);
      setIsModalOpen(false);
      setNewPromptName("");
      setEditPromptId(null);
      setActiveTab("prompts");
    } catch (error) {
      alert("Network error: Failed to save the prompt.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseUploadModal = () => { setIsUploadModalOpen(false); setSelectedFiles([]); setSelectedDate(''); setSelectedTableId(null); };
  const handleChanges = (id: string, key: string, value: string) => { setEditValues(prevValues => ({ ...prevValues, [id]: { ...prevValues[id], [key]: value } })); };
  const handleDateChange = (e: { target: { value: SetStateAction<string>; }; }) => setSelectedDate(e.target.value);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!formData.tableName || formData.tableName.length > 255) { toast.error("Table Name must be between 1 and 255 characters"); return; }
    const tableData = { board_id: boardId, table_name: formData.tableName, table_description: formData.tableDescription, table_column_type_detail: "" };
    setIsSavingInfoObject(true);
    const loadingToast = toast.loading(editRow ? "Updating Info-Object..." : "Creating Info-Object...");
    try {
      const response = editRow
        ? await fetch(`${API_BASE_URL}/main-boards/boards/data-management-table/${editRow.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify(tableData) })
        : await fetch(`${API_BASE_URL}/main-boards/boards/data-management-table/create`, { method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": EXCEL_API_KEY }, body: JSON.stringify(tableData) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to save"); }
      const newTableData = await response.json();
      if (editRow) { setRows(prevRows => prevRows.map(row => row.id === editRow.id ? newTableData : row)); toast.dismiss(loadingToast); toast.success("Info-Object updated successfully!"); }
      else { setRows(prevRows => [...prevRows, newTableData]); toast.dismiss(loadingToast); toast.success("Info-Object created successfully!"); }
      setIsModallOpen(false);
      setFormData({ tableName: "", tableDescription: "" });
      setEditRow(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setIsSavingInfoObject(false);
    }
  };

  const getApprovalBadge = (status?: 'pending' | 'approved' | 'rejected') => {
    if (!status) return null;
    const badges = { pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' }, approved: { color: 'bg-green-100 text-green-800', text: 'Approved' }, rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' } };
    const badge = badges[status];
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>{badge.text}</span>;
  };

  const handleCloseModal = () => { setNewPromptName(""); setEditPromptId(null); setIsModalOpen(false); setActiveTab("prompts"); setRunResult(null); setShowCharts(false); setIsRunClicked(false); };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-200 rounded-2xl shadow-lg border border-gray-200 min-h-screen">
      {/* ── HEADER ── */}
      <header className="bg-white p-2 shadow-sm">
        <div className="flex justify-end items-center max-w-screen-xl mx-auto">
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-1.5 text-gray-700 hover:bg-gray-50 px-2.5 py-1 rounded-md transition-colors border border-gray-200 text-xs"
            >
              <span className="text-xs font-medium">
                {location.pathname === '/Container' ? 'Consultant Role' : location.pathname === '/CXO' ? 'CXO Role' : 'Select Screen'}
              </span>
              <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDropdown && (
              <div ref={dropdownRef} className="absolute right-0 mt-1.5 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <a href="/Dashboard" className={`block px-3 py-1.5 text-xs ${location.pathname === '/Container' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>Consultant Role</a>
                <a href="/CXO" className={`block px-3 py-1.5 text-xs ${location.pathname === '/CXO' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>CXO Role</a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── TAB NAV ── */}
      <div className="sticky top-0 bg-gray-200 z-10 border-b border-gray-200">
        <div className="w-full">
          <div className="max-w-[1400px] mx-auto px-3 py-1">
            <div className="bg-white rounded-lg shadow-sm p-1 mb-1 border border-gray-200">
              <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-md overflow-x-auto">
                {[
                  { key: "prompts", label: "Manage Prompts" },
                  { key: "repository", label: "Prompts Repository" },
                  { key: "tables", label: "Manage Tables" },
                  { key: "documentation", label: "AI Documentation" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-md font-medium transition-all duration-200 text-[11px] whitespace-nowrap ${activeTab === tab.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <b>{tab.label}</b>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── PROMPTS TAB ── */}
        {activeTab === "prompts" && (
          <div className="w-full">
            <div className="w-full bg-white border-b">
              <div className="max-w-[1400px] mx-auto px-3 py-1.5">
                <div className="flex flex-row gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full py-1 px-3 pr-7 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    />
                    {searchTerm ? (
                      <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      </button>
                    ) : (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                  <button className="py-1 px-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-xs font-medium whitespace-nowrap" onClick={() => setIsModalOpen(true)}>New Prompts +</button>
                  {prompts.length === 0 ? (
                    <label className="py-1 px-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs font-medium whitespace-nowrap cursor-pointer">
                      <input type="file" accept=".txt,.csv" onChange={(e) => { if (e.target.files && e.target.files.length > 0) { setImportFile(e.target.files[0]); handleImportPrompts(); } }} className="hidden" />
                      {isImporting ? 'Importing...' : 'Import Prompts'}
                    </label>
                  ) : (
                    <button className="py-1 px-2.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-xs font-medium whitespace-nowrap" onClick={() => setShowExportModal(true)}>Export Prompts</button>
                  )}
                </div>
              </div>
            </div>

            {/* ── PROMPT CARDS GRID ── */}
            <div className="w-full">
              <div className="max-w-[1400px] mx-auto px-3 py-2">
                {!isLoading && filteredPrompts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 auto-rows-fr">
                    {filteredPrompts.map((prompt, index) => {
                      const datasetName = getDatasetName(prompt);
                      const outputType = promptOutputTypes[prompt.id];
                      return (
                        <div
                          key={prompt.id}
                          className="prompt-card border rounded-lg shadow-sm p-2.5 bg-white transition-all duration-300 hover:shadow-md flex flex-col justify-between"
                          style={{ minHeight: '145px', maxWidth: '100%' }}
                        >
                          <p
                            className="text-[11px] font-semibold mb-1.5 flex-grow"
                            style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', lineHeight: '1.4' }}
                            title={prompt.prompt_text}
                          >
                            {index + 1}. &quot;{prompt.prompt_text}&quot;
                          </p>

                          <div className="mt-auto">
                            {datasetName && (
                              <div className="mb-1">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-medium max-w-full" title={`Dataset: ${datasetName}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v4c0 1.657 4.03 3 9 3s9-1.343 9-3V5" /><path d="M3 9v4c0 1.657 4.03 3 9 3s9-1.343 9-3V9" /><path d="M3 13v4c0 1.657 4.03 3 9 3s9-1.343 9-3v-4" />
                                  </svg>
                                  <span className="truncate">{datasetName}</span>
                                </span>
                              </div>
                            )}

                            <div className="mb-1 text-[10px] flex items-center justify-between">
                              <div>
                                <p className="text-gray-600 truncate">By: {prompt.user_name && prompt.user_name !== "undefined" ? prompt.user_name : "—"}</p>
                                <p className="text-gray-500">{new Date(prompt.updated_at || prompt.created_at).toLocaleDateString()}</p>
                              </div>
                              {outputType && (
                                <div className="flex gap-0.5 ml-1 shrink-0">
                                  {(outputType === 'C' || outputType === 'CT') && (
                                    <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[9px] font-bold flex items-center justify-center border border-purple-300" title="Charts">C</span>
                                  )}
                                  {(outputType === 'T' || outputType === 'CT') && (
                                    <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-[9px] font-bold flex items-center justify-center border border-green-300" title="Table">T</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <hr className="my-1 border-t" />
                            <div className="flex justify-center items-center gap-1.5 mt-1">
                              <button className="text-gray-700 hover:text-blue-600 transition-colors p-0.5" onClick={() => handlePlayClick(prompt)} title="Play"><FaPlay size={11} /></button>
                              <button className="text-gray-700 hover:text-blue-600 transition-colors p-0.5" onClick={() => handleEditPrompt(prompt)} title="Edit"><FaPen size={11} /></button>
                              <button className="text-gray-700 hover:text-red-600 transition-colors p-0.5" onClick={() => handleDeletePrompt(prompt.id)} title="Delete"><FaTrash size={11} /></button>
                              <button className="text-gray-700 hover:text-blue-600 transition-colors p-0.5 relative" onClick={() => handleCommentClick(prompt.id)} title="Comments">
                                <FaComment size={11} />
                                {getCommentCount(prompt.id) > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full h-3 w-3 flex items-center justify-center leading-none">{getCommentCount(prompt.id)}</span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!isLoading && filteredPrompts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">{searchTerm ? `No prompts found for "${searchTerm}"` : "No prompts available"}</p>
                    {searchTerm && <button onClick={() => setSearchTerm("")} className="mt-2 text-blue-500 hover:text-blue-700 text-xs">Clear search</button>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-5 max-w-sm w-full mx-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold">Export Prompts</h3>
                <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes size={16} /></button>
              </div>
              <p className="text-gray-600 mb-4 text-sm">Choose format to export {searchTerm ? filteredPrompts.length : prompts.length} prompt(s):</p>
              <div className="space-y-2">
                <button onClick={downloadPromptsAsTXT} className="w-full py-2 px-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium">Export as TXT</button>
                <button onClick={downloadPromptsAsCSV} className="w-full py-2 px-3 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium">Export as CSV</button>
                <button onClick={() => setShowExportModal(false)} className="w-full py-2 px-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── REPOSITORY TAB ── */}
        {activeTab === "repository" && (
          <div className="w-full">
            <div className="w-full bg-white border-b">
              <div className="max-w-[1400px] mx-auto px-4 py-2">
                <div className="relative">
                  <input type="text" placeholder="Search prompts..." value={searchTermRepository} onChange={(e) => setSearchTermRepository(e.target.value)} className="w-full py-1.5 px-3 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs" />
                  {searchTermRepository ? (
                    <button onClick={() => setSearchTermRepository("")} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    </button>
                  ) : (
                    <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="max-w-[1400px] mx-auto px-4 py-3">
                {!isLoading && filteredRepositoryPrompts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-fr">
                    {filteredRepositoryPrompts.map((prompt, index) => (
                      <div
                        key={prompt.id}
                        className="prompt-card border rounded-lg shadow-md p-3 bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between cursor-pointer"
                        style={{ minHeight: '155px', maxWidth: '100%' }}
                        onClick={() => handlePlayClick(prompt)}
                      >
                        <p className="text-xs font-semibold mb-2 flex-grow" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', overflowWrap: 'break-word' }} title={prompt.prompt_text}>
                          {index + 1}. &quot;{prompt.prompt_text}&quot;
                        </p>
                        <hr className="my-1.5 border-t" />
                        <div className="mt-1.5 text-xs space-y-0.5">
                          <p className="opacity-80">Dataset: {prompt.filename}</p>
                          <p className="opacity-90 truncate">By: {prompt.user_name && prompt.user_name !== "undefined" ? prompt.user_name : ""}</p>
                          <p className="opacity-80">Updated: {new Date(prompt.updated_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isLoading ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 text-sm">{searchTermRepository ? `No results for "${searchTermRepository}"` : "No repository prompts available"}</p>
                    {searchTermRepository && <button onClick={() => setSearchTermRepository("")} className="mt-3 text-blue-500 hover:text-blue-700 text-xs">Clear search</button>}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {isCommentOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCloseComment} />
            <div className="bg-white w-80 max-w-sm rounded-lg shadow-lg z-10 relative">
              <div className="p-3 border-b flex justify-between items-center">
                <h3 className="text-xs font-medium">{editingCommentId !== null ? 'Edit Comment' : 'Comments'}</h3>
                <button onClick={handleCloseComment} className="text-gray-500 hover:text-gray-700"><FaTimes size={12} /></button>
              </div>
              {commentsLoading ? (
                <div className="px-4 py-5 text-center text-xs text-gray-500">Loading comments...</div>
              ) : getCurrentPromptComments().length > 0 && !editingCommentId ? (
                <div className="px-3 py-2 max-h-48 overflow-y-auto">
                  {getCurrentPromptComments().map((comment) => (
                    <div key={comment.id} className="border-b pb-2 mb-2 last:border-0">
                      <div className="flex justify-between items-start">
                        <p className="text-xs text-gray-800">{comment.comment_text}</p>
                        <div className="flex gap-1.5 ml-2 shrink-0">
                          <button onClick={() => handleEditComment(comment.id)} className="text-blue-600 hover:text-blue-800" disabled={deletingCommentId === comment.id}><FaEdit size={11} /></button>
                          <button onClick={() => handleDeleteComment(comment.id)} className="text-red-600 hover:text-red-800 disabled:opacity-40" disabled={deletingCommentId === comment.id}>{deletingCommentId === comment.id ? <span className="text-[10px]">...</span> : <FaTrash size={11} />}</button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{comment.is_edited ? `Edited: ${formatDate(comment.updated_at)}` : `Added: ${formatDate(comment.created_at)}`}</p>
                    </div>
                  ))}
                </div>
              ) : !editingCommentId ? (
                <div className="px-4 py-3 text-center text-xs text-gray-400">No comments yet.</div>
              ) : null}
              <form onSubmit={handleSaveComment} className="p-3">
                <textarea className="w-full p-2 border rounded-md mb-2 h-20 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Enter your comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)} disabled={commentSaving} required />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { if (editingCommentId !== null) { setEditingCommentId(null); setCommentText(''); } else handleCloseComment(); }} disabled={commentSaving} className="px-2.5 py-1 text-xs border rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-40">Cancel</button>
                  <button type="submit" disabled={commentSaving} className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 min-w-[50px]">{commentSaving ? (editingCommentId !== null ? 'Updating...' : 'Saving...') : (editingCommentId !== null ? 'Update' : 'Save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Result Modal */}
        {isResultModalOpen && runResult && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-5 rounded-lg shadow-lg w-full h-full max-w-full relative overflow-y-auto">
              <span className="close-btn absolute top-2 right-2 cursor-pointer text-xl text-gray-600" onClick={() => { setIsResultModalOpen(false); setActiveTab("prompts"); }}>&times;</span>
              <h3 className="text-base font-semibold mb-3">Prompt</h3>
              <textarea value={selectedPrompt || ""} readOnly rows={5} className="w-full p-2 border border-gray-300 rounded text-sm" />
              <h3 className="text-base font-semibold mt-4">Run Result</h3>
              <div className="run-results mt-4">
                <div className="tabs flex justify-end space-x-2 mb-3">
                  {['message', 'table', 'charts'].map((tab) => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setIsResultModalOpen(true); }} className={`tab-button px-3 py-1.5 rounded text-xs ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                  ))}
                </div>
                <div className="tab-content">
                  {activeTab === 'message' && runResult.message && <div className="message-tab text-sm"><p>{runResult.message[0]}</p></div>}
                  {activeTab === 'table' && runResult.table?.columns?.length > 0 && (
                    <div className="table-tab">
                      <div className="flex justify-end">
                        <button onClick={downloadExcel} className="mb-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Download as Excel</button>
                      </div>
                      <div className="max-h-94 overflow-y-auto border border-gray-300 rounded">
                        <table className="min-w-full table-auto text-xs">
                          <thead><tr>{runResult.table.columns.map((col, idx) => <th key={idx} className="p-2 border-b text-left">{col}</th>)}</tr></thead>
                          <tbody>{runResult.table.data.length > 0 ? runResult.table.data.map((row, rowIdx) => <tr key={rowIdx}>{row.map((cell, cellIdx) => <td key={cellIdx} className="p-2 border-b">{cell}</td>)}</tr>) : <tr><td colSpan={runResult.table.columns.length} className="text-center p-2">No data available.</td></tr>}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {activeTab === 'charts' && runResult.charts && (
                    <div className="charts-tab">
                      <div className="flex justify-end">
                        <button onClick={() => setShowDownloadModal(true)} className="mb-3 px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs">Download as PPT</button>
                        {showDownloadModal && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-5 rounded-lg shadow-xl max-w-sm w-full">
                              <h3 className="text-base font-bold text-blue-700 mb-3">Download Options</h3>
                              <div className="flex gap-2 mb-3">
                                <button onClick={() => { setShowDownloadModal(false); downloadPPT(false, 'limited'); }} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">Charts Only</button>
                                <button onClick={() => setShowEmailModal(true)} className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium">Send via Email</button>
                              </div>
                              <div className="border-t pt-3 mb-3">
                                <p className="font-bold mb-2 text-xs">Include table data:</p>
                                <div className="space-y-1 mb-3">
                                  <div className="flex items-center"><input type="radio" id="limitedRows" name="tableRows" value="limited" defaultChecked className="mr-2" /><label htmlFor="limitedRows" className="text-xs">First 20 rows only</label></div>
                                  <div className="flex items-center"><input type="radio" id="allRows" name="tableRows" value="all" className="mr-2" /><label htmlFor="allRows" className="text-xs">All table rows</label></div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { const el = document.querySelector('input[name="tableRows"]:checked'); const opt = el ? (el as HTMLInputElement).value : 'limited'; setShowDownloadModal(false); downloadPPT(true, opt); }} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">Download</button>
                                  <button onClick={() => { const el = document.querySelector('input[name="tableRows"]:checked'); const opt = el ? (el as HTMLInputElement).value : 'limited'; setEmailData(prev => ({ ...prev, reportType: 'complete', tableOption: opt })); setShowEmailModal(true); }} className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium">Send via Email</button>
                                </div>
                              </div>
                              <button onClick={() => setShowDownloadModal(false)} className="w-full py-1.5 bg-gray-200 text-gray-800 rounded border border-gray-300 text-xs">Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="my-3 flex flex-wrap justify-center gap-4">
                        {runResult.charts && runResult.charts.map((chart: ChartData, index: number) => {
                          switch (chart.chart_type) {
                            case 'pie': return (
                              <div key={`pie-${index}`} className="w-full max-w-[380px] flex-1 chart-container">
                                <h5 className="text-sm font-semibold text-center">Pie Chart</h5>
                                <div style={{ height: "350px" }}><Pie data={getPieData(chart)} options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: "top" } } }} /></div>
                                <div className="mt-3 p-3 bg-gray-100 rounded-lg"><h6 className="text-xs font-semibold mb-1">Insights:</h6><ul className="list-disc list-inside">{chart.insight && chart.insight.map((insight, i) => <li key={i} className="text-xs">{insight}</li>)}</ul></div>
                              </div>
                            );
                            case 'bar': return (
                              <div key={`bar-${index}`} className="w-full max-w-[450px] flex-1 chart-container">
                                <h5 className="text-sm font-semibold text-center">Bar Chart</h5>
                                <div style={{ height: "350px" }}><Bar data={getChartData(chart, 'bar')} options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: "top" } }, scales: { y: { beginAtZero: true } } }} /></div>
                                <div className="mt-3 p-3 bg-gray-100 rounded-lg"><h6 className="text-xs font-semibold mb-1">Insights:</h6><ul className="list-disc list-inside">{chart.insight && chart.insight.map((insight, i) => <li key={i} className="text-xs">{insight}</li>)}</ul></div>
                              </div>
                            );
                            case 'line': return (
                              <div key={`line-${index}`} className="w-full max-w-[450px] flex-1 chart-container">
                                <h5 className="text-sm font-semibold text-center">Line Chart</h5>
                                <div style={{ height: "350px" }}><Line data={getChartData(chart, 'line')} options={{ maintainAspectRatio: false, plugins: { legend: { display: true, position: "top" } }, scales: { y: { beginAtZero: true } } }} /></div>
                                <div className="mt-3 p-3 bg-gray-100 rounded-lg"><h6 className="text-xs font-semibold mb-1">Insights:</h6><ul className="list-disc list-inside">{chart.insight && chart.insight.map((insight, i) => <li key={i} className="text-xs">{insight}</li>)}</ul></div>
                              </div>
                            );
                            default: return null;
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && <Spinner />}

        {/* ── TABLES TAB ── */}
        {activeTab === "tables" && (
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-700">Data Sources</h2>
                {dataSources.length > 0 && (
                  <>
                    <span className="text-xs text-gray-400 font-normal">({dataSources.length}/{dataSources[0]?.total_slots || 4} slots)</span>
                    <div className="flex items-center gap-1 ml-1">
                      {Array.from({ length: dataSources[0]?.total_slots || 4 }, (_, i) => {
                        const filled = dataSources.find(s => s.slot_number === i + 1);
                        return <div key={i} className={`w-5 h-1.5 rounded-full ${filled ? "bg-blue-500" : "bg-gray-200"}`} title={filled ? `Slot ${i + 1}: ${filled.source_name}` : `Slot ${i + 1}: Empty`} />;
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={fetchDataSources} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 border border-blue-200 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Refresh
                </button>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs" onClick={handleViewTables}>+ PG Table</button>
                <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs" onClick={handleeOpenModal}>+ New Info-Object</button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {dataSourcesLoading ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Slot</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Source Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dataSources.map((source) => {
                      const matchedRow = source.source_type === "csv" ? rows.find(r => String(r.id) === String(source.data_management_table_id)) : null;
                      const isExpanded = isDropdownOpenn === String(source.id);
                      return (
                        <React.Fragment key={`source-${source.id}`}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-3 py-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{source.slot_number}</span></td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-800">{source.source_name}</td>
                            <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate" title={source.description}>{source.description || "—"}</td>
                            <td className="px-3 py-2"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${source.source_type === "table_data" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>{source.source_type_display}</span></td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">Active</span></td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center items-center gap-1.5">
                                {source.source_type === "csv" && matchedRow && (
                                  <>
                                    <button onClick={() => handleEdit(matchedRow)} className="text-blue-600 hover:text-blue-800 p-0.5" title="Edit"><FaPen size={12} /></button>
                                    <button onClick={() => handleOpenUploadModal(matchedRow.id)} className="text-green-600 hover:text-green-800 p-0.5" title="Upload"><FaFileUpload size={12} /></button>
                                    <button onClick={() => toggleDropdowns(String(source.id))} className="text-gray-600 hover:text-gray-800 p-0.5" title={isExpanded ? "Collapse" : "View Files"}>{isExpanded ? <FaCaretUp size={12} /> : <FaCaretDown size={12} />}</button>
                                  </>
                                )}
                                <button onClick={() => setDeleteDataSourceConfirm({ isOpen: true, source })} className="text-red-600 hover:text-red-800 p-0.5" title="Delete"><FaTrash size={12} /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && matchedRow && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-gray-50">
                                <div className="px-6 py-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Uploaded Files</p>
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-100"><tr><th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">File Name</th><th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Created On</th><th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Status</th><th className="px-3 py-1.5 text-center text-xs font-medium text-gray-600 uppercase">Actions</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {matchedRow.files && matchedRow.files.length > 0 ? matchedRow.files.map((file) => (
                                        <tr key={file.id} className="hover:bg-gray-50">
                                          <td className="px-3 py-1.5 text-gray-700">{file.filename}</td>
                                          <td className="px-3 py-1.5 text-gray-500">{new Date(file.created_at).toLocaleDateString()}</td>
                                          <td className="px-3 py-1.5">{getApprovalBadge(file.approval_status || 'pending')}</td>
                                          <td className="px-3 py-1.5 text-center">{(!file.approval_status || file.approval_status === 'pending') && <button onClick={() => handleDirectApprove('file', file.id, matchedRow.id)} className="text-green-600 hover:text-green-800" title="Approve"><FaCheck size={11} /></button>}</td>
                                        </tr>
                                      )) : <tr><td colSpan={4} className="px-3 py-2 text-center text-gray-400 text-xs">No files uploaded yet</td></tr>}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {rows.filter(row => !row.approval_status || row.approval_status === 'pending').map((row) => {
                      const isExpanded = isDropdownOpenn === String(row.id);
                      return (
                        <React.Fragment key={`pending-${row.id}`}>
                          <tr className="hover:bg-yellow-50">
                            <td className="px-3 py-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">—</span></td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-800">{row.table_name}</td>
                            <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate" title={row.table_description}>{row.table_description}</td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">CSV</span></td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span></td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center items-center gap-1.5">
                                <button onClick={() => handleDirectApprove('table', row.id)} className="flex items-center gap-0.5 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded" title="Approve"><FaCheck size={10} />Approve</button>
                                <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 p-0.5" title="Edit"><FaPen size={12} /></button>
                                <button onClick={() => handleOpenUploadModal(row.id)} className="text-green-600 hover:text-green-800 p-0.5" title="Upload"><FaFileUpload size={12} /></button>
                                <button onClick={() => toggleDropdowns(String(row.id))} className="text-gray-600 hover:text-gray-800 p-0.5" title={isExpanded ? "Collapse" : "View Files"}>{isExpanded ? <FaCaretUp size={12} /> : <FaCaretDown size={12} />}</button>
                                <button onClick={() => handleDeletes(row)} className="text-red-600 hover:text-red-800 p-0.5" title="Delete"><FaTrash size={12} /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0 bg-gray-50">
                                <div className="px-6 py-2">
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Uploaded Files</p>
                                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-100"><tr><th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">File Name</th><th className="px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">Created On</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {row.files && row.files.length > 0 ? row.files.map((file) => (
                                        <tr key={file.id} className="hover:bg-gray-50"><td className="px-3 py-1.5 text-gray-700">{file.filename}</td><td className="px-3 py-1.5 text-gray-500">{new Date(file.created_at).toLocaleDateString()}</td></tr>
                                      )) : <tr><td colSpan={2} className="px-3 py-2 text-center text-gray-400 text-xs">No files uploaded yet.</td></tr>}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {dataSources.length === 0 && rows.filter(r => !r.approval_status || r.approval_status === 'pending').length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-gray-500">No data sources yet. Use "+ PG Table" or "+ New Info-Object" to add.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Delete Data Source Modal */}
            {deleteDataSourceConfirm.isOpen && deleteDataSourceConfirm.source && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-5 max-w-sm w-full mx-4 shadow-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Delete Data Source</h3>
                    <button onClick={() => setDeleteDataSourceConfirm({ isOpen: false, source: null })} className="text-gray-400 hover:text-gray-600"><FaTimes size={14} /></button>
                  </div>
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-100 rounded-md">
                    <p className="text-xs text-gray-700 mb-1">You are about to delete:</p>
                    <p className="font-semibold text-gray-900 text-sm">{deleteDataSourceConfirm.source.source_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Slot {deleteDataSourceConfirm.source.slot_number} · {deleteDataSourceConfirm.source.source_type_display}</p>
                  </div>
                  <p className="text-xs text-red-600 mb-4">⚠️ This also deletes associated AI documentation. This action cannot be undone.</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setDeleteDataSourceConfirm({ isOpen: false, source: null })} className="px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50" disabled={isDeletingDataSource}>Cancel</button>
                    <button onClick={handleDeleteDataSource} disabled={isDeletingDataSource} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5">
                      {isDeletingDataSource ? <><svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Deleting...</> : <><FaTrash size={11} />Delete</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Info-Object Confirmation Modal */}
            {deleteConfirmation.isOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-5 max-w-sm w-full">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">Confirm Deletion</h3>
                    <button onClick={cancelDelete} className="text-gray-500 hover:text-gray-700" disabled={isDeletingInfoObject}><FaTimes size={14} /></button>
                  </div>
                  <p className="mb-4 text-sm">Are you sure you want to delete "<span className="font-semibold">{deleteConfirmation.rowToDelete?.table_name}</span>"? This cannot be undone.</p>
                  <div className="flex justify-end space-x-2">
                    <button onClick={cancelDelete} disabled={isDeletingInfoObject} className="px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50 disabled:bg-gray-100">Cancel</button>
                    <button onClick={confirmDelete} disabled={isDeletingInfoObject} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 disabled:bg-red-300 flex items-center gap-1.5">
                      {isDeletingInfoObject ? <><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Deleting...</> : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PG Tables Modal */}
            {isViewTablesModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
                  <div className="flex justify-between items-center px-5 py-3 border-b">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">PostgreSQL Tables</h3>
                      {pgDbInfo && <p className="text-xs text-gray-500 mt-0.5">Database: <span className="font-medium">{pgDbInfo.database_name}</span> · <span className="font-medium">{pgDbInfo.table_count}</span> tables · <span className="text-blue-600 font-medium">Click a row to add</span></p>}
                    </div>
                    <button onClick={() => setIsViewTablesModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FaTimes size={15} /></button>
                  </div>
                  <div className="p-4 overflow-y-auto max-h-[55vh]">
                    {pgTablesLoading ? (
                      <div className="flex justify-center items-center py-8"><svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg></div>
                    ) : pgTables.length === 0 ? (
                      <p className="text-center text-gray-500 py-6 text-sm">No tables found.</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">#</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Table Name</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Rows</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Columns</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase">Size</th><th className="px-3 py-2 text-center text-xs font-medium text-gray-600 uppercase">Action</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {pgTables.map((table, index) => (
                            <tr key={table.table_name} className="hover:bg-blue-50 transition-colors">
                              <td className="px-3 py-2 text-gray-400">{index + 1}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">{table.table_name}</td>
                              <td className="px-3 py-2 text-gray-600">{table.row_count.toLocaleString()}</td>
                              <td className="px-3 py-2 text-gray-600">{table.column_count}</td>
                              <td className="px-3 py-2 text-gray-600">{table.size}</td>
                              <td className="px-3 py-2 text-center"><button onClick={() => { setSelectedPgTable(table); setAddDataSourceForm({ source_name: table.table_name, description: "", row_limit: 100000 }); setShowAddDataSourceModal(true); }} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md">+ Add</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="flex justify-end px-5 py-3 border-t"><button onClick={() => setIsViewTablesModalOpen(false)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs">Close</button></div>
                </div>
              </div>
            )}

            {/* Add Data Source Modal */}
            {showAddDataSourceModal && selectedPgTable && (
              <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
                  <div className="flex justify-between items-center px-5 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-800">Add as Data Source</h3>
                    <button onClick={() => { setShowAddDataSourceModal(false); setSelectedPgTable(null); }} className="text-gray-400 hover:text-gray-600"><FaTimes size={15} /></button>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Selected Table</label>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                        <span className="text-blue-700 font-medium text-xs">{selectedPgTable.table_name}</span>
                        <span className="text-xs text-gray-500">({selectedPgTable.row_count.toLocaleString()} rows · {selectedPgTable.column_count} cols · {selectedPgTable.size})</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Source Name <span className="text-red-500">*</span></label>
                      <input type="text" value={addDataSourceForm.source_name} onChange={(e) => setAddDataSourceForm(prev => ({ ...prev, source_name: e.target.value }))} placeholder="e.g. ledger_data.csv" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                      <textarea value={addDataSourceForm.description} onChange={(e) => setAddDataSourceForm(prev => ({ ...prev, description: e.target.value }))} placeholder="e.g. Ledger transactions for financial analysis" rows={3} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 px-5 py-3 border-t">
                    <button onClick={() => { setShowAddDataSourceModal(false); setSelectedPgTable(null); }} className="px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={handleAddPgTableAsDataSource} disabled={isAddingDataSource || !addDataSourceForm.source_name || !addDataSourceForm.description} className={`px-3 py-1.5 rounded-md text-xs text-white font-medium transition-colors ${isAddingDataSource || !addDataSourceForm.source_name || !addDataSourceForm.description ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
                      {isAddingDataSource ? <span className="flex items-center gap-1.5"><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Adding...</span> : "Add Data Source"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-4 border w-80 shadow-lg rounded-md bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">Upload Files</h3>
                    <button onClick={handleCloseUploadModal} className="text-gray-400 hover:text-gray-500"><FaTimes size={14} /></button>
                  </div>
                  <form onSubmit={handleSubmitMultipleFiles} className="mt-3">
                    <div className="mb-3">
                      <label className="block text-gray-700 text-xs font-bold mb-1.5">Select Date:</label>
                      <input type="date" value={selectedDate} onChange={handleDateChange} className="shadow appearance-none border rounded w-full py-1.5 px-3 text-gray-700 text-xs leading-tight focus:outline-none" required />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-xs font-bold mb-1.5">Select Files:</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500">
                        <input id="fileInput" type="file" multiple onChange={handleMultipleFileSelect} className="hidden" accept=".csv,.xlsx,.xls" />
                        <label htmlFor="fileInput" className="cursor-pointer">
                          <FaUpload className="text-gray-500 mx-auto mb-1.5" size={18} />
                          <p className="text-xs text-gray-600">{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Click to upload'}</p>
                          {selectedFiles.length > 0 && <div className="mt-1.5 text-xs text-left max-h-24 overflow-y-auto">{selectedFiles.map((file, i) => <div key={i} className="text-blue-600 truncate text-xs">• {file.name}</div>)}</div>}
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={handleCloseUploadModal} className="px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={isUploading || selectedFiles.length === 0} className={`px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 ${isUploading || selectedFiles.length === 0 ? 'opacity-75 cursor-not-allowed' : ''}`}>
                        {isUploading ? <span className="flex items-center gap-1"><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading...</span> : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Info-Object Modal */}
            {isModallOpen && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-20 mx-auto p-4 border w-80 shadow-lg rounded-md bg-white">
                  <h3 className="text-sm font-semibold mb-3">{editRow ? 'Edit Info-Object' : 'Create New Info-Object'}</h3>
                  <form onSubmit={handleSubmit} className="mt-3">
                    <div className="mb-3">
                      <label className="block text-gray-700 text-xs font-bold mb-1.5">Info-Object Name</label>
                      <input type="text" name="tableName" value={formData.tableName} onChange={handleChange} required disabled={isSavingInfoObject} className="shadow appearance-none border rounded w-full py-1.5 px-3 text-gray-700 text-xs leading-tight focus:outline-none disabled:bg-gray-100" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 text-xs font-bold mb-1.5">Info-Object Description</label>
                      <input type="text" name="tableDescription" value={formData.tableDescription} onChange={handleChange} required disabled={isSavingInfoObject} className="shadow appearance-none border rounded w-full py-1.5 px-3 text-gray-700 text-xs leading-tight focus:outline-none disabled:bg-gray-100" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button type="submit" disabled={isSavingInfoObject} className={`w-full max-w-xs text-white font-bold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 ${isSavingInfoObject ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}>
                        {isSavingInfoObject ? <><svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{editRow ? 'Updating...' : 'Creating...'}</> : editRow ? 'Update' : 'Save'}
                      </button>
                      <button type="button" onClick={handleeCloseModal} disabled={isSavingInfoObject} className="w-full max-w-xs bg-gray-500 hover:bg-gray-700 text-white font-bold py-1.5 px-3 rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed">Close</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTATION TAB ── */}
        {activeTab === "documentation" && (
          <div className="w-full">
            <div className="max-w-[1400px] mx-auto px-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Sources (Board API)</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{data.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Columns (Board API)</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{data.reduce((acc, src) => acc + (src.columns?.length || 0), 0)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Sources (All API)</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{dataFiltered.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 mb-6">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">AI Documentation</h3>
                  <button onClick={fetchData} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-8 px-3 py-2"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Source Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Columns</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center"><p className="text-gray-400 text-xs">No data available for this board.</p></td></tr>
                      ) : (
                        data.map((source) => {
                          const isExpanded = expandedRow === source.id;
                          return (
                            <React.Fragment key={source.id}>
                              <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? "bg-blue-50" : ""}`}>
                                <td className="px-3 py-3 text-center"><div className="w-2 h-2 rounded-full bg-green-400 mx-auto"></div></td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" /></svg>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-gray-800">{source.source_name}</p>
                                      <p className="text-[10px] text-gray-400">ID: {source.data_source_id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${source.source_type === "table_data" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>
                                    {source.source_type === "table_data" ? "Table" : source.source_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3"><span className="text-xs text-gray-600"><span className="font-medium text-blue-600">{source.columns?.length || 0}</span> columns</span></td>
                                <td className="px-4 py-3 text-center">
                                  <button onClick={() => setExpandedRow(isExpanded ? null : source.id)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${isExpanded ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                    {isExpanded ? <><MdArrowDropUp size={14} /> Collapse</> : <><MdArrowDropDown size={14} /> View Columns</>}
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-blue-50">
                                  <td colSpan={5} className="px-0 py-0">
                                    <div className="px-6 py-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-semibold text-gray-700">Column Documentation — {source.source_name}</h4>
                                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{source.columns?.length || 0} columns</span>
                                      </div>
                                      <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                        <table className="min-w-full bg-white">
                                          <thead><tr className="bg-gray-100"><th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-6">#</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase w-56">Column Name</th><th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th><th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase w-16">Edit</th></tr></thead>
                                          <tbody className="divide-y divide-gray-100">
                                            {source.columns && source.columns.length > 0 ? source.columns.map((col: DocumentationColumn, colIdx: number) => {
                                              const isEditingCol = editRowId === source.id && editRowKey === col.column_name;
                                              return (
                                                <tr key={colIdx} className="hover:bg-gray-50">
                                                  <td className="px-3 py-2 text-xs text-gray-400">{colIdx + 1}</td>
                                                  <td className="px-3 py-2"><span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-xs font-mono text-gray-700 border border-gray-200">{col.column_name}</span></td>
                                                  <td className="px-3 py-2">
                                                    {isEditingCol ? (
                                                      <input type="text" value={editValues[source.id]?.[col.column_name] ?? col.description} onChange={(e) => handleChanges(source.id, col.column_name, e.target.value)} className="w-full border border-blue-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" autoFocus />
                                                    ) : (
                                                      <span className="text-xs text-gray-600">{col.description || <span className="text-gray-300 italic text-xs">No description</span>}</span>
                                                    )}
                                                  </td>
                                                  <td className="px-3 py-2 text-center">
                                                    {isEditingCol ? (
                                                      <button onClick={() => handleSaveClicks(source.id, boardId)} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"><FiSave size={10} />Save</button>
                                                    ) : (
                                                      <button onClick={() => { setEditRowId(source.id); setEditRowKey(col.column_name); setEditValues(prev => ({ ...prev, [source.id]: { ...(prev[source.id] || {}), [col.column_name]: col.description } })); }} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-md"><FaPen size={9} />Edit</button>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            }) : <tr><td colSpan={4} className="px-4 py-4 text-center text-xs text-gray-400 italic">No columns documented yet.</td></tr>}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Editor Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center w-full h-full justify-center bg-black bg-opacity-50">
            <div className="bg-white p-5 rounded-lg shadow-lg w-full h-full overflow-y-auto relative">
              <button onClick={handleCloseModal} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg">✖</button>
              <h2 className="text-base font-bold mb-2">Run Your Prompt</h2>
              <textarea className="w-full p-2 border rounded text-sm" placeholder="Type your prompt here..." value={newPromptName} rows={7} ref={textareaRef} onChange={(e) => setNewPromptName(e.target.value)} />
              <div className="mt-3 flex justify-end space-x-2">
                <button className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs" onClick={handleViewPromptsClick}>View Prompts</button>
                <button onClick={handleRePrompt} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs" disabled={isLoading}>Reprompt</button>
                <button onClick={handleRunPrompt} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs" disabled={!newPromptName.trim() || isLoading}>Run</button>
                <button onClick={handleSavePrompt} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-xs" disabled={isLoading}>Save</button>
              </div>
              {isLoading && <div className="fixed top-4 right-4"><Spinner /></div>}
              {isRunClicked && runResult && (
                <div className="run-results mt-4">
                  <div className="tabs flex justify-end space-x-2 mb-3">
                    {['message', 'table', 'charts'].map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-button px-3 py-1 rounded text-xs ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
                    ))}
                  </div>
                  <div className="tab-content max-h-[60vh] overflow-y-auto text-sm">
                    {activeTab === 'message' && (<div className="message-tab">{runResult?.message && runResult.message.length > 0 ? <p>{runResult.message[0]}</p> : <p>No message found.</p>}</div>)}
                    {activeTab === 'table' && runResult.table && (
                      <div className="table-tab">
                        {runResult?.table && runResult.table.columns?.length > 0 ? (
                          <div className="mt-3">
                            <div className="flex justify-end"><button onClick={downloadExcel} className="mb-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">Download as Excel</button></div>
                            <div className="max-h-94 overflow-y-auto border border-gray-300 rounded">
                              <table className="min-w-full table-auto text-xs">
                                <thead><tr>{runResult.table.columns.map((col, i) => <th key={i} className="p-2 border-b text-left">{col}</th>)}</tr></thead>
                                <tbody>{runResult.table.data.length > 0 ? runResult.table.data.map((row, rIdx) => <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx} className="p-2 border-b">{cell}</td>)}</tr>) : <tr><td colSpan={runResult.table.columns.length} className="text-center p-2">No data available.</td></tr>}</tbody>
                              </table>
                            </div>
                          </div>
                        ) : <p>No table data found.</p>}
                      </div>
                    )}
                    {activeTab === 'charts' && runResult.charts && (
                      <div className="charts-tab">
                        <div className="my-3 flex flex-wrap justify-center gap-4">
                          {runResult.charts && runResult.charts.map((chart: ChartData, index: number) => {
                            switch (chart.chart_type) {
                              case 'pie': return <div key={`pie-${index}`} className="w-full max-w-[380px] flex-1 chart-container"><h5 className="text-sm font-semibold text-center">Pie Chart</h5><div style={{ height: "350px" }}><Pie data={getPieData(chart)} options={{ maintainAspectRatio: false }} /></div></div>;
                              case 'bar': return <div key={`bar-${index}`} className="w-full max-w-[450px] flex-1 chart-container"><h5 className="text-sm font-semibold text-center">Bar Chart</h5><div style={{ height: "350px" }}><Bar data={getChartData(chart, 'bar')} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} /></div></div>;
                              case 'line': return <div key={`line-${index}`} className="w-full max-w-[450px] flex-1 chart-container"><h5 className="text-sm font-semibold text-center">Line Chart</h5><div style={{ height: "350px" }}><Line data={getChartData(chart, 'line')} options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} /></div></div>;
                              default: return null;
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
        )}

        {activeTab === "master" && <ExcelTableComponent boardId={boardId} />}

        {/* Prompts Sidebar Modal */}
        {showPromptsModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.promptsModal} ${styles.slideInLeft}`}>
              <div className={styles.modalHeader}>
                <button className={styles.closeButton} onClick={handleClosePromptsModal}>×</button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.searchContainer}>
                  <input type="text" placeholder="Search prompts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className={styles.clearSearchButton}>×</button>}
                </div>
                {promptsLoading ? <div className={styles.loadingOverlay}><div className={styles.spinner}></div></div> : error ? <div className={styles.error}>{error}</div> : filteredPrompt.length === 0 ? (
                  <div className={styles.noResults}>{searchTerm ? `No prompts found for "${searchTerm}"` : 'No prompts found.'}</div>
                ) : (
                  <div className={styles.promptContainer}>
                    <div className={styles.scrollablePrompts}>
                      {filteredPrompts.map((prompt, index) => {
                        const outputType = promptOutputTypes[prompt.id];
                        return (
                          <div key={prompt.id || index} className={styles.promptCard} onClick={() => handlePromptClick(prompt)}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div className={styles.promptNumber}>{index + 1}.</div>
                              {outputType && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {(outputType === 'C' || outputType === 'CT') && <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#f3e8ff', color: '#7e22ce', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d8b4fe' }} title="Charts">C</span>}
                                  {(outputType === 'T' || outputType === 'CT') && <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #86efac' }} title="Table">T</span>}
                                </div>
                              )}
                            </div>
                            <h4>{prompt.prompt_title}</h4>
                            <p>{prompt.prompt_text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && <TimelineSettings boardId={boardId ?? ""} />}
        {activeTab === "parameters" && <ParameterSettings boardId={boardId ?? ""} />}
        {activeTab === "tally" && <TallySetting />}
      </div>
    </div>
  );
}

function hsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}