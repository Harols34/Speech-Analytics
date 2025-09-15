
import React from "react";

export default function CallDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 bg-secondary rounded-lg w-1/3"></div>
      <div className="h-64 bg-secondary rounded-lg"></div>
      <div className="h-96 bg-secondary rounded-lg"></div>
    </div>
  );
}
