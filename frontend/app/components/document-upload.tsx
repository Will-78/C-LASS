"use client";

import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

type DocumentUploadProps = {
  onFileUploadSuccess: () => void
  onCancel: () => void
};

type PreviewFile = File & { preview: string };

export default function DocumentUpload({
  onFileUploadSuccess,
  onCancel
}: DocumentUploadProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [status, setStatus] = useState("");

  const removeFile = (fileIndex: number) => {
    setFiles(prev => {
      const target = prev[fileIndex];
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((_, index) => index !== fileIndex);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"]
    },
    onDrop: acceptedFiles => {
      const newFiles = acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
      }));
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  });

  const onUpload = async() => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      setStatus("Uploading...");
      await axios.post("/api/document-kg-builder", formData);
      setStatus("Success! Files uploaded.");
      clearFiles();
      onFileUploadSuccess();

    } catch (error) {
      setStatus("Error uploading files.");
    }
  }

  const clearFiles = () => {
      files.forEach(file => URL.revokeObjectURL(file.preview));
      setFiles([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-xl relative">
        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"}`}
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">
            Drag docs here, or <span className="text-blue-600 font-semibold">select files</span><br />
            Accepted File Type: .pdf
          </p>
        </div>
        
        {/* File preview */}
        <ul className="mt-6 space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded border border-gray-200">
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-xs font-bold text-gray-500 hover:text-gray-600"
              >
                X
              </button>
              <span className="text-sm truncate text-gray-700 w-48">{file.name}</span>
              <div className="flex items-center gap-2">
                <a 
                  href={file.preview} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  PREVIEW
                </a>
              </div>
            </li>
          ))}
        </ul>
        
        <button
          onClick={onUpload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Build KG
        </button>
        <button
          onClick={() => {
            clearFiles();
            setStatus("");
            onCancel();
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Cancel
        </button>
        <div className="text-gray-600">
          {status}
        </div>
      </div>
    </div>
  );
};