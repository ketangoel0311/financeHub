"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Coffee,
  ShoppingCart,
  ArrowLeftRight,
  Wifi,
  Zap,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format, formatDistanceToNow } from "date-fns";

interface Transaction {
  _id: string;
  description: string;
  category: string;
  recipientName: string;
  amount: number;
  type: string;
  createdAt: string;
}

const tabs = ["All", "Expense", "Income"];

const getIconForCategory = (category: string, type: string) => {
  const c = (category || "").toLowerCase();
  if (type === "income")
    return { icon: ArrowDownLeft, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" };
  if (c.includes("food") || c.includes("drink") || c.includes("cafe"))
    return { icon: Coffee, iconBg: "bg-amber-100", iconColor: "text-amber-600" };
  if (c.includes("grocery") || c.includes("market"))
    return { icon: ShoppingCart, iconBg: "bg-rose-100", iconColor: "text-rose-600" };
  if (c.includes("internet") || c.includes("wifi"))
    return { icon: Wifi, iconBg: "bg-blue-100", iconColor: "text-blue-600" };
  if (c.includes("electric") || c.includes("utility"))
    return { icon: Zap, iconBg: "bg-yellow-100", iconColor: "text-yellow-600" };
  if (c.includes("transfer"))
    return { icon: ArrowLeftRight, iconBg: "bg-violet-100", iconColor: "text-violet-600" };
  return { icon: ArrowUpRight, iconBg: "bg-orange-100", iconColor: "text-orange-600" };
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return formatDistanceToNow(d, { addSuffix: false });
    return format(d, "MMM d");
  } catch {
    return "";
  }
};

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<{ totalIncome: number; totalExpense: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const typeParam =
        activeTab === "All" ? undefined : activeTab.toLowerCase();
      const data = await api.getTransactions({
        limit: 50,
        type: typeParam,
        search: searchQuery || undefined,
      });
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      setTransactions([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesTab = activeTab === "All" || t.type === activeTab.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.recipientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = Math.abs(summary?.totalExpense ?? 0);

  return (
    <DashboardLayout>
      <Header title="Transaction" />
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalIncome.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                  <ArrowUpRight className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Expense</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalExpense.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <ArrowLeftRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold text-foreground">
                    {transactions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6 border-b pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "text-sm font-medium pb-2 border-b-2 transition-colors -mb-[18px]",
                    activeTab === tab
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions found. Transfers and activity will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const { icon: Icon, iconBg, iconColor } = getIconForCategory(
                    transaction.category,
                    transaction.type
                  );
                  const isIncome = transaction.type === "income";
                  const displayAmount = isIncome ? transaction.amount : Math.abs(transaction.amount);
                  return (
                    <Link
                      key={transaction._id}
                      href={`/transactions/${transaction._id}`}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full",
                          iconBg
                        )}
                      >
                        <Icon className={cn("h-6 w-6", iconColor)} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.recipientName || transaction.category || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-semibold",
                            isIncome ? "text-emerald-500" : "text-foreground"
                          )}
                        >
                          {isIncome ? "+" : "-"}${displayAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
