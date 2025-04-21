import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatFileSize = (sizeInBytes: number): string => {
  return (sizeInBytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const getFileTypeLabel = (mimeType: string, fileName: string): string => {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'application/zip':
      return 'zip';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return 'docx';
    case 'text/plain':
      return 'txt';
    default:
      return fileName.split('.').pop() || 'unknown';
  }
};


export const countTextCharacters = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      resolve(content.length);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};