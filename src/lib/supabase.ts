// Client-side Postgres Database and Auth proxy wrapper
// This replaces the Supabase client and redirects all database operations to our local Express + self-hosted Postgres backend

export const SUPABASE_URL = "postgres-self-hosted";
export const SUPABASE_ANON_KEY = "self-hosted-token";

// Check if database is configured on the backend
export const isSupabaseConfigured = (): boolean => {
  // We'll return true by default to enable the self-hosted interface!
  return true;
};

// Helper to make backend requests
const apiRequest = async (path: string, method = "GET", body?: any) => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    };

    try {
      const stored = localStorage.getItem("pg_session_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id) {
          headers["x-user-id"] = u.id;
        }
      }
    } catch {}

    const res = await fetch(path, {
      method,
      headers,
      cache: "no-store",
      body: body ? JSON.stringify(body) : undefined
    });
    
    const contentType = res.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (!res.ok) {
          throw new Error(`خطأ في الخادم (${res.status}): ${text.substring(0, 150)}`);
        }
        data = { message: text };
      }
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `خطأ في الخادم (كود ${res.status})`);
    }
    return data;
  } catch (err: any) {
    console.error(`API request failed [${method} ${path}]:`, err);
    throw err;
  }
};

class ClientAuth {
  async getUser() {
    try {
      const stored = localStorage.getItem("pg_session_user");
      if (stored) {
        return { data: { user: JSON.parse(stored) }, error: null };
      }
    } catch (e) {
      console.warn("localStorage read failed in auth", e);
    }
    return { data: { user: null }, error: null };
  }

  async signUp({ email, password, options }: any) {
    try {
      const result = await apiRequest("/api/local-auth/signup", "POST", {
        email,
        password,
        full_name: options?.data?.full_name
      });
      if (result.requiresApproval) {
        return { data: { user: null }, requiresApproval: true, message: result.message, error: null };
      }
      if (result.user) {
        try {
          localStorage.setItem("pg_session_user", JSON.stringify(result.user));
        } catch (e) {
          console.warn("localStorage write failed", e);
        }
        return { data: { user: result.user }, error: null };
      }
      throw new Error("فشل إنشاء الحساب.");
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } };
    }
  }

  async signInWithPassword({ email, password }: any) {
    try {
      const result = await apiRequest("/api/local-auth/signin", "POST", { email, password });
      if (result.user) {
        try {
          localStorage.setItem("pg_session_user", JSON.stringify(result.user));
        } catch (e) {
          console.warn("localStorage write failed", e);
        }
        return { data: { user: result.user }, error: null };
      }
      throw new Error("فشل تسجيل الدخول.");
    } catch (err: any) {
      return { data: { user: null, session: null }, error: { message: err.message } };
    }
  }

  async signOut() {
    try {
      localStorage.removeItem("pg_session_user");
    } catch (e) {
      console.warn("localStorage remove failed", e);
    }
    return { error: null };
  }
}

class ClientDbBuilder {
  private tableName: string;
  private eqKey: string | null = null;
  private eqValue: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns = "*") {
    // Return builder for chainability
    return this;
  }

  async insert(rows: any | any[]) {
    try {
      const payload = Array.isArray(rows) ? rows[0] : rows;
      const result = await apiRequest(`/api/db/${this.tableName}`, "POST", payload);
      return { data: [result], error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  update(values: any) {
    const self = this;
    return {
      eq: async function (key: string, val: any) {
        try {
          const result = await apiRequest(`/api/db/${self.tableName}`, "PUT", { id: val, ...values });
          return { data: [result], error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      in: async function (key: string, vals: any[]) {
        try {
          const results = [];
          for (const val of vals) {
            const res = await apiRequest(`/api/db/${self.tableName}`, "PUT", { id: val, ...values });
            results.push(res);
          }
          return { data: results, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };
  }

  delete() {
    const self = this;
    return {
      eq: async function (key: string, val: any) {
        try {
          const result = await apiRequest(`/api/db/${self.tableName}`, "DELETE", { id: val });
          return { data: [result], error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      in: async function (key: string, vals: any[]) {
        try {
          const results = [];
          for (const val of vals) {
            const res = await apiRequest(`/api/db/${self.tableName}`, "DELETE", { id: val });
            results.push(res);
          }
          return { data: results, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };
  }

  order(column: string, options?: any) {
    // Sorted on server-side automatically, return builder
    return this;
  }

  eq(key: string, val: any) {
    this.eqKey = key;
    this.eqValue = val;
    return this;
  }

  // Promise thenable resolution
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    const run = async () => {
      try {
        let path = `/api/db/${this.tableName}`;
        if (this.eqKey && this.eqValue !== null) {
          path += `?${encodeURIComponent(this.eqKey)}=${encodeURIComponent(this.eqValue)}`;
        }
        const data = await apiRequest(path, "GET");
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    };
    return run().then(onfulfilled);
  }
}

class ClientSettings {
  async get(userId: string) {
    try {
      const res = await fetch(`/api/user-settings?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        // Load into localStorage for immediate client-side availability in components
        if (data.yt_cookies !== undefined) localStorage.setItem("yt_cookies", data.yt_cookies || "");
        if (data.buffer_access_token !== undefined) localStorage.setItem("buffer_access_token", data.buffer_access_token || "");
        if (data.zernio_integration_mode !== undefined) localStorage.setItem("zernio_integration_mode", data.zernio_integration_mode || "webhook");
        if (data.zernio_api_key !== undefined) localStorage.setItem("zernio_api_key", data.zernio_api_key || "");
        if (data.zernio_webhook_url !== undefined) localStorage.setItem("zernio_webhook_url", data.zernio_webhook_url || "");
        if (data.yt_proxy !== undefined) localStorage.setItem("yt_proxy", data.yt_proxy || "");
        if (data.apify_token !== undefined) localStorage.setItem("apify_token", data.apify_token || "");
        if (data.apify_actor_id !== undefined) localStorage.setItem("apify_actor_id", data.apify_actor_id || "apify/facebook-posts-scraper");
        if (data.cloudinary_cloud_name !== undefined) localStorage.setItem("cloudinary_cloud_name", data.cloudinary_cloud_name || "");
        if (data.cloudinary_api_key !== undefined) localStorage.setItem("cloudinary_api_key", data.cloudinary_api_key || "");
        if (data.cloudinary_api_secret !== undefined) localStorage.setItem("cloudinary_api_secret", data.cloudinary_api_secret || "");
        if (data.cloudinary_history !== undefined) {
          const historyStr = Array.isArray(data.cloudinary_history) 
            ? JSON.stringify(data.cloudinary_history) 
            : typeof data.cloudinary_history === "string" 
              ? data.cloudinary_history 
              : "[]";
          localStorage.setItem("yt_cloudinary_history", historyStr);
        }
        return { data, error: null };
      }
      const errData = await res.json();
      throw new Error(errData.error || "Failed to fetch settings");
    } catch (err: any) {
      console.error("[ClientSettings] get failed:", err);
      return { data: null, error: err };
    }
  }

  async update(userId: string, settings: {
    yt_cookies?: string;
    buffer_access_token?: string;
    zernio_integration_mode?: string;
    zernio_api_key?: string;
    zernio_webhook_url?: string;
    cloudinary_history?: any[];
    cloudinary_cloud_name?: string;
    cloudinary_api_key?: string;
    cloudinary_api_secret?: string;
    yt_proxy?: string;
    apify_token?: string;
    apify_tokens?: string | string[];
    apify_actor_id?: string;
  }) {
    try {
      // First update localStorage
      if (settings.yt_cookies !== undefined) localStorage.setItem("yt_cookies", settings.yt_cookies);
      if (settings.buffer_access_token !== undefined) localStorage.setItem("buffer_access_token", settings.buffer_access_token);
      if (settings.zernio_integration_mode !== undefined) localStorage.setItem("zernio_integration_mode", settings.zernio_integration_mode);
      if (settings.zernio_api_key !== undefined) localStorage.setItem("zernio_api_key", settings.zernio_api_key);
      if (settings.zernio_webhook_url !== undefined) localStorage.setItem("zernio_webhook_url", settings.zernio_webhook_url);
      if (settings.cloudinary_cloud_name !== undefined) localStorage.setItem("cloudinary_cloud_name", settings.cloudinary_cloud_name);
      if (settings.cloudinary_api_key !== undefined) localStorage.setItem("cloudinary_api_key", settings.cloudinary_api_key);
      if (settings.cloudinary_api_secret !== undefined) localStorage.setItem("cloudinary_api_secret", settings.cloudinary_api_secret);
      if (settings.cloudinary_history !== undefined) localStorage.setItem("yt_cloudinary_history", JSON.stringify(settings.cloudinary_history));
      if (settings.yt_proxy !== undefined) localStorage.setItem("yt_proxy", settings.yt_proxy);
      if (settings.apify_token !== undefined) localStorage.setItem("apify_token", settings.apify_token);
      if (settings.apify_tokens !== undefined) {
        localStorage.setItem("apify_tokens", typeof settings.apify_tokens === "string" ? settings.apify_tokens : JSON.stringify(settings.apify_tokens));
      }
      if (settings.apify_actor_id !== undefined) localStorage.setItem("apify_actor_id", settings.apify_actor_id);

      // Get all current items to send complete payload
      const payload = {
        user_id: userId,
        yt_cookies: settings.yt_cookies !== undefined ? settings.yt_cookies : (localStorage.getItem("yt_cookies") || ""),
        buffer_access_token: settings.buffer_access_token !== undefined ? settings.buffer_access_token : (localStorage.getItem("buffer_access_token") || ""),
        zernio_integration_mode: settings.zernio_integration_mode !== undefined ? settings.zernio_integration_mode : (localStorage.getItem("zernio_integration_mode") || "webhook"),
        zernio_api_key: settings.zernio_api_key !== undefined ? settings.zernio_api_key : (localStorage.getItem("zernio_api_key") || ""),
        zernio_webhook_url: settings.zernio_webhook_url !== undefined ? settings.zernio_webhook_url : (localStorage.getItem("zernio_webhook_url") || ""),
        cloudinary_cloud_name: settings.cloudinary_cloud_name !== undefined ? settings.cloudinary_cloud_name : (localStorage.getItem("cloudinary_cloud_name") || ""),
        cloudinary_api_key: settings.cloudinary_api_key !== undefined ? settings.cloudinary_api_key : (localStorage.getItem("cloudinary_api_key") || ""),
        cloudinary_api_secret: settings.cloudinary_api_secret !== undefined ? settings.cloudinary_api_secret : (localStorage.getItem("cloudinary_api_secret") || ""),
        cloudinary_history: settings.cloudinary_history !== undefined ? settings.cloudinary_history : JSON.parse(localStorage.getItem("yt_cloudinary_history") || "[]"),
        yt_proxy: settings.yt_proxy !== undefined ? settings.yt_proxy : (localStorage.getItem("yt_proxy") || ""),
        apify_token: settings.apify_token !== undefined ? settings.apify_token : (localStorage.getItem("apify_token") || ""),
        apify_tokens: settings.apify_tokens !== undefined ? settings.apify_tokens : (localStorage.getItem("apify_tokens") || "[]"),
        apify_actor_id: settings.apify_actor_id !== undefined ? settings.apify_actor_id : (localStorage.getItem("apify_actor_id") || "apify/facebook-posts-scraper")
      };

      const res = await fetch("/api/user-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return { success: true, error: null };
      }
      const errData = await res.json();
      throw new Error(errData.error || "Failed to update settings");
    } catch (err: any) {
      console.error("[ClientSettings] update failed:", err);
      return { success: false, error: err };
    }
  }
}

export class HybridSupabaseClient {
  auth = new ClientAuth();
  settings = new ClientSettings();

  from(tableName: string) {
    return new ClientDbBuilder(tableName);
  }
}

export const supabase = new HybridSupabaseClient();

export const saveSupabaseConfig = (url: string, key: string) => {
  // Stub for backwards compatibility
  window.location.reload();
};

export const clearSupabaseConfig = () => {
  // Stub for backwards compatibility
  window.location.reload();
};
