import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, Trash2, Edit, Check, X, ChevronDown } from 'lucide-react';

interface TimelineSettingsData {
  id?: string | number;
  name: string;
  financial_year: string;
  result_type: string;
  reporting_period: string;
  description: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DropdownOption {
  value: string;
  label: string;
}

const TimelineSettingsForm = ({
  boardId,

}: {
  boardId: string | number;
  // userId: string | number;
}) => {
  // ✅ Reactive state — triggers re-fetch when resolved
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const d = sessionStorage.getItem('currentUserData');
      if (d) {
        const parsed = JSON.parse(d);
        if (parsed?.userId) {
          setLoggedInUserId(String(parsed.userId));
          return;
        }
      }
    } catch { }
    const stored = localStorage.getItem('loggedInUserId');
    if (stored) setLoggedInUserId(stored);
  }, []); // runs once after mount, when storage is guaranteed available


  const [settingsList, setSettingsList] = useState<TimelineSettingsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());

  // Dynamic dropdown options fetched from API
  const [resultTypeOptions, setResultTypeOptions] = useState<DropdownOption[]>([]);
  const [reportingPeriodOptions, setReportingPeriodOptions] = useState<DropdownOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({ show: false, message: '', type: 'success' });

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

  // ─── Fetch dropdown options from API ────────────────────────────────────────
  const fetchDropdownOptions = async () => {
    setOptionsLoading(true);
    try {
      const [resultTypesRes, reportingPeriodsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/timeline-settings/options/result-types`, {
          headers: { 'X-API-Key': EXCEL_API_KEY },
        }),
        fetch(`${API_BASE_URL}/api/timeline-settings/options/reporting-periods`, {
          headers: { 'X-API-Key': EXCEL_API_KEY },
        }),
      ]);

      if (resultTypesRes.ok) {
        const data = await resultTypesRes.json();
        // Normalise: API may return [{value, label}] or [string] or {options:[...]}
        const normalised = normaliseOptions(data);
        setResultTypeOptions(normalised);
      }

      if (reportingPeriodsRes.ok) {
        const data = await reportingPeriodsRes.json();
        const normalised = normaliseOptions(data);
        setReportingPeriodOptions(normalised);
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      // Fallback to hardcoded options if API fails
      setResultTypeOptions([
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' },
      ]);
      setReportingPeriodOptions([
        { value: 'calendar_year', label: 'Calendar year' },
        { value: 'financial_year', label: 'Financial year' },
        { value: 'custom', label: 'Custom' },
      ]);
    } finally {
      setOptionsLoading(false);
    }
  };

  /**
   * Accepts whatever shape the API returns and converts it to {value, label}[].
   * Handles: string[], {value,label}[], {options:[...]}, {data:[...]}, plain object map.
   */
  const normaliseOptions = (data: unknown): DropdownOption[] => {
    if (Array.isArray(data)) {
      return data.map((item) => {
        if (typeof item === 'string') return { value: item, label: formatLabel(item) };
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const value = (obj.value ?? obj.key ?? obj.id ?? '') as string;
          const label = (obj.label ?? obj.name ?? obj.display ?? value) as string;
          return { value: String(value), label: String(label) };
        }
        return { value: String(item), label: String(item) };
      });
    }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.options)) return normaliseOptions(obj.options);
      if (Array.isArray(obj.data)) return normaliseOptions(obj.data);
      // plain object map: { daily: "Daily", ... }
      return Object.entries(obj).map(([k, v]) => ({
        value: k,
        label: typeof v === 'string' ? v : formatLabel(k),
      }));
    }
    return [];
  };

  const formatLabel = (str: string) =>
    str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ─── Fetch timeline settings ─────────────────────────────────────────────────
  useEffect(() => {
    fetchDropdownOptions();
    if (loggedInUserId) {   // ← guard: skip until userId is available
      fetchSettings();
    }
  }, [loggedInUserId]);

  const fetchSettings = async () => {
    if (!loggedInUserId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/timeline-settings/user/${loggedInUserId}?active_only=false`,
        { headers: { 'X-API-Key': EXCEL_API_KEY } }
      );

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : data.timeline_settings_list ?? data.data ?? [];
        const sanitised = list.map((item: TimelineSettingsData) => ({
          id: item.id ?? '',
          name: item.name ?? '',
          financial_year: item.financial_year ?? '',
          result_type: item.result_type ?? '',
          reporting_period: item.reporting_period ?? '',
          description: item.description ?? '',
          is_active: item.is_active ?? false,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setSettingsList(sanitised);
      } else {
        setSettingsList([]);
        showToast('Failed to load timeline settings', 'error');
      }
    } catch (error) {
      console.error('Error fetching timeline settings:', error);
      showToast('An error occurred while loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Inline edit helpers ─────────────────────────────────────────────────────
  const handleEditStart = (
    id: string | number | undefined,
    field: string,
    value: string
  ) => {
    const idStr = id?.toString();
    if (!idStr) return;
    setEditingId(idStr);
    setEditingField(field);
    setEditValue(value ?? '');
  };

  const handleEditSave = (
    id: string | number | undefined,
    field: keyof TimelineSettingsData
  ) => {
    if (!id) return;
    setSettingsList((prev) =>
      prev.map((item) =>
        item.id?.toString() === id.toString() ? { ...item, [field]: editValue } : item
      )
    );
    if (!isNewItem(id)) {
      setUnsavedChanges((prev) => new Set([...prev, id.toString()]));
    }
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  // ─── Save to API (create or update) ─────────────────────────────────────────
  const handleSaveToAPI = async (id: string | number | undefined) => {
    if (!id) return;
    setSaving(true);

    const settingToUpdate = settingsList.find(
      (item) => item.id?.toString() === id.toString()
    );
    if (!settingToUpdate) {
      showToast('Setting not found', 'error');
      setSaving(false);
      return;
    }

    try {
      const isNew = isNewItem(id);

      // POST → /api/timeline-settings?user_id={userId}
      // PUT  → /api/timeline-settings/{id}
      const url = isNew
        ? `${API_BASE_URL}/api/timeline-settings?user_id=${loggedInUserId}`
        : `${API_BASE_URL}/api/timeline-settings/${id}`;

      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        name: settingToUpdate.name ?? '',
        financial_year: settingToUpdate.financial_year ?? '',
        result_type: settingToUpdate.result_type ?? '',
        reporting_period: settingToUpdate.reporting_period ?? '',
        description: settingToUpdate.description ?? '',
        is_default: false,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'X-API-Key': EXCEL_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json();

        setSettingsList((prev) =>
          prev.map((item) =>
            item.id?.toString() === id.toString()
              ? { ...item, ...responseData }
              : item
          )
        );

        setUnsavedChanges((prev) => {
          const next = new Set(prev);
          next.delete(id.toString());
          return next;
        });

        showToast(
          `Settings ${isNew ? 'created' : 'updated'} successfully!`,
          'success'
        );
        setEditingId(null);
        setEditingField(null);
        setEditValue('');
      } else {
        const errorMessage = await parseErrorMessage(response);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving timeline settings:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to save settings',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Add new row ─────────────────────────────────────────────────────────────
  const handleAddNew = () => {
    const tempId = `new-${Date.now()}`;
    const newSetting: TimelineSettingsData = {
      id: tempId,
      name: '',
      financial_year: '',
      result_type: '',
      reporting_period: '',
      description: '',
      is_active: true,
    };
    setSettingsList((prev) => [...prev, newSetting]);
    setEditingId(tempId);
    setEditingField('name');
    setEditValue('');
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────
  const handleDeleteClick = (id: string | number | undefined) => {
    if (!id) return;
    setConfirmDialog({
      show: true,
      title: 'Delete Timeline Setting',
      message:
        'Are you sure you want to delete this timeline setting? This action cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, show: false }));
        await handleDeleteConfirmed(id);
      },
      onCancel: () => setConfirmDialog((prev) => ({ ...prev, show: false })),
    });
  };

  const handleDeleteConfirmed = async (id: string | number | undefined) => {
    if (!id) return;
    const idStr = id.toString();

    // New (unsaved) rows — just remove from local state
    if (isNewItem(id)) {
      setSettingsList((prev) => prev.filter((item) => item.id?.toString() !== idStr));
      showToast('Draft timeline setting removed', 'success');
      return;
    }

    setSaving(true);
    try {
      // DELETE → /api/timeline-settings/{id}?permanent=false
      const response = await fetch(
        `${API_BASE_URL}/api/timeline-settings/${idStr}?permanent=true`,
        {
          method: 'DELETE',
          headers: { 'X-API-Key': EXCEL_API_KEY },
        }
      );

      if (response.ok) {
        showToast('Timeline setting deleted successfully!', 'success');
        fetchSettings(); // re-sync from server
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(
          `Failed to delete: ${errorData.detail ?? 'Unknown error'}`,
          'error'
        );
      }
    } catch (error) {
      console.error('Error deleting timeline setting:', error);
      showToast('An error occurred while deleting', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const parseErrorMessage = async (response: Response): Promise<string> => {
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          return errorData.detail
            .map((err: { loc?: string[]; msg?: string }) =>
              err.loc && err.msg ? `${err.loc.join('.')}: ${err.msg}` : JSON.stringify(err)
            )
            .join(', ');
        }
        return typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
      }
      return errorData.message ?? JSON.stringify(errorData);
    } catch {
      return `HTTP ${response.status}: Could not parse error response`;
    }
  };

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' = 'success',
    duration = 4000
  ) => {
    setToast({ show: true, message, type });
    if (type !== 'warning') {
      setTimeout(() => setToast((prev) => ({ ...prev, show: false })), duration);
    }
  };

  const isNewItem = (itemId: string | number | undefined) =>
    itemId?.toString().startsWith('new-') ?? false;

  const hasUnsavedChanges = (itemId: string | number | undefined) => {
    if (!itemId) return false;
    return editingId === itemId.toString() || unsavedChanges.has(itemId.toString());
  };

  // ─── Render helpers ───────────────────────────────────────────────────────────
  const renderDropdown = (
    item: TimelineSettingsData,
    field: keyof TimelineSettingsData,
    options: DropdownOption[]
  ) => {
    const isEditing = editingId === item.id?.toString() && editingField === field;
    const value = item[field] as string;

    if (isEditing) {
      return (
        <div className="relative">
          <select
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleEditSave(item.id, field)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave(item.id, field);
              else if (e.key === 'Escape') handleEditCancel();
            }}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:border-blue-600 bg-white text-xs"
            autoFocus
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-6 top-1 flex space-x-1">
            <button
              onClick={() => handleEditSave(item.id, field)}
              className="text-green-600 hover:text-green-800"
            >
              <Check className="h-3 w-3" />
            </button>
            <button onClick={handleEditCancel} className="text-red-600 hover:text-red-800">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : value;

    return (
      <div
        onClick={() => handleEditStart(item.id, field, value)}
        className="w-full px-2 py-2 min-h-[32px] cursor-text hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-colors duration-150 flex items-center justify-between"
      >
        <span className={`text-xs ${!displayValue ? 'text-gray-400' : 'text-gray-900'}`}>
          {displayValue || 'Click to select...'}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
      </div>
    );
  };

  const renderEditableCell = (
    item: TimelineSettingsData,
    field: keyof TimelineSettingsData,
    placeholder: string,
    type = 'text'
  ) => {
    const isEditing = editingId === item.id?.toString() && editingField === field;
    const value = item[field] as string;

    if (isEditing) {
      return (
        <div className="relative">
          <input
            type={type}
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleEditSave(item.id, field)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave(item.id, field);
              else if (e.key === 'Escape') handleEditCancel();
            }}
            className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:border-blue-600 text-xs"
            autoFocus
          />
          <div className="absolute right-1 top-1 flex space-x-1">
            <button
              onClick={() => handleEditSave(item.id, field)}
              className="text-green-600 hover:text-green-800"
            >
              <Check className="h-3 w-3" />
            </button>
            <button onClick={handleEditCancel} className="text-red-600 hover:text-red-800">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => handleEditStart(item.id, field, value)}
        className="w-full px-2 py-2 min-h-[32px] cursor-text hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded transition-colors duration-150 flex items-center"
      >
        <span className={`text-xs ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
          {value || placeholder}
        </span>
      </div>
    );
  };

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (loading || optionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-gray-800">Timeline Settings</h2>
          <button
            onClick={handleAddNew}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add row</span>
          </button>
        </div>

        {/* Table */}
        <div className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  {[
                    'Name',
                    'Financial Year',
                    'Result Type',
                    'Reporting Period',
                    'Description',
                    'Status',
                    'Actions',
                  ].map((col, i, arr) => (
                    <th
                      key={col}
                      className={`px-3 py-2 text-left text-xs font-semibold text-gray-700 ${i < arr.length - 1 ? 'border-r border-gray-200' : ''
                        } ${col === 'Actions' ? 'text-center' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settingsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 text-xs"
                    >
                      No timeline settings found. Click &quot;Add row&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  settingsList.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${hasUnsavedChanges(item.id) ? 'bg-yellow-50' : ''
                        } ${isNewItem(item.id) ? 'bg-blue-50' : ''}`}
                    >
                      {/* Name */}
                      <td className="px-2 py-1 border-r border-gray-100 min-w-[130px]">
                        {renderEditableCell(item, 'name', 'Click to edit...')}
                      </td>

                      {/* Financial Year */}
                      <td className="px-2 py-1 border-r border-gray-100 min-w-[120px]">
                        {renderEditableCell(item, 'financial_year', 'Click to edit...')}
                      </td>

                      {/* Result Type */}
                      <td className="px-2 py-1 border-r border-gray-100 min-w-[130px]">
                        {renderDropdown(item, 'result_type', resultTypeOptions)}
                      </td>

                      {/* Reporting Period */}
                      <td className="px-2 py-1 border-r border-gray-100 min-w-[150px]">
                        {renderDropdown(item, 'reporting_period', reportingPeriodOptions)}
                      </td>

                      {/* Description */}
                      <td className="px-2 py-1 border-r border-gray-100 min-w-[150px]">
                        {renderEditableCell(item, 'description', 'Click to edit...')}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-1 border-r border-gray-100">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${item.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-1 text-center">
                        <div className="flex justify-center items-center space-x-1">
                          {isNewItem(item.id) || hasUnsavedChanges(item.id) ? (
                            <button
                              onClick={() => handleSaveToAPI(item.id)}
                              disabled={saving}
                              title="Save"
                              className="p-1 rounded hover:bg-green-50 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              ) : (
                                <Save className="h-4 w-4 text-green-500" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(item.id?.toString() ?? null);
                                setEditingField('name');
                                setEditValue(item.name);
                              }}
                              title="Edit"
                              className="p-1 rounded hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            disabled={saving}
                            title="Delete"
                            className="p-1 rounded hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Confirm Dialog ── */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-base font-semibold mb-3 text-gray-800">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg text-white text-sm z-50 ${toast.type === 'success'
            ? 'bg-green-500'
            : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-yellow-500'
            }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default TimelineSettingsForm;