"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, ShoppingCart, ArrowLeftRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface Transaction {
  _id: string;
  description: string;
  category: string;
  recipientName: string;
  amount: number;
  type: string;
}

const getIconForCategory = (category: string) => {
  switch (category.toLowerCase()) {
    case "food & drinks":
      return { icon: Coffee, iconBg: "bg-amber-100", iconColor: "text-amber-600" };
    case "groceries":
      return { icon: ShoppingCart, iconBg: "bg-rose-100", iconColor: "text-rose-600" };
    default:
      return { icon: ArrowLeftRight, iconBg: "bg-violet-100", iconColor: "text-violet-600" };
  }
};

const tabs = ["All", "Expense", "Income"];

export function TransactionsPanel() {
  const [activeTab, setActiveTab] = useState("All");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await api.getTransactions({ limit: 5 });
        setTransactions(data.transactions || []);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (activeTab === "All") return true;
    if (activeTab === "Expense") return t.type === "expense";
    if (activeTab === "Income") return t.type === "income";
    return true;
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Transactions</CardTitle>
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm font-medium transition-colors",
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions found</p>
            ) : (
              filteredTransactions.map((transaction) => {
                const { icon: Icon, iconBg, iconColor } = getIconForCategory(transaction.category);
                const isIncome = transaction.type === "income";
                return (
                  <Link
                    key={transaction._id}
                    href={`/transactions/${transaction._id}`}
                    className="flex items-center gap-3 hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  >
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconBg)}>
                      <Icon className={cn("h-5 w-5", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground truncate">{transaction.recipientName}</p>
                    </div>
                    <p className={cn("text-sm font-semibold", isIncome ? "text-emerald-500" : "text-foreground")}>
                      {isIncome ? "+" : "-"}${transaction.amount.toFixed(2)}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
