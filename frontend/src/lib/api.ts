/**
 * Client API Mikroot SaaS
 * Gère les appels REST vers le backend Django avec Token Authentication et synchronisation réactive du solde.
 */

import { walletEvents } from "./wallet-events";

const rawApi = process.env.NEXT_PUBLIC_API_URL || "/api";
const API_BASE = rawApi.endsWith("/api") ? rawApi : `${rawApi.replace(/\/+$/, "")}/api`;

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("mikroot_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Token ${token}` } : {}),
  };
}

export interface InstanceData {
  id: string;
  name: string;
  subdomain_url: string;
  routeros_version: "V7" | "V6";
  admin_user?: string;
  admin_password?: string;
  created_at: string;
  routers: RouterData[];
}

export interface RouterData {
  id: string;
  name: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  mikhmon_instance: string;
  mikhmon_name?: string;
  mikhmon_url?: string;
  days_left: number;
  price_per_month: string;
  auto_renew: boolean;
  expires_at: string;
  last_ping?: string | null;
  vpn?: {
    vpn_server: string;
    vpn_user: string;
    assigned_ip: string;
    api_port: number;
    winbox_port: number;
    mikrotik_script: string;
  };
  script?: string;
  created_at: string;
}

export interface WalletData {
  balance: number;
  transactions?: TransactionData[];
}

export interface TransactionData {
  id: string;
  amount: string;
  type: string;
  status: string;
  payment_method: string;
  reference: string;
  description: string;
  created_at: string;
}

export const api = {
  // === INSTANCES (ESPACES) ===
  async getInstances(): Promise<InstanceData[]> {
    const res = await fetch(`${API_BASE}/instances/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("mikroot_token");
        window.location.href = "/login";
      }
      throw new Error("Erreur de chargement des espaces.");
    }
    return await res.json();
  },

  async purchaseInstance(name: string, routerosVersion: "V7" | "V6") {
    const res = await fetch(`${API_BASE}/instances/purchase/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, routeros_version: routerosVersion }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.detail || (typeof data === "object" ? Object.values(data).flat().join(" ") : "Erreur d'achat");
      throw new Error(errorMsg);
    }
    if (typeof data.new_balance === "number") {
      walletEvents.emitBalanceUpdated(data.new_balance);
    }
    return data;
  },

  async deleteInstance(instanceId: string) {
    const res = await fetch(`${API_BASE}/instances/${instanceId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Impossible de supprimer cet espace.");
    }
    return data;
  },

  // === ROUTEURS ===
  async getRouters(): Promise<RouterData[]> {
    const res = await fetch(`${API_BASE}/routers/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Erreur de récupération des routeurs");
    }
    return await res.json();
  },

  async createRouter(name: string, instanceId: string, autoRenew = true) {
    const res = await fetch(`${API_BASE}/routers/create/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, mikhmon_instance_id: instanceId, auto_renew: autoRenew }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.detail || (typeof data === "object" ? Object.values(data).flat().join(" ") : "Erreur de création");
      throw new Error(errorMsg);
    }
    if (typeof data.new_balance === "number") {
      walletEvents.emitBalanceUpdated(data.new_balance);
    }
    return data;
  },

  async renewRouter(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/renew/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Erreur lors du renouvellement");
    }
    if (typeof data.new_balance === "number") {
      walletEvents.emitBalanceUpdated(data.new_balance);
    }
    return data;
  },

  async deleteRouter(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Erreur lors de la suppression du routeur");
    }
    return data;
  },

  async pingRouter(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/ping/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Ping échoué");
    }
    return data;
  },

  // === NATIVE ROUTEROS ENGINE (HOTSPOT & TÉLÉMÉTRIE) ===
  async getRouterSystemInfo(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/system-info/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur de télémétrie système");
    return await res.json();
  },

  async getRouterHotspotOverview(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/overview/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur de récupération Hotspot");
    return await res.json();
  },

  async getRouterHotspotUsers(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/users/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur des utilisateurs Hotspot");
    return await res.json();
  },

  async addRouterHotspotUser(routerId: string, data: { name: string; password?: string; profile?: string; time_limit?: string; comment?: string }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/users/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de création de l'utilisateur");
    return result;
  },

  async generateRouterTickets(routerId: string, data: { count: number; profile?: string; time_limit?: string; prefix?: string; code_length?: number; price?: number }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/generate/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de génération des tickets");
    return result;
  },

  async getRouterProfiles(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/profiles/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur des profils Hotspot");
    return await res.json();
  },

  async getRouterLogs(routerId: string, limit = 50) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/logs/?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur des logs Hotspot");
    return await res.json();
  },

  async disconnectActiveUser(routerId: string, activeId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/active/${encodeURIComponent(activeId)}/disconnect/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors de la déconnexion");
    return result;
  },

  async rebootRouter(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/reboot/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors du redémarrage");
    return result;
  },

  // === WALLET ===
  async getWallet(): Promise<WalletData> {
    const res = await fetch(`${API_BASE}/billing/wallet/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Erreur de chargement du solde.");
    }
    const data = await res.json();
    const balance = typeof data.balance === "string" ? parseFloat(data.balance) : data.balance;
    return {
      balance,
      transactions: data.transactions || [],
    };
  },

  async deposit(amount: number, paymentMethod: string, reference = "") {
    const res = await fetch(`${API_BASE}/billing/deposit/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount: amount.toString(), payment_method: paymentMethod, reference }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Erreur de recharge");
    }
    if (typeof data.balance === "number") {
      walletEvents.emitBalanceUpdated(data.balance);
    }
    return data;
  },
};

