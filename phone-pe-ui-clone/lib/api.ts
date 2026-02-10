const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

class ApiService {
  /* ---------- TOKEN ---------- */
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

  /* ---------- CORE REQUEST ---------- */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    // 🔍 Safe log (no token leak)
    const safeHeaders = { ...(headers as Record<string, string>) };
    if (safeHeaders.Authorization) {
      safeHeaders.Authorization = "[REDACTED]";
    }

    console.log("FRONTEND API REQUEST", {
      url: `${API_URL}${endpoint}`,
      method: options.method || "GET",
      headers: safeHeaders,
      body: options.body
        ? (() => {
            try {
              return JSON.parse(options.body as string);
            } catch {
              return options.body;
            }
          })()
        : undefined,
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("FRONTEND API RESPONSE ERROR", {
        status: response.status,
        data,
      });
      throw new Error(data.message || "Something went wrong");
    }

    console.log("FRONTEND API RESPONSE SUCCESS", {
      status: response.status,
      data,
    });

    return data;
  }

  /* ---------- AUTH ---------- */

  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    localStorage.setItem("token", data.token);
    return data;
  }

  async register(name: string, email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      },
    );
    localStorage.setItem("token", data.token);
    return data;
  }

  logout() {
    localStorage.removeItem("token");
  }

  /* ---------- USER ---------- */

  async getProfile() {
    return this.request<any>("/user/profile");
  }

  async getDashboard() {
    return this.request<any>("/user/dashboard");
  }

  /* ---------- TRANSACTIONS ---------- */

  async getTransactions(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    return this.request<any>(`/transactions?${searchParams.toString()}`);
  }

  async getTransaction(id: string) {
    return this.request<any>(`/transactions/${id}`);
  }

  async getRecentTransactions() {
    return this.request<any[]>("/transactions/recent/list");
  }

  /* ---------- ACCOUNTS ---------- */

  async getAccounts() {
    return this.request<any>("/accounts");
  }

  async getAccountsSummary() {
    return this.request<{
      totalBalance: number;
      moneyInThisMonth: number;
      moneyOutThisMonth: number;
      accounts: any[];
    }>("/accounts/summary");
  }

  async addAccount(data: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    balance?: number;
  }) {
    return this.request<any>("/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, {
      method: "DELETE",
    });
  }

  /* ---------- TRANSFER ---------- */

  async getContacts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request<any[]>(`/transfer/contacts${params}`);
  }

  async getFavoriteContacts() {
    return this.request<any[]>("/transfer/favorites");
  }

  async internalTransfer(data: {
    sourceAccountId: string;
    receiverShareableId: string;
    amount: number;
    note?: string;
  }) {
    console.log("FRONTEND EVENT: transfer initiated", data);
    return this.request<{ message: string }>("/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /* ---------- PLAID ---------- */

  async createPlaidLinkToken() {
    return this.request<{ linkToken: string }>("/plaid/create-link-token", {
      method: "POST",
    });
  }

  async exchangePlaidToken(publicToken: string) {
    return this.request<any>("/plaid/exchange-token", {
      method: "POST",
      body: JSON.stringify({ publicToken }),
    });
  }

  /* ---------- AUTH CHECK ---------- */

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const api = new ApiService();
