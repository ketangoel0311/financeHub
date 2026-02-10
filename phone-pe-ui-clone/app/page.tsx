"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatINR, mapTransferLabel } from "@/lib/utils";

const DoughnutChart = dynamic(() => import("./components/DoughnutChart"), {
  ssr: false,
});

interface Transaction {
  _id: string;
  type: "income" | "expense" | "transfer";
  description?: string;
  amount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayBalance, setDisplayBalance] = useState(0);

  const totalBalance = accounts.reduce(
    (sum, a) => sum + (a.balance ?? a.currentBalance ?? 0),
    0
  );

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await api.getProfile();
        setName(profile?.name || "");

        const acc = await api.getAccounts();
        setAccounts(acc?.accounts || []);

        const txs = await api.getRecentTransactions();
        setRecent(txs || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // smooth count-up animation
  useEffect(() => {
    if (loading) return;

    const duration = 400;
    let start = 0;
    let raf: number;

    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplayBalance(totalBalance * progress);
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loading, totalBalance]);

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <Header title="Dashboard" />

        {!!name && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-lg font-medium">Welcome, {name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your money, all in one place
              </p>
            </CardContent>
          </Card>
        )}

        {/* BALANCE CARD */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Total Account Balance</CardTitle>
          </CardHeader>

          <CardContent className="px-6 py-8">
            <div className="flex justify-center items-center">
              {loading ? (
                /* CENTERED SKELETON */
                <div className="flex items-center gap-8">
                  <div className="h-44 w-44 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ) : accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No accounts linked yet
                </p>
              ) : (
                /* REAL CONTENT — SAME STRUCTURE */
                <div className="flex items-center gap-8">
                  {/* DONUT */}
                  <div className="relative h-44 w-44">
                    <DoughnutChart
                      accounts={accounts.map((a) => ({
                        name: a.name,
                        currentBalance:
                          a.balance ?? a.currentBalance ?? 0,
                      }))}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-muted-foreground">
                        Balance
                      </p>
                      <p className="text-2xl font-bold">
                        {formatINR(displayBalance)}
                      </p>
                    </div>
                  </div>

                  {/* META */}
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#f85e05" }}
                    >
                      {accounts.length} linked accounts
                    </p>
                    <p className="text-lg font-medium mt-1">
                      Total Account Balance
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TRANSACTIONS */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link
              href="/transactions"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </CardHeader>

          <CardContent className="space-y-3">
            {recent.slice(0, 5).map((t) => {
              const isIncome = t.type === "income";
              return (
                <div
                  key={t._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {isIncome ? (
                      <ArrowDownLeft className="text-emerald-600 h-5 w-5" />
                    ) : (
                      <ArrowUpRight className="text-rose-600 h-5 w-5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {t.description ||
                          mapTransferLabel(
                            t.type,
                            (t as any).category
                          )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(t.createdAt),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        isIncome
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatINR(Math.abs(t.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(t.createdAt),
                        "MMM d, h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
