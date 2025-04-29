import { useState, useRef } from 'react';
import { FaFileUpload, FaFile, FaTrash, FaSpinner } from 'react-icons/fa';

export function ResumeUploader({
    onUpload,
    onError,
    maxSizeMB = 5
}: {
    onUpload: (file: File, text: string) => void;
    onError: (error: string) => void;
    maxSizeMB?: number;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile) return;

        // Validate file type
        if (!selectedFile.type.match('application/pdf') &&
            !selectedFile.type.match('application/msword') &&
            !selectedFile.type.match('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
            onError('Only PDF and Word documents are supported');
            return;
        }

        // Validate file size
        if (selectedFile.size > maxSizeBytes) {
            onError(`File size exceeds ${maxSizeMB}MB limit`);
            return;
        }

        try {
            setLoading(true);
            setFile(selectedFile);

            // Read the file content
            const text = await readFileContent(selectedFile);
            onUpload(selectedFile, text);
        } catch (error) {
            console.error('Error reading file:', error);
            onError('Failed to read file. Please try again.');
            setFile(null);
        } finally {
            setLoading(false);
        }
    };

    const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                if (event.target?.result) {
                    resolve(event.target.result as string);
                } else {
                    reject(new Error('Failed to read file'));
                }
            };

            reader.onerror = () => {
                reject(new Error('File read error'));
            };

            if (file.type.match('application/pdf')) {
                // For PDFs, we'll just return the file name since we can't easily read the content
                // In a real app, you'd use a PDF parser library on the server
                resolve(`PDF Document: ${file.name}`);
            } else {
                reader.readAsText(file);
            }
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const openFileSelector = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                aria-label="Upload resume"
            />

            {!file ? (
                <div
                    onClick={openFileSelector}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            w-full h-40 border-2 border-dashed rounded-lg p-4
            flex flex-col items-center justify-center gap-3 
            cursor-pointer transition-all duration-200
            ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }
          `}
                >
                    <FaFileUpload className={`h-10 w-10 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                    <div className="text-center">
                        <p className="font-medium text-slate-700">
                            {dragActive ? 'Drop your resume here' : 'Drag & drop your resume here'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">or click to browse files</p>
                        <p className="text-xs text-slate-400 mt-2">PDF or Word documents up to {maxSizeMB}MB</p>
                    </div>
                </div>
            ) : (
                <div className="w-full p-4 border rounded-lg bg-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-16">
                            <FaSpinner className="w-6 h-6 text-blue-500 animate-spin" />
                            <span className="ml-3 text-slate-700">Processing file...</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <FaFile className="w-8 h-8 text-blue-600" />
                                <div className="ml-3">
                                    <p className="font-medium text-slate-700 truncate max-w-xs">{file.name}</p>
                                    <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                            <button
                                onClick={removeFile}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                aria-label="Remove file"
                            >
                                <FaTrash className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 