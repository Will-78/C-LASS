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
    <div className="kg-upload-overlay fixed inset-0 z-50 flex items-center justify-center bg-sky-950/20 backdrop-blur-sm">
      <div className="kg-upload-card relative mx-auto w-full max-w-md rounded-2xl border border-sky-200 bg-white/95 p-6 shadow-xl shadow-sky-100">
        {/* Dropzone */}
        <div 
          {...getRootProps()} 
          className={`kg-upload-dropzone cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors
            ${isDragActive ? "border-sky-500 bg-sky-100" : "border-sky-300 bg-sky-50 hover:bg-sky-100/60"}`}
        >
          <input {...getInputProps()} />
          <p className="text-sky-800">
            Drag docs here, or <span className="font-semibold text-sky-600">select files</span><br />
            Accepted File Type: .pdf
          </p>
        </div>
        
        {/* File preview */}
        <ul className="mt-6 space-y-2">
          {files.map((file, index) => (
            <li key={index} className="kg-upload-file flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3">
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-xs font-bold text-sky-500 hover:text-sky-700"
              >
                X
              </button>
              <span className="w-48 truncate text-sm text-sky-900">{file.name}</span>
              <div className="flex items-center gap-2">
                <a 
                  href={file.preview} 
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-sky-600 hover:underline"
                >
                  PREVIEW
                </a>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="mt-5 flex gap-3">
          <button
            onClick={onUpload}
            className="kg-upload-primary rounded-xl bg-sky-500 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-400"
          >
            Build KG
          </button>
          <button
            onClick={() => {
              clearFiles();
              setStatus("");
              onCancel();
            }}
            className="kg-upload-secondary rounded-xl border border-sky-300 bg-white px-4 py-2 font-bold text-sky-700 transition-colors hover:bg-sky-50"
          >
            Cancel
          </button>
        </div>
        <div className="mt-3 text-sky-700">
          {status}
        </div>
      </div>
    </div>
  );
};
