import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Trash2, Check, X, Save, Loader2,
    ChevronDown, ChevronUp, AlertTriangle, Upload, Edit2, RefreshCw
} from 'lucide-react';

interface FieldData {
    id: number;
    fieldName: string;
    fieldDescription: string;
    fieldType: string;
    fieldLength: string;
    fieldValue: string;
    originalFieldName?: string;
    source?: string;
}

interface TableData {
    id: string;
    table_name: string;
    description: string;
    has_uploaded_file?: boolean;
    file_name?: string | null;
    file_size_bytes?: number | null;
    row_count?: number | null;
    column_count?: number | null;
    fields?: any[];
    created_at?: string;
    updated_at?: string;
}

interface ExcelTableComponentProps {
    boardId?: string | null;
}

const FIELD_TYPES = ['char', 'list', 'number', 'date', 'boolean'];
const FIELDS_PER_PAGE = 10;

const ExcelTableComponent = ({ boardId }: ExcelTableComponentProps) => {

    const loggedInUserId = (() => {
        try {
            const d = sessionStorage.getItem('currentUserData');
            if (d) return String(JSON.parse(d).userId);
        } catch { }
        return localStorage.getItem('loggedInUserId') || null;
    })();

    const [tables, setTables] = useState<TableData[]>([]);
    const [tablesLoading, setTablesLoading] = useState(false);
    const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableDesc, setNewTableDesc] = useState('');

    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [datasetFile, setDatasetFile] = useState<File | null>(null);
    const [isDraggingDataset, setIsDraggingDataset] = useState(false);
    const [uploadingDataset, setUploadingDataset] = useState(false);
    const datasetFileInputRef = useRef<HTMLInputElement>(null);

    const [fieldsMap, setFieldsMap] = useState<{ [tableId: string]: FieldData[] }>({});
    const [fieldsLoading, setFieldsLoading] = useState<{ [tableId: string]: boolean }>({});
    const [fieldPage, setFieldPage] = useState<{ [tableId: string]: number }>({});
    const [savingField, setSavingField] = useState(false);
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [editCellValue, setEditCellValue] = useState('');
    const [modifiedRows, setModifiedRows] = useState<Set<number>>(new Set());
    const cellInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [editTableName, setEditTableName] = useState('');
    const [editTableDesc, setEditTableDesc] = useState('');
    const [updating, setUpdating] = useState(false);

    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
    const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }>({
        show: false, title: '', message: '', onConfirm: () => { }, onCancel: () => { }
    });

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

    // ── Helpers ───────────────────────────────────────────────────────────────

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({
            show: true, title, message,
            onConfirm: () => { onConfirm(); setConfirmDialog(p => ({ ...p, show: false })); },
            onCancel: () => setConfirmDialog(p => ({ ...p, show: false }))
        });
    };

    // ── Effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        if (boardId && loggedInUserId) fetchTables();
        else { setTables([]); setFieldsMap({}); }
    }, [boardId, loggedInUserId]);

    useEffect(() => {
        if (editingCell && cellInputRef.current) {
            cellInputRef.current.focus();
            if (cellInputRef.current instanceof HTMLInputElement) cellInputRef.current.select();
        }
    }, [editingCell]);

    // ── Fetch Tables ──────────────────────────────────────────────────────────

    const fetchTables = async () => {
        if (!loggedInUserId) return;
        setTablesLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/master-data/user/${loggedInUserId}?active_only=false`,
                { headers: { 'X-API-Key': API_KEY } }
            );
            if (res.ok) {
                const data = await res.json();
                setTables((data.master_data_list || []).map((item: any) => ({
                    id: String(item.id),
                    table_name: item.table_name,
                    description: item.description,
                    has_uploaded_file: item.has_uploaded_file,
                    file_name: item.file_name,
                    file_size_bytes: item.file_size_bytes,
                    row_count: item.row_count,
                    column_count: item.column_count,
                    fields: item.fields || [],
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                })));
            } else { setTables([]); }
        } catch { setTables([]); }
        finally { setTablesLoading(false); }
    };

    // ── Fetch Fields ──────────────────────────────────────────────────────────

    const fetchFields = async (tableId: string) => {
        setFieldsLoading(p => ({ ...p, [tableId]: true }));
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/master-data/${tableId}/fields?required_only=false`,
                { headers: { 'X-API-Key': API_KEY } }
            );
            if (res.ok) {
                const data = await res.json();
                const raw: any[] = Array.isArray(data) ? data : data.fields || data.data || [];
                setFieldsMap(p => ({
                    ...p,
                    [tableId]: raw.map((f: any, i: number) => ({
                        id: i + 1,
                        fieldName: f.field_name || '',
                        fieldDescription: f.field_description || '',
                        fieldType: f.field_datatype || f.field_type || 'char',
                        fieldLength: f.field_length?.toString() || '',
                        fieldValue: Array.isArray(f.field_value)
                            ? f.field_value.join(', ')
                            : (typeof f.field_value === 'object' && f.field_value !== null)
                                ? JSON.stringify(f.field_value)
                                : f.field_value || '',
                        originalFieldName: f.field_name || '',
                        source: f.source || 'manual',
                    }))
                }));
                setFieldPage(p => ({ ...p, [tableId]: 1 }));
            }
        } catch { showToast('Error loading fields', 'error'); }
        finally { setFieldsLoading(p => ({ ...p, [tableId]: false })); }
    };

    // ── Toggle expand ─────────────────────────────────────────────────────────

    const toggleExpanded = async (tableId: string) => {
        if (expandedTableId === tableId) {
            setExpandedTableId(null);
            setUploadingFor(null);
            setDatasetFile(null);
        } else {
            setExpandedTableId(tableId);
            setUploadingFor(null);
            setDatasetFile(null);
            setModifiedRows(new Set());
            if (!fieldsMap[tableId]) await fetchFields(tableId);
        }
    };

    // ── Create Modal ──────────────────────────────────────────────────────────

    const openCreateModal = () => { setNewTableName(''); setNewTableDesc(''); setShowCreateModal(true); };
    const closeCreateModal = () => { setShowCreateModal(false); setNewTableName(''); setNewTableDesc(''); };

    const handleCreate = async () => {
        if (!boardId || !loggedInUserId) { showToast('Board or user not available', 'error'); return; }
        if (!newTableName.trim() || !newTableDesc.trim()) { showToast('Table name and description are required', 'error'); return; }
        setCreating(true);
        try {
            const body = {
                table_name: newTableName.trim(),
                description: newTableDesc.trim(),
                selected_currency_code: 'USD',
                selected_currency_symbol: '$',
                selected_currency_name: 'US Dollar',
            };
            const res = await fetch(
                `${API_BASE_URL}/api/master-data/manual?user_id=${loggedInUserId}`,
                { method: 'POST', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
            );
            if (res.ok) {
                const created = await res.json();
                showToast('Master data table created!', 'success');
                closeCreateModal();
                await fetchTables();
                const newId = String(created?.data?.id || created?.id || '');
                if (newId) { setExpandedTableId(newId); await fetchFields(newId); }
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.detail || 'Unknown error'}`, 'error');
            }
        } catch { showToast('An error occurred', 'error'); }
        finally { setCreating(false); }
    };

    // ── Edit Table ────────────────────────────────────────────────────────────

    const startEditTable = (t: TableData) => { setEditingTableId(t.id); setEditTableName(t.table_name); setEditTableDesc(t.description); };
    const cancelEditTable = () => { setEditingTableId(null); setEditTableName(''); setEditTableDesc(''); };

    const saveEditTable = async (tableId: string) => {
        if (!editTableName.trim() || !editTableDesc.trim()) { showToast('Both fields required', 'error'); return; }
        setUpdating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/master-data/${tableId}`,
                { method: 'PUT', headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ table_name: editTableName, description: editTableDesc }) });
            if (res.ok) { cancelEditTable(); fetchTables(); showToast('Table updated!', 'success'); }
            else { const err = await res.json(); showToast(`Failed: ${err.detail || 'Unknown error'}`, 'error'); }
        } catch { showToast('Error updating', 'error'); }
        finally { setUpdating(false); }
    };

    // ── Delete Table ──────────────────────────────────────────────────────────

    const deleteTable = (tableId: string, name: string) => {
        showConfirm('Delete Table', `Delete "${name}"? All fields and dataset will be removed permanently.`, async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/master-data/${tableId}`, { method: 'DELETE', headers: { 'X-API-Key': API_KEY } });
                if (res.ok) {
                    fetchTables();
                    if (expandedTableId === tableId) setExpandedTableId(null);
                    showToast('Table deleted!', 'success');
                } else { const err = await res.json(); showToast(`Failed: ${err.detail || 'Unknown error'}`, 'error'); }
            } catch { showToast('Error deleting', 'error'); }
        });
    };

    // ── Upload dataset ────────────────────────────────────────────────────────

    const handleUploadDataset = async (tableId: string) => {
        if (!datasetFile) { showToast('Please select a file', 'error'); return; }
        if (!loggedInUserId) { showToast('User not found', 'error'); return; }
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        setUploadingDataset(true);
        try {
            const delRes = await fetch(`${API_BASE_URL}/api/master-data/${tableId}`, { method: 'DELETE', headers: { 'X-API-Key': API_KEY } });
            if (!delRes.ok) {
                const delErr = await delRes.json().catch(() => ({}));
                showToast(`Failed to remove existing table: ${typeof delErr.detail === 'string' ? delErr.detail : 'Unknown error'}`, 'error');
                return;
            }
            await new Promise(r => setTimeout(r, 1500));

            const fd = new FormData();
            fd.append('file', datasetFile);
            fd.append('metadata', JSON.stringify({
                table_name: table.table_name,
                description: table.description,
                selected_currency_code: 'USD',
                selected_currency_symbol: '$',
                selected_currency_name: 'US Dollar',
            }));

            const res = await fetch(`${API_BASE_URL}/api/master-data/upload?user_id=${loggedInUserId}`,
                { method: 'POST', headers: { 'X-API-Key': API_KEY }, body: fd });

            if (res.ok) {
                const newData = await res.json();
                showToast('Dataset uploaded successfully!', 'success');
                setDatasetFile(null);
                setUploadingFor(null);
                const newId = String(newData?.data?.id || tableId);
                await fetchTables();
                setExpandedTableId(newId);
                setFieldsMap(p => { const n = { ...p }; delete n[tableId]; return n; });
                await fetchFields(newId);
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(`Failed: ${typeof err.detail === 'string' ? err.detail : err.detail?.[0]?.msg || 'Unknown error'}`, 'error');
            }
        } catch (e) {
            console.error('Upload exception:', e);
            showToast('Error uploading dataset', 'error');
        } finally { setUploadingDataset(false); }
    };

    // ── Field CRUD ────────────────────────────────────────────────────────────

    const addFieldRow = (tableId: string) => {
        const existing = fieldsMap[tableId] || [];
        const newId = Math.max(...existing.map(r => r.id), 0) + 1;
        setFieldsMap(p => ({ ...p, [tableId]: [...existing, { id: newId, fieldName: '', fieldDescription: '', fieldType: 'char', fieldLength: '', fieldValue: '', originalFieldName: '' }] }));
    };

    const saveField = async (tableId: string, field: FieldData) => {
        if (!field.fieldName.trim()) { showToast('Field name is required', 'error'); return; }
        setSavingField(true);
        try {
            if (field.originalFieldName && field.originalFieldName !== '') {
                const body = {
                    new_field_name: field.fieldName,
                    new_field_description: field.fieldDescription,
                    new_field_datatype: field.fieldType,
                    new_field_value: field.fieldValue,
                    new_field_length: parseInt(field.fieldLength) || 0,
                    new_is_required: false,
                };
                const res = await fetch(
                    `${API_BASE_URL}/api/master-data/${tableId}/fields/${encodeURIComponent(field.originalFieldName)}`,
                    { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }, body: JSON.stringify(body) }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                showToast('Field updated!', 'success');
            } else {
                const body = {
                    fields: [{
                        field_name: field.fieldName,
                        field_description: field.fieldDescription,
                        field_datatype: field.fieldType,
                        field_value: field.fieldValue || null,
                        field_length: parseInt(field.fieldLength) || null,
                        is_required: false,
                    }]
                };
                const res = await fetch(
                    `${API_BASE_URL}/api/master-data/${tableId}/fields`,
                    { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY }, body: JSON.stringify(body) }
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(typeof err.detail === 'string' ? err.detail : err.detail?.[0]?.msg || `HTTP ${res.status}`);
                }
                showToast('Field created!', 'success');
            }
            setModifiedRows(p => { const s = new Set(p); s.delete(field.id); return s; });
            await fetchFields(tableId);
        } catch (err) { showToast(`Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error'); }
        finally { setSavingField(false); }
    };

    const deleteField = (tableId: string, field: FieldData) => {
        showConfirm('Delete Field', `Delete field "${field.fieldName || 'Unnamed'}"?`, async () => {
            if (!field.originalFieldName) {
                setFieldsMap(p => ({ ...p, [tableId]: (p[tableId] || []).filter(r => r.id !== field.id) }));
                showToast('Row removed', 'success'); return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/master-data/${tableId}/fields/${encodeURIComponent(field.originalFieldName)}`,
                    { method: 'DELETE', headers: { 'X-API-Key': API_KEY } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                showToast('Field deleted!', 'success');
                await fetchFields(tableId);
            } catch (err) { showToast(`Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error'); }
        });
    };

    // ── Cell editing ──────────────────────────────────────────────────────────

    const handleCellClick = (rowId: number, field: string, value: string) => {
        setEditingCell(`${rowId}-${field}`);
        setEditCellValue(value || '');
    };

    const handleCellSave = (tableId: string, rowId: number, field: string) => {
        setFieldsMap(p => ({ ...p, [tableId]: (p[tableId] || []).map(row => row.id === rowId ? { ...row, [field]: editCellValue } : row) }));
        setModifiedRows(p => new Set([...p, rowId]));
        setEditingCell(null);
        setEditCellValue('');
    };

    const handleCellKeyDown = (e: React.KeyboardEvent, tableId: string, rowId: number, field: string) => {
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleCellSave(tableId, rowId, field); }
        else if (e.key === 'Escape') { setEditingCell(null); setEditCellValue(''); }
    };

    const renderCell = (tableId: string, row: FieldData, field: keyof FieldData): React.ReactElement => {
        const cellKey = `${row.id}-${field}`;
        const isEditing = editingCell === cellKey;
        const value = row[field] as string;
        if (isEditing) {
            if (field === 'fieldType') return (
                <select
                    ref={cellInputRef as React.RefObject<HTMLSelectElement>}
                    value={editCellValue}
                    onChange={e => setEditCellValue(e.target.value)}
                    onBlur={() => handleCellSave(tableId, row.id, field)}
                    onKeyDown={e => handleCellKeyDown(e, tableId, row.id, field)}
                    className="w-full px-1 py-0.5 border-2 border-blue-500 rounded text-[11px] focus:outline-none bg-white"
                >
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            );
            return (
                <div className="relative flex items-center">
                    <input
                        ref={cellInputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={editCellValue}
                        onChange={e => setEditCellValue(e.target.value)}
                        onBlur={() => handleCellSave(tableId, row.id, field)}
                        onKeyDown={e => handleCellKeyDown(e, tableId, row.id, field)}
                        className="w-full px-1 py-0.5 border-2 border-blue-500 rounded text-[11px] focus:outline-none pr-9"
                    />
                    <div className="absolute right-0.5 flex gap-0.5">
                        <button onClick={() => handleCellSave(tableId, row.id, field)} className="text-green-600 hover:text-green-800"><Check className="h-3 w-3" /></button>
                        <button onClick={() => { setEditingCell(null); setEditCellValue(''); }} className="text-red-500 hover:text-red-700"><X className="h-3 w-3" /></button>
                    </div>
                </div>
            );
        }
        return (
            <div
                onClick={() => handleCellClick(row.id, field, value)}
                className="w-full px-1 py-1 min-h-[26px] cursor-text hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-colors"
            >
                <span
                    className={`text-[11px] block w-full overflow-hidden text-ellipsis whitespace-nowrap ${value ? 'text-gray-800' : 'text-gray-300 italic'}`}
                    title={value || ''}
                >
                    {value || 'Click to edit…'}
                </span>
            </div>
        );
    };

    // ── Dataset drag & drop ───────────────────────────────────────────────────

    const handleDatasetDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingDataset(true); };
    const handleDatasetDragLeave = () => setIsDraggingDataset(false);
    const handleDatasetDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingDataset(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setDatasetFile(file);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        /* FIX: removed min-h-full to avoid layout stretching; use h-full only if parent is flex */
        <div className="p-3 bg-gray-50">
            <div className="max-w-full mx-auto space-y-3">

                {/* ── Top bar ── */}
                <div className="flex justify-end">
                    <button
                        onClick={openCreateModal}
                        disabled={!boardId || !loggedInUserId}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-xs font-medium transition-colors
                            ${!boardId || !loggedInUserId
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {!boardId ? 'Select Board First' : '+ Create Master Data'}
                    </button>
                </div>

                {/* ── Tables list ── */}
                {tablesLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                ) : (
                    /* FIX: overflow-hidden (was overflow-visible) so expanded rows don't break layout */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* FIX: overflow-x-auto on a wrapping div so horizontal scroll works cleanly */}
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ minWidth: '560px', tableLayout: 'fixed' }}>
                                <colgroup>
                                    {/* FIX: tighter column ratios so 3 cols fit at 100% zoom */}
                                    <col style={{ width: '30%' }} />
                                    <col style={{ width: '52%' }} />
                                    <col style={{ width: '18%' }} />
                                </colgroup>
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Table Name</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Table Description</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tables.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-xs text-gray-400">
                                                {!boardId
                                                    ? 'Please select a board to manage master data tables.'
                                                    : 'No master data table found. Click "+ Create Master Data" to create one.'}
                                            </td>
                                        </tr>
                                    ) : tables.map(table => (
                                        <React.Fragment key={table.id}>
                                            {/* ── Table row ── */}
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2">
                                                    {editingTableId === table.id
                                                        ? <input
                                                            type="text"
                                                            value={editTableName}
                                                            onChange={e => setEditTableName(e.target.value)}
                                                            className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                          />
                                                        : <span className="text-xs font-semibold text-gray-800 block truncate" title={table.table_name}>{table.table_name}</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2">
                                                    {editingTableId === table.id
                                                        ? <input
                                                            type="text"
                                                            value={editTableDesc}
                                                            onChange={e => setEditTableDesc(e.target.value)}
                                                            className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                          />
                                                        : <span className="text-xs text-gray-600 block truncate" title={table.description}>{table.description}</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        {editingTableId === table.id ? (
                                                            <>
                                                                <button
                                                                    onClick={() => saveEditTable(table.id)}
                                                                    disabled={updating}
                                                                    className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 disabled:opacity-50"
                                                                    title="Save"
                                                                >
                                                                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                                </button>
                                                                <button onClick={cancelEditTable} className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100" title="Cancel">
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => startEditTable(table)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50" title="Edit table">
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => deleteTable(table.id, table.table_name)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Delete table">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => toggleExpanded(table.id)} className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100" title="View fields">
                                                                    {expandedTableId === table.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* ── Expanded panel ── */}
                                            {expandedTableId === table.id && (
                                                <tr>
                                                    {/* FIX: colSpan=3, no p-0 side-effect; bg-gray-50 matches original */}
                                                    <td colSpan={3} className="bg-gray-50 border-t border-gray-200 p-0">
                                                        {/* FIX: single overflow-x-auto wrapper; inner div only sets min-width */}
                                                        <div className="overflow-x-auto w-full">
                                                            <div style={{ minWidth: '700px' }}>

                                                                {/* File info banner */}
                                                                {table.has_uploaded_file && (
                                                                    <div className="mx-3 mt-3 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex flex-wrap items-center gap-3">
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
                                                                                <Upload className="h-3.5 w-3.5 text-green-600" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] font-semibold text-green-800">Uploaded File</p>
                                                                                <p className="text-[10px] text-green-700 font-mono">{table.file_name}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Upload dataset */}
                                                                <div className="mx-3 mb-2">
                                                                    {uploadingFor === table.id ? (
                                                                        <div className="border border-blue-200 rounded-lg bg-blue-50 p-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-xs font-semibold text-blue-800">Upload Dataset</span>
                                                                                <button onClick={() => { setUploadingFor(null); setDatasetFile(null); }} className="text-gray-400 hover:text-gray-600">
                                                                                    <X className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </div>
                                                                            <div
                                                                                onDragOver={handleDatasetDragOver}
                                                                                onDragLeave={handleDatasetDragLeave}
                                                                                onDrop={handleDatasetDrop}
                                                                                onClick={() => datasetFileInputRef.current?.click()}
                                                                                className={`border-2 border-dashed rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 py-6
                                                                                    ${isDraggingDataset ? 'border-blue-500 bg-blue-100'
                                                                                        : datasetFile ? 'border-green-400 bg-green-50'
                                                                                        : 'border-blue-300 hover:border-blue-500 hover:bg-blue-100'}`}
                                                                            >
                                                                                {datasetFile ? (
                                                                                    <>
                                                                                        <Check className="h-6 w-6 text-green-600" />
                                                                                        <p className="text-xs font-semibold text-gray-800">{datasetFile.name}</p>
                                                                                        <p className="text-[10px] text-gray-500">{(datasetFile.size / 1024).toFixed(1)} KB</p>
                                                                                        <button onClick={e => { e.stopPropagation(); setDatasetFile(null); }} className="text-[10px] text-red-500 hover:text-red-700 underline mt-0.5">Remove</button>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Upload className="h-6 w-6 text-blue-400" />
                                                                                        <p className="text-xs text-blue-700 font-medium">{isDraggingDataset ? 'Drop file here' : 'Click to select or drag & drop'}</p>
                                                                                        <p className="text-[10px] text-blue-400">.xlsx, .xls, .csv</p>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            <input ref={datasetFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                                                                                onChange={e => { if (e.target.files?.[0]) setDatasetFile(e.target.files[0]); }} />
                                                                            <div className="flex justify-end gap-2 mt-2">
                                                                                <button onClick={() => { setUploadingFor(null); setDatasetFile(null); }} className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-50">Cancel</button>
                                                                                <button
                                                                                    onClick={() => handleUploadDataset(table.id)}
                                                                                    disabled={!datasetFile || uploadingDataset}
                                                                                    className="px-3 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                                                                                >
                                                                                    {uploadingDataset
                                                                                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                                                                                        : <><Upload className="h-3 w-3" /> Upload</>}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setUploadingFor(table.id); setDatasetFile(null); }}
                                                                            className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-50 hover:border-gray-300 flex items-center gap-1 shadow-sm"
                                                                        >
                                                                            <Upload className="h-3 w-3 text-gray-500" />
                                                                            {table.has_uploaded_file ? 'Re-upload Dataset' : 'Upload Dataset'}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Fields toolbar */}
                                                                <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-t border-b border-gray-200 bg-white">
                                                                    <span className="text-xs font-semibold text-gray-700">
                                                                        Manage Fields
                                                                        {fieldsMap[table.id] && (
                                                                            <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                                                                ({fieldsMap[table.id].length} fields)
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <button
                                                                            onClick={() => addFieldRow(table.id)}
                                                                            disabled={savingField}
                                                                            className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 flex items-center gap-0.5 disabled:opacity-50"
                                                                        >
                                                                            <Plus className="h-3 w-3" /> Add row
                                                                        </button>
                                                                        <button
                                                                            onClick={() => fetchFields(table.id)}
                                                                            className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-medium hover:bg-gray-200 flex items-center gap-0.5"
                                                                        >
                                                                            <RefreshCw className="h-3 w-3" /> Refresh
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* ── Fields table ── */}
                                                                {fieldsLoading[table.id] ? (
                                                                    <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-xs">
                                                                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                                        <span>Loading fields…</span>
                                                                    </div>
                                                                ) : (() => {
                                                                    const allFields = fieldsMap[table.id] || [];
                                                                    const currentPage = fieldPage[table.id] || 1;
                                                                    const totalPages = Math.ceil(allFields.length / FIELDS_PER_PAGE);
                                                                    const paginatedFields = allFields.slice(
                                                                        (currentPage - 1) * FIELDS_PER_PAGE,
                                                                        currentPage * FIELDS_PER_PAGE
                                                                    );

                                                                    return (
                                                                        <div>
                                                                            {/* FIX: inner table no longer needs extra overflow-x-auto — parent handles it */}
                                                                            <table className="w-full" style={{ minWidth: '700px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                                                                <thead>
                                                                                    <tr className="bg-gray-100 border-b border-gray-200">
                                                                                        {/* FIX: tighter column widths that add up to ~700px */}
                                                                                        <th style={{ width: '130px' }} className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200">Field Name</th>
                                                                                        <th style={{ width: '170px' }} className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200">Description</th>
                                                                                        <th style={{ width: '80px' }} className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200">Type</th>
                                                                                        <th style={{ width: '55px' }} className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200">Len</th>
                                                                                        <th style={{ width: '195px' }} className="px-2 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase border-r border-gray-200">Value</th>
                                                                                        <th style={{ width: '70px' }} className="px-2 py-1.5 text-center text-[10px] font-semibold text-gray-600 uppercase">Actions</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {paginatedFields.map(row => (
                                                                                        <tr
                                                                                            key={row.id}
                                                                                            className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${modifiedRows.has(row.id) ? '!bg-orange-50' : ''}`}
                                                                                        >
                                                                                            <td style={{ width: '130px', overflow: 'hidden' }} className="px-1 py-0.5 border-r border-gray-100">{renderCell(table.id, row, 'fieldName')}</td>
                                                                                            <td style={{ width: '170px', overflow: 'hidden' }} className="px-1 py-0.5 border-r border-gray-100">{renderCell(table.id, row, 'fieldDescription')}</td>
                                                                                            <td style={{ width: '80px', overflow: 'hidden' }} className="px-1 py-0.5 border-r border-gray-100">{renderCell(table.id, row, 'fieldType')}</td>
                                                                                            <td style={{ width: '55px', overflow: 'hidden' }} className="px-1 py-0.5 border-r border-gray-100">{renderCell(table.id, row, 'fieldLength')}</td>
                                                                                            <td style={{ width: '195px', overflow: 'hidden' }} className="px-1 py-0.5 border-r border-gray-100">{renderCell(table.id, row, 'fieldValue')}</td>
                                                                                            <td style={{ width: '70px' }} className="px-1 py-0.5 text-center">
                                                                                                <div className="flex items-center justify-center gap-0.5">
                                                                                                    <button
                                                                                                        onClick={() => addFieldRow(table.id)}
                                                                                                        disabled={savingField}
                                                                                                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50"
                                                                                                        title="Add row"
                                                                                                    >
                                                                                                        <Plus className="h-3.5 w-3.5" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => saveField(table.id, row)}
                                                                                                        disabled={savingField}
                                                                                                        className={`p-0.5 rounded disabled:opacity-50 ${modifiedRows.has(row.id)
                                                                                                            ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                                                                                                            : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                                                                                                        title={modifiedRows.has(row.id) ? 'Update field' : 'Save field'}
                                                                                                    >
                                                                                                        <Save className="h-3.5 w-3.5" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => deleteField(table.id, row)}
                                                                                                        className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50"
                                                                                                        title="Delete field"
                                                                                                    >
                                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                    {allFields.length === 0 && (
                                                                                        <tr>
                                                                                            <td colSpan={6} className="px-4 py-6 text-center">
                                                                                                <p className="text-gray-400 text-xs mb-2">No fields yet.</p>
                                                                                                <button onClick={() => addFieldRow(table.id)} className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1 mx-auto">
                                                                                                    <Plus className="h-3 w-3" /> Add first field
                                                                                                </button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )}
                                                                                </tbody>
                                                                            </table>

                                                                            {/* Pagination */}
                                                                            {totalPages > 1 && (
                                                                                <div className="px-3 py-2 border-t border-gray-200 bg-white flex items-center justify-between">
                                                                                    <span className="text-[10px] text-gray-500">
                                                                                        Showing {((currentPage - 1) * FIELDS_PER_PAGE) + 1}–{Math.min(currentPage * FIELDS_PER_PAGE, allFields.length)} of {allFields.length} fields
                                                                                    </span>
                                                                                    <div className="flex items-center gap-0.5">
                                                                                        <button onClick={() => setFieldPage(p => ({ ...p, [table.id]: 1 }))} disabled={currentPage === 1} className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">«</button>
                                                                                        <button onClick={() => setFieldPage(p => ({ ...p, [table.id]: currentPage - 1 }))} disabled={currentPage === 1} className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">‹</button>
                                                                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                                                            .filter(pg => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
                                                                                            .reduce<(number | string)[]>((acc, pg, idx, arr) => {
                                                                                                if (idx > 0 && (pg as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                                                                                                acc.push(pg); return acc;
                                                                                            }, [])
                                                                                            .map((pg, i) => pg === '…'
                                                                                                ? <span key={`e${i}`} className="px-1 py-0.5 text-[10px] text-gray-400">…</span>
                                                                                                : <button
                                                                                                    key={pg}
                                                                                                    onClick={() => setFieldPage(prev => ({ ...prev, [table.id]: pg as number }))}
                                                                                                    className={`px-2 py-0.5 text-[10px] rounded border ${currentPage === pg ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                                                                                >
                                                                                                    {pg}
                                                                                                </button>
                                                                                            )
                                                                                        }
                                                                                        <button onClick={() => setFieldPage(p => ({ ...p, [table.id]: currentPage + 1 }))} disabled={currentPage === totalPages} className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">›</button>
                                                                                        <button onClick={() => setFieldPage(p => ({ ...p, [table.id]: totalPages }))} disabled={currentPage === totalPages} className="px-1.5 py-0.5 text-[10px] rounded border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50">»</button>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <div className="px-3 py-1.5 border-t border-gray-200 bg-white text-[10px] text-gray-400 text-right">
                                                                                Click cell to edit · Enter to save · Esc to cancel
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Create Master Data Table</h3>
                            <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Table Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={newTableName}
                                    onChange={e => setNewTableName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') closeCreateModal(); }}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Products, HospitalData, Sales"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                                <textarea
                                    value={newTableDesc}
                                    onChange={e => setNewTableDesc(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Brief description of this master data table"
                                />
                            </div>
                            <p className="text-[10px] text-gray-400">After creating, you can add fields manually or upload a dataset from the expanded view.</p>
                        </div>
                        <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={closeCreateModal} disabled={creating} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newTableName.trim() || !newTableDesc.trim()}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                {creating ? 'Creating…' : 'Create Table'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast.show && (
                <div className="fixed top-4 right-4 z-[9999]">
                    <div className={`flex items-center p-3 rounded-lg shadow-xl border max-w-sm text-white text-xs font-medium
                        ${toast.type === 'success' ? 'bg-green-500 border-green-600'
                        : toast.type === 'error' ? 'bg-red-500 border-red-600'
                        : 'bg-yellow-500 border-yellow-600'}`}
                    >
                        {toast.type === 'success' && <Check className="h-3.5 w-3.5 mr-2 flex-shrink-0" />}
                        {toast.type === 'error' && <X className="h-3.5 w-3.5 mr-2 flex-shrink-0" />}
                        {toast.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 mr-2 flex-shrink-0" />}
                        <span>{toast.message}</span>
                        <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-2.5 text-white/80 hover:text-white">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Confirm Dialog ── */}
            {confirmDialog.show && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <div className="px-5 py-3.5 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">{confirmDialog.title}</h3>
                        </div>
                        <div className="px-5 py-4">
                            <p className="text-xs text-gray-600">{confirmDialog.message}</p>
                        </div>
                        <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={confirmDialog.onCancel} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                            <button onClick={confirmDialog.onConfirm} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelTableComponent;