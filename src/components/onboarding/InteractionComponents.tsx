import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FaPlus, FaTimes, FaUpload, FaStar, FaFile, FaFilePdf, FaFileWord } from 'react-icons/fa';

// Resume upload component
export function ResumeUploader({ onFileSelect }: { onFileSelect: (file: File) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [hovering, setHovering] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            console.log("No files selected");
            return;
        }
        console.log("File selected:", files[0].name);
        onFileSelect(files[0]);
    };

    // Function to programmatically click the hidden file input
    const triggerFileInput = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log("Triggering file input click");
        if (fileInputRef.current) {
            fileInputRef.current.click();
        } else {
            console.error("File input ref is null");
        }
    };

    // Handle drag events
    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    // Handle drop event
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    // Determine file icon based on file extension
    const getFileIcon = (extension: string) => {
        switch (extension.toLowerCase()) {
            case 'pdf':
                return <FaFilePdf className="mr-2 text-red-500" />;
            case 'doc':
            case 'docx':
                return <FaFileWord className="mr-2 text-blue-500" />;
            default:
                return <FaFile className="mr-2 text-gray-500" />;
        }
    };

    return (
        <div className="w-full mt-4">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                aria-label="Upload resume file"
            />

            {/* Drop zone / Click area */}
            <div
                className={`relative p-8 border-2 border-dashed rounded-lg cursor-pointer text-center transition-all duration-300
                    ${dragActive
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : hovering
                            ? "border-blue-400 bg-blue-50 shadow-sm"
                            : "border-blue-200 hover:border-blue-400 hover:bg-blue-50"}`}
                onClick={triggerFileInput}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
            >
                <div className="flex flex-col items-center justify-center">
                    <div className={`w-16 h-16 flex items-center justify-center rounded-full mb-4 ${dragActive ? 'bg-blue-100' : 'bg-blue-50'} transition-colors duration-300`}>
                        <FaUpload className="h-8 w-8 text-blue-500" />
                    </div>

                    <h3 className="font-semibold text-lg text-blue-700 mb-1">
                        {dragActive ? "Drop your resume here" : "Upload your resume"}
                    </h3>

                    <p className="text-sm text-gray-500 mb-4">
                        Drag and drop your file here or click to browse
                    </p>

                    <Button
                        onClick={triggerFileInput}
                        className="relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-all duration-300 transform hover:scale-105"
                        type="button"
                    >
                        <span className="flex items-center">
                            <FaUpload className="mr-2" />
                            Select File
                        </span>
                    </Button>

                    <div className="flex mt-6 justify-center space-x-6">
                        <div className="flex items-center">
                            {getFileIcon('pdf')}
                            <span className="text-xs text-gray-500">PDF</span>
                        </div>
                        <div className="flex items-center">
                            {getFileIcon('doc')}
                            <span className="text-xs text-gray-500">DOC/DOCX</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4">
                        Max file size: 10MB
                    </p>
                </div>
            </div>
        </div>
    );
}

// Option selector component for multiple choice selections
export function OptionSelector({
    options,
    onSelect,
    selectedValues = [],
    multiSelect = false
}: {
    options: { value: string; label: string; icon?: React.ReactNode }[];
    onSelect: (value: string) => void;
    selectedValues?: string[];
    multiSelect?: boolean;
}) {
    return (
        <div className="w-full mt-4 flex flex-wrap gap-2">
            {options.map((option) => (
                <Badge
                    key={option.value}
                    variant="outline"
                    className={`h-9 px-4 py-2 rounded-full cursor-pointer flex items-center
            ${selectedValues.includes(option.value)
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300'}`}
                    onClick={() => onSelect(option.value)}
                >
                    {option.icon && <span className="mr-1.5">{option.icon}</span>}
                    {option.label}
                </Badge>
            ))}
        </div>
    );
}

// For text inputs that add to a list (e.g. skills input)
export function TextInputWithAdd({
    placeholder,
    onAdd,
    validateInput,
    existingItems = [],
    addButtonText = "Add"
}: {
    placeholder: string;
    onAdd: (item: string) => void;
    validateInput?: (input: string) => string | null;
    existingItems?: string[];
    addButtonText?: string;
}) {
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        if (error) setError(null);
    };

    const handleAdd = () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) {
            setError("Please enter a value");
            return;
        }

        // Check if item already exists
        if (existingItems.includes(trimmedInput)) {
            setError("This item already exists");
            return;
        }

        // Custom validation if provided
        if (validateInput) {
            const validationError = validateInput(trimmedInput);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        setIsAdding(true);

        // Simulate adding delay for better UX
        setTimeout(() => {
            onAdd(trimmedInput);
            setInput("");
            setIsAdding(false);
            inputRef.current?.focus();
        }, 300);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="relative w-full">
            <div className="flex items-stretch gap-2">
                <div className="relative flex-grow">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={`w-full h-10 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200
                            ${error
                                ? 'border-red-300 focus:ring-red-200'
                                : 'border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                            }
                        `}
                        disabled={isAdding}
                        aria-invalid={!!error}
                        aria-describedby={error ? "input-error" : undefined}
                    />
                    {error && (
                        <div
                            id="input-error"
                            className="absolute left-0 -bottom-5 text-xs text-red-500 mt-1 animate-fadeIn"
                        >
                            {error}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isAdding || !input.trim()}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200
                        ${isAdding
                            ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                            : !input.trim()
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                        }
                    `}
                >
                    {isAdding ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Adding
                        </span>
                    ) : (
                        addButtonText
                    )}
                </button>
            </div>
        </div>
    );
}

// For displaying selected items with delete functionality (job titles, skills, locations, etc.)
export function SelectedItemsDisplay({
    items,
    onRemove,
    highlightable = false,
    onToggleHighlight,
    highlightedItems = []
}: {
    items: string[];
    onRemove: (item: string) => void;
    highlightable?: boolean;
    onToggleHighlight?: (item: string) => void;
    highlightedItems?: string[];
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {items.map(item => {
                const isHighlighted = highlightable && highlightedItems.includes(item);

                return (
                    <div
                        key={item}
                        className={`
                            group relative flex items-center px-4 py-2 rounded-full border transition-all duration-200
                            ${isHighlighted
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300'
                                : 'bg-white text-slate-700 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                            }
                        `}
                    >
                        {isHighlighted && (
                            <FaStar className="h-3 w-3 text-yellow-500 mr-2 flex-shrink-0" />
                        )}

                        <span className="text-sm font-medium">{item}</span>

                        <div className="flex items-center ml-2 space-x-1">
                            {highlightable && (
                                <button
                                    type="button"
                                    onClick={() => onToggleHighlight?.(item)}
                                    className={`
                                        rounded-full p-1.5 transition-all duration-200
                                        ${isHighlighted
                                            ? 'text-yellow-500 hover:text-yellow-600 hover:bg-green-200'
                                            : 'text-slate-400 hover:text-yellow-500 hover:bg-blue-100'
                                        }
                                    `}
                                    aria-label={isHighlighted ? "Unhighlight skill" : "Highlight skill"}
                                    title={isHighlighted ? "Unhighlight skill" : "Highlight skill"}
                                >
                                    <FaStar className="h-3 w-3" />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => onRemove(item)}
                                className="rounded-full p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                                aria-label="Remove item"
                                title="Remove item"
                            >
                                <FaTimes className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Yes/No toggle
export function BooleanToggle({
    label,
    value,
    onChange
}: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between space-x-2 mt-4">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {label}
            </label>
            <Switch
                checked={value}
                onCheckedChange={onChange}
            />
        </div>
    );
}

// Component for displaying suggested items that can be added
export function SuggestedItems({
    items,
    onAdd,
    currentItems = []
}: {
    items: string[];
    onAdd: (item: string) => void;
    currentItems?: string[];
}) {
    return (
        <div className="mt-4">
            <p className="text-sm font-medium mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
                {items.map(item => (
                    !currentItems.includes(item) && (
                        <Badge
                            key={item}
                            variant="outline"
                            className="h-9 px-4 py-2 rounded-full cursor-pointer hover:bg-blue-50 border-blue-200"
                            onClick={() => onAdd(item)}
                        >
                            <FaStar className="h-3 w-3 text-yellow-500 mr-1" />
                            {item}
                            <FaPlus className="h-3 w-3 ml-2 text-muted-foreground" />
                        </Badge>
                    )
                ))}
            </div>
        </div>
    );
}

// Confirmation buttons (e.g. Looks Good / No, I want to add comment)
export function ConfirmationButtons({
    onConfirm,
    onReject,
    confirmText = "Looks Good",
    rejectText = "No, I want to add comment",
    disabled = false
}: {
    onConfirm: () => void;
    onReject: () => void;
    confirmText?: string;
    rejectText?: string;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-2 mt-4 justify-end">
            <Button
                onClick={onConfirm}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={disabled}
            >
                {confirmText}
            </Button>
            <Button
                onClick={onReject}
                variant="outline"
                className="border-gray-200"
                disabled={disabled}
            >
                {rejectText}
            </Button>
        </div>
    );
} 