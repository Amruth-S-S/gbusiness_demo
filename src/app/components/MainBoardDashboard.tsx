"use client"

// components/MainBoardDashboard.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

type CalculatedKeyFigure = {
    name: string;
    display_name: string;
    formula: string;
    description: string;
    referenced_columns: string[];
    created_at: string;
};

type ParameterSetting = {
    id: string | number;
    table_name: string;
    calculated_key_figures: CalculatedKeyFigure[];
};

type Board = {
    id: string;
    name: string;
    parameter_settings: ParameterSetting[];
};

type MainBoardData = {
    id: string;
    name: string;
    boards: Board[];
};

const MainBoardDashboard = () => {
    const router = useRouter();
    const { main_board_id } = router.query;
    
    const [mainBoardData, setMainBoardData] = useState<MainBoardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadingCalculatedFields, setLoadingCalculatedFields] = useState<{[key: string]: boolean}>({});

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''; 
     const EXCEL_API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

    useEffect(() => {
        if (main_board_id) {
            const id = Array.isArray(main_board_id) ? main_board_id[0] : main_board_id;
            fetchMainBoardData(id);
        }
    }, [main_board_id]);

    const fetchMainBoardData = async (mainBoardId: string) => {
        try {
            setLoading(true);
            setError(null);

            // First, fetch all parameter settings to get main board info
            const parameterResponse = await fetch(
                `${API_BASE_URL}/main-boards/boards/parameter-settings/?active_only=false`,
                {
                    headers: {
                        "X-API-Key": EXCEL_API_KEY
                    }
                }
            );

            if (!parameterResponse.ok) {
                throw new Error('Failed to fetch parameter settings');
            }

            const allParameterSettings = await parameterResponse.json();
            
            // Group parameter settings by main board and board
            const boardsMap: {[key: string]: {name: string, parameter_settings: any[]}} = {};
            let mainBoardName = 'Main Board';

            // Process each parameter setting
            for (const setting of allParameterSettings) {
                // Try to get board info to find the main board
                try {
                    const boardResponse = await fetch(
                        `${API_BASE_URL}/main-boards/boards/${setting.board_id || 'unknown'}`,
                        {
                            headers: {
                                "X-API-Key": EXCEL_API_KEY
                            }
                        }
                    );

                    if (boardResponse.ok) {
                        const boardData = await boardResponse.json();
                        
                        // Check if this board belongs to our main board
                        if (boardData.main_board_id == mainBoardId) {
                            if (!boardsMap[boardData.id]) {
                                boardsMap[boardData.id] = {
                                    name: boardData.name,
                                    parameter_settings: []
                                };
                            }
                            boardsMap[boardData.id].parameter_settings.push(setting);
                            
                            // Try to get main board name
                            if (boardData.main_board_name) {
                                mainBoardName = boardData.main_board_name;
                            }
                        }
                    }
                } catch (boardError) {
                    console.error('Error fetching board info:', boardError);
                }
            }

            // Fetch calculated key figures for each parameter setting
            const boardsWithCalculatedFields = await Promise.all(
                Object.entries(boardsMap).map(async ([boardId, boardInfo]) => {
                    const parameterSettingsWithCalcFields = await Promise.all(
                        boardInfo.parameter_settings.map(async (setting) => {
                            try {
                                setLoadingCalculatedFields(prev => ({ ...prev, [setting.id]: true }));
                                
                                const calcResponse = await fetch(
                                    `${API_BASE_URL}/main-boards/boards/parameter-settings/${setting.id}/calculated-key-figures`,
                                    {
                                        headers: {
                                            "X-API-Key": EXCEL_API_KEY
                                        }
                                    }
                                );

                                if (calcResponse.ok) {
                                    const calcData = await calcResponse.json();
                                    return {
                                        ...setting,
                                        calculated_key_figures: calcData.calculated_key_figures || []
                                    };
                                } else {
                                    return {
                                        ...setting,
                                        calculated_key_figures: []
                                    };
                                }
                            } catch (calcError) {
                                console.error(`Error fetching calculated fields for setting ${setting.id}:`, calcError);
                                return {
                                    ...setting,
                                    calculated_key_figures: []
                                };
                            } finally {
                                setLoadingCalculatedFields(prev => ({ ...prev, [setting.id]: false }));
                            }
                        })
                    );

                    return {
                        id: boardId,
                        name: boardInfo.name,
                        parameter_settings: parameterSettingsWithCalcFields
                    };
                })
            );

            setMainBoardData({
                id: mainBoardId,
                name: mainBoardName,
                boards: boardsWithCalculatedFields
            });

        } catch (err) {
            console.error('Error fetching main board data:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-600">Loading main board dashboard...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
        <p className="text-red-600">{error}</p>
        <button 
            onClick={() => {
                if (main_board_id) {
                    const id = Array.isArray(main_board_id) ? main_board_id[0] : main_board_id;
                    fetchMainBoardData(id);
                }
            }}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
            Retry
        </button>
    </div>
</div>
        );
    }

    if (!mainBoardData) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="text-center text-gray-600">
                    No main board data found.
                </div>
            </div>
        );
    }

    const totalCalculatedFields = mainBoardData.boards.reduce(
        (total, board) => total + board.parameter_settings.reduce(
            (boardTotal, setting) => boardTotal + setting.calculated_key_figures.length, 0
        ), 0
    );

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{mainBoardData.name}</h1>
                        <p className="text-gray-600 mt-2">
                            {mainBoardData.boards.length} board(s) • {totalCalculatedFields} calculated field(s)
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                    >
                        ← Back
                    </button>
                </div>
            </div>

            {/* Boards Grid */}
            <div className="space-y-6">
                {mainBoardData.boards.map((board) => (
                    <div key={board.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        {/* Board Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                            <h2 className="text-xl font-semibold">{board.name}</h2>
                            <p className="text-blue-100 text-sm mt-1">
                                {board.parameter_settings.length} parameter table(s)
                            </p>
                        </div>

                        {/* Parameter Settings and Calculated Key Figures */}
                        <div className="p-4">
                            {board.parameter_settings.length > 0 ? (
                                <div className="space-y-4">
                                    {board.parameter_settings.map((setting, settingIndex) => (
                                        <div key={settingIndex} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-lg font-medium text-gray-800">
                                                    {setting.table_name || 'Parameter Table'}
                                                </h3>
                                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {setting.calculated_key_figures.length} calculated field(s)
                                                </span>
                                            </div>

                                            {loadingCalculatedFields[setting.id] ? (
                                                <div className="flex justify-center py-4">
                                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="ml-2 text-gray-600">Loading calculated fields...</span>
                                                </div>
                                            ) : setting.calculated_key_figures.length > 0 ? (
                                                <div className="space-y-3">
                                                    {setting.calculated_key_figures.map((field, fieldIndex) => (
                                                        <div key={fieldIndex} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-medium">
                                                                        {field.name}
                                                                    </span>
                                                                </div>

                                                                {field.display_name && field.display_name !== field.name && (
                                                                    <div className="text-sm text-gray-600">
                                                                        <strong>Display:</strong> {field.display_name}
                                                                    </div>
                                                                )}

                                                                <div className="text-sm text-gray-800 font-mono bg-gray-100 px-3 py-2 rounded">
                                                                    <strong>Formula:</strong> {field.formula}
                                                                </div>

                                                                {field.referenced_columns && field.referenced_columns.length > 0 && (
                                                                    <div className="text-sm">
                                                                        <span className="text-gray-600"><strong>Referenced Columns:</strong> </span>
                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                            {field.referenced_columns.map((col, colIndex) => (
                                                                                <span key={colIndex} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                                                                    {col}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {field.description && (
                                                                    <div className="text-sm text-gray-600 italic">
                                                                        <strong>Description:</strong> {field.description}
                                                                    </div>
                                                                )}

                                                                {field.created_at && (
                                                                    <div className="text-xs text-gray-500">
                                                                        Created: {new Date(field.created_at).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-gray-500">
                                                    <div className="text-2xl mb-2">📊</div>
                                                    <p>No calculated key figures found for this parameter table.</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-4">📊</div>
                                    <p>No parameter tables found for this board.</p>
                                </div>
                            )}
                        </div>

                        {/* Board Actions */}
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                            <button
                                onClick={() => router.push(`/Container?main_board_id=${mainBoardData.id}&board_id=${board.id}`)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                            >
                                Open Board Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {mainBoardData.boards.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Boards Found</h3>
                    <p className="text-gray-500">This main board doesn't have any boards yet.</p>
                </div>
            )}
        </div>
    );
};

export default MainBoardDashboard;