"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Loader2, Landmark, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BankAccount {
  _id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  balance: number;
  plaidAccountId?: string;
}

export default function ConnectBankPage() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const { toast } = useToast();

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data.accounts || []);
    } catch (e) {
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Create Plaid link token
  const createLinkToken = async () => {
    setIsCreatingLink(true);
    try {
      const data = await api.createPlaidLinkToken();
      setLinkToken(data.linkToken); // backend already sends linkToken ✅
    } catch (e: any) {
      toast({
        title: "Plaid error",
        description: e?.message || "Failed to create link token",
        variant: "destructive",
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  // Success handler
  const onSuccess = async (publicToken: string) => {
    try {
      const result = await api.exchangePlaidToken(publicToken);
      toast({
        title: "Bank linked",
        description: `${result.accountsLinked} account(s) added`,
      });
      setLinkToken(null);
      fetchAccounts();
    } catch (e: any) {
      toast({
        title: "Link failed",
        description: e?.message || "Failed to link bank",
        variant: "destructive",
      });
    }
  };

  // Plaid hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });

  // Debug (remove later)
  useEffect(() => {
    console.log("Plaid debug:", { linkToken, ready });
  }, [linkToken, ready]);

  // Button click
  const handleLinkAccount = async () => {
    if (!linkToken) {
      await createLinkToken();
      return;
    }
    if (ready) {
      open();
    }
  };

  const linkedAccounts = accounts.filter((a) => a.plaidAccountId);
  const manualAccounts = accounts.filter((a) => !a.plaidAccountId);

  return (
    <DashboardLayout>
      <Header title="Connect Bank Accounts" />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Link your bank with Plaid
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Securely connect your bank accounts via Plaid.
            </p>

            <Button
              onClick={handleLinkAccount}
              disabled={isCreatingLink || (!!linkToken && !ready)}
              className="gap-2"
            >
              {isCreatingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreatingLink ? "Preparing Link…" : "Link new bank account"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Linked bank accounts</CardTitle>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoadingAccounts}
              onClick={fetchAccounts}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoadingAccounts && "animate-spin")}
              />
            </Button>
          </CardHeader>

          <CardContent>
            {isLoadingAccounts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {[...linkedAccounts, ...manualAccounts].map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center gap-4 p-4 border rounded-xl"
                  >
                    <Building2 className="h-6 w-6" />
                    <div className="flex-1">
                      <p className="font-medium">{a.bankName}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.accountType} • {a.accountNumber}
                      </p>
                    </div>
                    <p className="font-semibold">${a.balance.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
