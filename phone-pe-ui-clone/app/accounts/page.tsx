"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // ✅ ADDED
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Building2,
  Plus,
  Eye,
  EyeOff,
  MoreVertical,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface BankAccount {
  _id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  balance: number;
  isDefault?: boolean;
  cardNumber?: string;
  cardExpiry?: string;
  cardLimit?: number;
  cardUsed?: number;
}

export default function AccountsPage() {
  const pathname = usePathname(); // ✅ ADDED

  const [showBalances, setShowBalances] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data.accounts || []);
      setTotalBalance(data.totalBalance ?? 0);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setAccounts([]);
      setTotalBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ THIS IS THE FIX
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, pathname]);

  const bankAccounts = accounts.filter((a) => !a.cardNumber);
  const cards = accounts.filter((a) => a.cardNumber || a.cardLimit);
  const moneyIn = 0;
  const moneyOut = 0;

  return (
    <DashboardLayout>
      <Header title="Accounts and Cards" />
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    {showBalances ? `$${totalBalance.toFixed(2)}` : "••••••"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Money In (This Month)
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {showBalances ? `$${moneyIn.toFixed(2)}` : "••••••"}
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
                  <p className="text-sm text-muted-foreground">
                    Money Out (This Month)
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {showBalances ? `$${moneyOut.toFixed(2)}` : "••••••"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Accounts</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalances(!showBalances)}
                >
                  {showBalances ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-transparent"
                  asChild
                >
                  <Link href="/connect-bank">
                    <Plus className="h-4 w-4" /> Add Account
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : bankAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No bank accounts yet.{" "}
                  <Link
                    href="/connect-bank"
                    className="text-primary hover:underline"
                  >
                    Connect a bank
                  </Link>{" "}
                  or add manually.
                </p>
              ) : (
                bankAccounts.map((account) => (
                  <div
                    key={account._id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                      account.isDefault
                        ? "border-primary bg-primary/5"
                        : "border-border",
                    )}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {account.bankName}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.accountType} • {account.accountNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {showBalances
                          ? `$${account.balance.toFixed(2)}`
                          : "••••••"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Cards</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 bg-transparent"
              >
                <Plus className="h-4 w-4" /> Add Card
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {cards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No cards linked. Add a card when supported.
                </p>
              ) : (
                cards.map((card) => (
                  <div key={card._id} className="space-y-3">
                    <div className="p-5 rounded-xl text-white bg-gradient-to-br from-slate-800 to-slate-900">
                      <div className="flex items-center justify-between mb-6">
                        <p className="font-medium">{card.bankName || "Card"}</p>
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <p className="text-lg font-mono tracking-wider mb-4">
                        {card.cardNumber ||
                          card.accountNumber ||
                          "•••• •••• •••• ••••"}
                      </p>
                      <p className="text-xs opacity-70">
                        Expires {card.cardExpiry || "—"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
