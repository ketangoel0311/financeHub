"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { ProtectedRoute } from "./protected-route";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 p-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
