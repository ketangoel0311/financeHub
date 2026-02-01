"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Account {
  _id: string;
  bankName: string;
  balance: number;
}

export default function TransferPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    api.getAccounts().then((res) => {
      setAccounts(res.accounts || []);
    });
  }, []);

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) {
      toast({
        title: "Missing fields",
        variant: "destructive",
      });
      return;
    }

    if (fromAccountId === toAccountId) {
      toast({
        title: "Invalid transfer",
        description: "From and To accounts must be different",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.internalTransfer({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
      });

      // 🔥 THIS IS THE FIX
      const updated = await api.getAccounts();
      setAccounts(updated.accounts || []);

      setSuccess(true);
      toast({ title: "Transfer successful" });
    } catch (err: any) {
      toast({
        title: "Transfer failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DashboardLayout>
        <Header title="Transfer" />
        <div className="flex justify-center mt-20">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Transfer Completed</h2>
              <Button className="mt-6 w-full" onClick={() => location.reload()}>
                Make Another Transfer
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Header title="Transfer" />
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Internal Transfer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* FROM ACCOUNT */}
            <div>
              <label className="text-sm font-medium">From Account</label>
              <select
                className="w-full border rounded-md p-2"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.bankName} — ${acc.balance}
                  </option>
                ))}
              </select>
            </div>

            {/* TO ACCOUNT */}
            <div>
              <label className="text-sm font-medium">To Account</label>
              <select
                className="w-full border rounded-md p-2"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.bankName}
                  </option>
                ))}
              </select>
            </div>

            {/* AMOUNT */}
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Transfer"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
