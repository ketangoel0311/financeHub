"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const colors = ["bg-cyan-500", "bg-primary", "bg-amber-400", "bg-emerald-500", "bg-rose-500", "bg-muted"];

interface SpendingItem {
  category: string;
  percentage: number;
}

export function SpendingOverview() {
  const [spending, setSpending] = useState<SpendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboard();
        setSpending(data.spendingOverview || []);
      } catch {
        setSpending([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Spending Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : spending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spending data yet. Transactions will appear here.</p>
        ) : (
          spending.map((item, i) => (
            <div key={item.category} className="flex items-center gap-3">
              <div
                className={`h-3 rounded-full ${colors[i % colors.length]}`}
                style={{ width: `${Math.max(8, item.percentage * 2)}px` }}
              />
              <span className="text-sm text-muted-foreground">
                {item.percentage}% {item.category}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
