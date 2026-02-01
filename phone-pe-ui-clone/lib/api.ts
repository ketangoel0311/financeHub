const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

class ApiService {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

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
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

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

  /* ---------- CONTACTS / TRANSFER ---------- */

  async getContacts(search?: string) {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request<any[]>(`/transfer/contacts${params}`);
  }

  async getFavoriteContacts() {
    return this.request<any[]>("/transfer/favorites");
  }

  /* 🔥 NEW LEDGER-BASED TRANSFER */
  async internalTransfer(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
  }) {
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

// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// class ApiService {
//   private getToken(): string | null {
//     if (typeof window !== "undefined") {
//       return localStorage.getItem("token");
//     }
//     return null;
//   }

//   private async request<T>(
//     endpoint: string,
//     options: RequestInit = {},
//   ): Promise<T> {
//     const token = this.getToken();

//     const headers: HeadersInit = {
//       "Content-Type": "application/json",
//       ...options.headers,
//     };

//     if (token) {
//       (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
//     }

//     const response = await fetch(`${API_URL}${endpoint}`, {
//       ...options,
//       headers,
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Something went wrong");
//     }

//     return data;
//   }

//   // Auth
//   async login(email: string, password: string) {
//     const data = await this.request<{ token: string; user: any }>(
//       "/auth/login",
//       {
//         method: "POST",
//         body: JSON.stringify({ email, password }),
//       },
//     );
//     localStorage.setItem("token", data.token);
//     return data;
//   }

//   async register(name: string, email: string, password: string) {
//     const data = await this.request<{ token: string; user: any }>(
//       "/auth/register",
//       {
//         method: "POST",
//         body: JSON.stringify({ name, email, password }),
//       },
//     );
//     localStorage.setItem("token", data.token);
//     return data;
//   }

//   logout() {
//     localStorage.removeItem("token");
//   }

//   // User
//   async getProfile() {
//     return this.request<any>("/user/profile");
//   }

//   async updateProfile(data: { name?: string; phone?: string }) {
//     return this.request<any>("/user/profile", {
//       method: "PUT",
//       body: JSON.stringify(data),
//     });
//   }

//   async getDashboard() {
//     return this.request<any>("/user/dashboard");
//   }

//   // Transactions
//   async getTransactions(params?: {
//     type?: string;
//     search?: string;
//     page?: number;
//     limit?: number;
//   }) {
//     const searchParams = new URLSearchParams();
//     if (params?.type) searchParams.append("type", params.type);
//     if (params?.search) searchParams.append("search", params.search);
//     if (params?.page) searchParams.append("page", params.page.toString());
//     if (params?.limit) searchParams.append("limit", params.limit.toString());

//     return this.request<any>(`/transactions?${searchParams.toString()}`);
//   }

//   async getTransaction(id: string) {
//     return this.request<any>(`/transactions/${id}`);
//   }

//   async getRecentTransactions() {
//     return this.request<any[]>("/transactions/recent/list");
//   }

//   // Accounts
//   async getAccounts() {
//     return this.request<any>("/accounts");
//   }

//   async addAccount(data: {
//     bankName: string;
//     accountType: string;
//     accountNumber: string;
//     balance?: number;
//   }) {
//     return this.request<any>("/accounts", {
//       method: "POST",
//       body: JSON.stringify(data),
//     });
//   }

//   async deleteAccount(id: string) {
//     return this.request<any>(`/accounts/${id}`, {
//       method: "DELETE",
//     });
//   }

//   // Transfer
//   async getContacts(search?: string) {
//     const params = search ? `?search=${encodeURIComponent(search)}` : "";
//     return this.request<any[]>(`/transfer/contacts${params}`);
//   }

//   async getFavoriteContacts() {
//     return this.request<any[]>("/transfer/favorites");
//   }

//   async addContact(data: {
//     name: string;
//     email?: string;
//     phone?: string;
//     accountNumber?: string;
//     bankName?: string;
//   }) {
//     return this.request<any>("/transfer/contacts", {
//       method: "POST",
//       body: JSON.stringify(data),
//     });
//   }

//   async makeTransfer(data: {
//     recipientId?: string;
//     recipientName: string;
//     amount: number;
//     description?: string;
//     accountId?: string;
//   }) {
//     return this.request<any>("/transfer", {
//       method: "POST",
//       body: JSON.stringify(data),
//     });
//   }

//   // Plaid / Connect Bank
//   async createPlaidLinkToken() {
//     return this.request<{ linkToken: string }>("/plaid/create-link-token", {
//       method: "POST",
//     });
//   }

//   async exchangePlaidToken(publicToken: string) {
//     return this.request<any>("/plaid/exchange-token", {
//       method: "POST",
//       body: JSON.stringify({ publicToken }),
//     });
//   }

//   // Check if authenticated
//   isAuthenticated(): boolean {
//     return !!this.getToken();
//   }
// }

// export const api = new ApiService();
