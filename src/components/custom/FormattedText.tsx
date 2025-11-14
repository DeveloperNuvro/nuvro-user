import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

// Helper function to detect URLs
const urlRegex = /(https?:\/\/[^\s]+)/g;
const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;

// Helper function to format text with links and line breaks
const formatText = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Split by URLs first, then by emails, then by newlines
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Find all URLs and emails
  const matches: Array<{ type: 'url' | 'email'; start: number; end: number; text: string }> = [];
  
  // Find URLs
  let urlMatch;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    matches.push({
      type: 'url',
      start: urlMatch.index,
      end: urlMatch.index + urlMatch[0].length,
      text: urlMatch[0]
    });
  }
  
  // Find emails
  let emailMatch;
  while ((emailMatch = emailRegex.exec(text)) !== null) {
    matches.push({
      type: 'email',
      start: emailMatch.index,
      end: emailMatch.index + emailMatch[0].length,
      text: emailMatch[0]
    });
  }
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);
  
  // Remove overlapping matches (prefer URLs over emails)
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(m => 
      (match.start >= m.start && match.start < m.end) ||
      (match.end > m.start && match.end <= m.end) ||
      (match.start <= m.start && match.end >= m.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }
  
  // Build parts array
  let currentIndex = 0;
  
  for (const match of filteredMatches) {
    // Add text before match
    if (match.start > currentIndex) {
      const beforeText = text.substring(currentIndex, match.start);
      if (beforeText) {
        // Split by newlines and add as separate elements
        const lines = beforeText.split('\n');
        lines.forEach((line, lineIndex) => {
          if (line) {
            parts.push(<span key={`text-${key++}`}>{line}</span>);
          }
          if (lineIndex < lines.length - 1) {
            parts.push(<br key={`br-${key++}`} />);
          }
        });
      }
    }
    
    // Add link
    if (match.type === 'url') {
      parts.push(
        <a
          key={`link-${key++}`}
          href={match.text}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {match.text}
        </a>
      );
    } else {
      parts.push(
        <a
          key={`email-${key++}`}
          href={`mailto:${match.text}`}
          className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {match.text}
        </a>
      );
    }
    
    currentIndex = match.end;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    const lines = remainingText.split('\n');
    lines.forEach((line, lineIndex) => {
      if (line) {
        parts.push(<span key={`text-${key++}`}>{line}</span>);
      }
      if (lineIndex < lines.length - 1) {
        parts.push(<br key={`br-${key++}`} />);
      }
    });
  }
  
  // If no matches, just split by newlines
  if (parts.length === 0) {
    const lines = text.split('\n');
    lines.forEach((line, lineIndex) => {
      if (line) {
        parts.push(<span key={`text-${key++}`}>{line}</span>);
      }
      if (lineIndex < lines.length - 1) {
        parts.push(<br key={`br-${key++}`} />);
      }
    });
  }
  
  return parts;
};

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  const formattedParts = formatText(text);
  
  return (
    <span className={className}>
      {formattedParts}
    </span>
  );
};

export default FormattedText;

