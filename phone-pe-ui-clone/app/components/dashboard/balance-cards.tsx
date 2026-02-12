"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

export function BalanceCards() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await api.getDashboard();
        if (data.statistics && data.statistics.length > 0) {
          setChartData(
            data.statistics.map((s: { day: string; expense: number; income: number }) => ({
              name: s.day.replace("Day ", ""),
              value: s.income - s.expense
            }))
          );
        }
      } catch {
        setChartData([]);
      }
    };
    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalBalance = user?.totalBalance ?? 0;
  const totalIncome = user?.totalIncome ?? 0;
  const totalExpense = user?.totalExpense ?? 0;
  const totalSavings = user?.totalSavings ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Total Balance</span>
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">
            {formatCurrency(totalBalance)}
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Expense</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Total Savings</span>
          </div>
          <p className="text-3xl font-bold text-foreground mb-4">
            {formatCurrency(totalSavings)}
          </p>
          <div className="h-12">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <Bar
                    dataKey="value"
                    fill="hsl(217, 91%, 60%)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center text-xs text-muted-foreground">
                No activity yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
