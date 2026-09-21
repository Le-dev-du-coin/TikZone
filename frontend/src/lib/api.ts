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
  client_name?: string;
  client_phone?: string;
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
  hotspot_name?: string;
  hotspot_type?: "RADIUS" | "STANDALONE";
  api_user?: string;
  api_password?: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  mikhmon_instance: string;
  mikhmon_name?: string;
  mikhmon_url?: string;
  days_left: number;
  expires_at_formatted?: string;
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

  async purchaseInstance(
    name: string,
    routerosVersion: "V7" | "V6",
    clientName = "",
    clientPhone = "",
    adminUser = "admin",
    adminPassword = "pass"
  ) {
    const res = await fetch(`${API_BASE}/instances/purchase/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        routeros_version: routerosVersion,
        client_name: clientName,
        client_phone: clientPhone,
        admin_user: adminUser,
        admin_password: adminPassword,
      }),
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

  async updateInstance(instanceId: string, data: { client_name?: string; client_phone?: string; admin_user?: string; admin_password?: string }) {
    const res = await fetch(`${API_BASE}/instances/${instanceId}/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.detail || "Erreur de mise à jour de l'espace");
    }
    return resData;
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

  async createRouter(
    name: string,
    instanceId: string,
    autoRenew = true,
    apiUser = "admin",
    apiPassword = "",
    hotspotType: "RADIUS" | "STANDALONE" = "RADIUS"
  ) {
    const res = await fetch(`${API_BASE}/routers/create/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        mikhmon_instance_id: instanceId,
        auto_renew: autoRenew,
        api_user: apiUser,
        api_password: apiPassword,
        hotspot_type: hotspotType,
      }),
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

  async updateRouter(routerId: string, data: { name?: string; hotspot_name?: string; api_user?: string; api_password?: string }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) {
      throw new Error(resData.detail || "Erreur lors de la mise à jour du routeur");
    }
    return resData;
  },

  async pingRouter(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/ping/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || `Erreur serveur (${res.status})`);
    }
    if (data.status === "OFFLINE" || data.online === false) {
      throw new Error(data.detail || "Le routeur ne répond pas au ping.");
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

  async getRouterHotspotUsers(routerId: string, limit = 300) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/users/?limit=${limit}`, {
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

  async deleteRouterHotspotUsers(routerId: string, userIds: string[]) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/users/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_ids: userIds }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de suppression des utilisateurs");
    return result;
  },

  async generateRouterTickets(
    routerId: string,
    data: {
      count: number;
      auth_mode?: "single" | "dual";
      profile?: string;
      time_limit?: string;
      prefix?: string;
      code_length?: number;
      code_format?: string;
      price?: number;
      comment?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/generate/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de génération des tickets");
    return result;
  },

  // === MOTEUR SAAS RADIUS (HAUTE PERFORMANCE POSTGRESQL) ===
  async getSaaSTickets(
    routerId: string,
    params?: { profile?: string; status?: string; search?: string }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.profile) searchParams.append("profile", params.profile);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.search) searchParams.append("search", params.search);

    const res = await fetch(`${API_BASE}/routers/${routerId}/saas-tickets/?${searchParams.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur de récupération des tickets SaaS RADIUS");
    return await res.json();
  },

  async generateSaaSTickets(
    routerId: string,
    data: {
      count: number;
      auth_mode?: "single" | "dual";
      profile?: string;
      time_limit?: string;
      prefix?: string;
      code_length?: number;
      code_format?: string;
      price?: number;
      comment?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/saas-tickets/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de génération des tickets SaaS");
    return result;
  },

  async deleteSaaSTickets(routerId: string, ticketIds: string[]) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/saas-tickets/`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticket_ids: ticketIds }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur de suppression des tickets SaaS");
    return result;
  },

  async getRadiusSetupScript(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/radius-script/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur de génération du script RADIUS MikroTik");
    return await res.json();
  },

  async getRouterProfiles(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/profiles/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur des profils Hotspot");
    return await res.json();
  },

  async createRouterProfile(routerId: string, data: { name: string; rate_limit?: string; shared_users?: number; session_timeout?: string; price?: number; comment?: string }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/profiles/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors de la création du profil");
    return result;
  },

  async updateRouterProfile(routerId: string, data: { id: string; name?: string; rate_limit?: string; shared_users?: number; session_timeout?: string; price?: number; comment?: string }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/profiles/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors de la modification du profil");
    return result;
  },

  async deleteRouterProfile(routerId: string, profileId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/profiles/?id=${encodeURIComponent(profileId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors de la suppression du profil");
    return result;
  },

  async getRouterSalesReport(routerId: string) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/reports/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur du rapport de ventes");
    return await res.json();
  },

  async downloadSalesReportPdf(routerId: string, routerName = "routeur") {
    const res = await fetch(`${API_BASE}/routers/${routerId}/reports/pdf/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Erreur lors de la génération du PDF Chromium");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_financier_${routerName}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  async updateRouterUserLimits(routerId: string, username: string, data: { time_limit?: string; byte_limit?: string; comment?: string }) {
    const res = await fetch(`${API_BASE}/routers/${routerId}/hotspot/users/${encodeURIComponent(username)}/limits/`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.detail || "Erreur lors de la mise à jour des limites");
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

