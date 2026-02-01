"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { BalanceCards } from "@/components/dashboard/balance-cards";
import { StatisticsChart } from "@/components/dashboard/statistics-chart";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { SpendingOverview } from "@/components/dashboard/spending-overview";
import { TransactionsPanel } from "@/components/dashboard/transactions-panel";
import { QuickTransfer } from "@/components/dashboard/quick-transfer";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="flex gap-6">
        <div className="flex-1 space-y-6">
          <Header title="Dashboard" />
          <BalanceCards />
          <StatisticsChart />
          <div className="grid grid-cols-2 gap-4">
            <GoalsCard />
          </div>
        </div>
        <div className="w-80 space-y-6">
          <div className="h-10" />
          <TransactionsPanel />
          <QuickTransfer />
          <SpendingOverview />
        </div>
      </div>
    </DashboardLayout>
  );
}
