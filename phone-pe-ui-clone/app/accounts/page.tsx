"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Plus,
  Eye,
  EyeOff,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { api } from "@/lib/api";

/* ---------------- TYPES ---------------- */

interface BankAccount {
  _id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  balance: number;
  plaidAccountId?: string;
}

interface Transaction {
  _id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  createdAt: string;
}

/* ---------------- PAGE ---------------- */

export default function AccountsPage() {
  const pathname = usePathname();

  const [showBalances, setShowBalances] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [moneyIn, setMoneyIn] = useState(0);
  const [moneyOut, setMoneyOut] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* ---------------- FETCH ACCOUNTS ---------------- */

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.getAccounts();
      setAccounts(res?.accounts ?? []);
      setTotalBalance(res?.totalBalance ?? 0);
    } catch (err) {
      console.error("Failed to fetch accounts", err);
      setAccounts([]);
      setTotalBalance(0);
    }
  }, []);

  /* ---------------- FETCH MONEY FLOW ---------------- */

  const fetchMoneyFlow = useCallback(async () => {
    try {
      const res = await api.getTransactions();

      // ✅ Normalize response safely
      const transactions: Transaction[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.transactions)
          ? res.transactions
          : [];

      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();

      let incoming = 0;
      let outgoing = 0;

      transactions.forEach((tx) => {
        if (!tx?.createdAt || typeof tx.amount !== "number") return;

        const txDate = new Date(tx.createdAt);

        if (txDate.getMonth() === month && txDate.getFullYear() === year) {
          if (tx.type === "income") {
            incoming += tx.amount;
          }

          if (tx.type === "expense" || tx.type === "transfer") {
            outgoing += Math.abs(tx.amount);
          }
        }
      });

      setMoneyIn(incoming);
      setMoneyOut(outgoing);
    } catch (err) {
      console.error("Failed to fetch money flow", err);
      setMoneyIn(0);
      setMoneyOut(0);
    }
  }, []);

  async function refreshData() {
    console.log("[POLL] refreshing accounts + transactions");
    // Refetch accounts and money flow; avoid flicker by minimal state changes
    const resAcc = await api.getAccounts();
    const nextAccounts: BankAccount[] = resAcc?.accounts ?? [];
    const nextTotal = resAcc?.totalBalance ?? 0;
    setAccounts((prev) => {
      if (prev.length === nextAccounts.length) {
        let same = true;
        for (let i = 0; i < prev.length; i++) {
          const p = prev[i];
          const n = nextAccounts[i];
          if (p?._id !== n?._id || p?.balance !== n?.balance) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return nextAccounts;
    });
    setTotalBalance((prev) => (prev === nextTotal ? prev : nextTotal));
    await fetchMoneyFlow();
  }

  /* ---------------- EFFECT ---------------- */

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchAccounts(), fetchMoneyFlow()]);
      setIsLoading(false);
    };
    load();
  }, [fetchAccounts, fetchMoneyFlow, pathname]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let skipNextPoll = false;
    const startPolling = () => {
      if (!interval) {
        interval = setInterval(() => {
          if (document.visibilityState === "visible") {
            if (skipNextPoll) {
              skipNextPoll = false;
              return;
            }
            refreshData();
          }
        }, 5000);
      }
    };
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (skipNextPoll) {
          skipNextPoll = false;
        } else {
          refreshData();
        }
        startPolling();
      } else {
        stopPolling();
      }
    };
    const handleConfirmed = () => {
      skipNextPoll = true;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "finance:transfer-confirmed",
      handleConfirmed as any,
    );
    startPolling();
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "finance:transfer-confirmed",
        handleConfirmed as any,
      );
    };
  }, []);

  /* ---------------- UI ---------------- */

  return (
    <DashboardLayout>
      <Header title="Accounts and Cards" />

      <div className="space-y-6">
        {/* ----------- STATS ----------- */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">
                  {showBalances ? formatINR(totalBalance) : "••••••"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Money In (This Month)
                </p>
                <p className="text-2xl font-bold">
                  {showBalances ? formatINR(moneyIn) : "••••••"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Money Out (This Month)
                </p>
                <p className="text-2xl font-bold">
                  {showBalances ? formatINR(moneyOut) : "••••••"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ----------- BANK ACCOUNTS ----------- */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bank Accounts</CardTitle>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBalances(!showBalances)}
              >
                {showBalances ? <EyeOff /> : <Eye />}
              </Button>

              <Button asChild size="sm" variant="outline">
                <Link href="/connect-bank">
                  <Plus className="h-4 w-4 mr-1" /> Add Account
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No bank accounts connected.
              </p>
            ) : (
              accounts.map((account) => (
                <div
                  key={account._id}
                  className={cn(
                    "relative flex items-center gap-4 p-4 rounded-xl border bg-card",
                    "hover:shadow-md transition-all",
                  )}
                >
                  <span className="absolute left-0 top-0 h-full w-1 bg-primary rounded-l" />

                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">{account.bankName}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.accountType} • ••••
                      {account.accountNumber.slice(-4)}
                    </p>

                    {account.plaidAccountId && (
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className="text-muted-foreground">
                          ID: {account.plaidAccountId}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-2"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              account.plaidAccountId!,
                            );
                            setCopiedId(account._id);
                            setTimeout(() => setCopiedId(null), 1200);
                          }}
                        >
                          {copiedId === account._id ? "Copied ✓" : "Copy"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="font-semibold">
                    {showBalances ? formatINR(account.balance) : "••••••"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
