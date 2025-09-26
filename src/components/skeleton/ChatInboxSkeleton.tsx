// src/components/ChatInboxSkeleton.tsx

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ChatListItemSkeleton = () => (
  <div className="flex items-center gap-4 p-3">
    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-1/6" />
      </div>
      <Skeleton className="h-4 w-4/5" />
    </div>
  </div>
);

const ChatInboxSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-screen w-full gap-6 p-6">
      {/* Left Sidebar Skeleton */}
      <aside className="flex flex-col border bg-card p-4 rounded-xl max-h-screen">
        <Skeleton className="h-8 w-32 mb-4 px-2" />
        <div className="flex items-center gap-2 p-2 border-b">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
        <div className="px-2 my-4">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {[...Array(8)].map((_, i) => (
            <ChatListItemSkeleton key={i} />
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 pt-4 border-t">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </aside>

      {/* Main Chat Area Skeleton */}
      <main className="flex flex-col bg-card border rounded-xl max-h-screen">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="flex flex-col items-center">
            <Skeleton className="h-4 w-28" />
          </div>
          {/* Customer Message */}
          <div className="flex flex-col items-start">
            <Skeleton className="h-16 w-3/5 rounded-2xl" />
            <Skeleton className="h-3 w-16 mt-1.5" />
          </div>
          {/* Agent Message */}
          <div className="flex flex-col items-end">
            <Skeleton className="h-20 w-1/2 rounded-2xl" />
            <Skeleton className="h-3 w-16 mt-1.5" />
          </div>
          {/* Customer Message */}
          <div className="flex flex-col items-start">
            <Skeleton className="h-12 w-2/5 rounded-2xl" />
            <Skeleton className="h-3 w-16 mt-1.5" />
          </div>
        </div>
        <div className="p-6 border-t">
          <div className="relative">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="absolute right-3 bottom-2.5 h-9 w-9" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatInboxSkeleton;