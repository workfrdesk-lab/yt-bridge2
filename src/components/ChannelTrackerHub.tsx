import React, { useState, useEffect } from "react";
import { 
  Tv, Youtube, Plus, Trash2, ShieldAlert, ShieldCheck, Zap, ListOrdered, CheckCircle2, 
  Loader2, AlertCircle, Play, Pause, Sparkles, RefreshCw, Eye, ArrowUpRight, Share2, HelpCircle, Globe,
  Edit3, X, Sliders, Settings, Save, Check, Hash
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { generateSmartCaption } from "../lib/captionUtils";
import { useConfirm } from "./ConfirmModal";
import { CustomSelect } from "./CustomSelect";

interface TrackedChannel {
  id?: string;
  user_id?: string;
  channel_name: string;
  channel_handle: string;
  channel_url: string;
  buffer_profile_id?: string;
  buffer_access_token?: string;
  zernio_profile_id?: string;
  zernio_api_key?: string;
  platform?: string;
  bypass_settings: {
    processingMode?: "bypass" | "raw";
    rawUpload?: boolean;
    hflip: boolean;
    speedUp: boolean;
    pitchShift: boolean;
    colorBoost: boolean;
    maxVideosPerDay?: number;
    proxy?: string;
    targetContentType?: "both" | "videos" | "shorts";
    enableLogo?: boolean;
    logoUrl?: string;
    logoPosition?: "top_right" | "top_left" | "bottom_right" | "bottom_left" | "center";
    logoSize?: "small" | "medium" | "large";
    logoOpacity?: number;
    enableCaption?: boolean;
    caption_template_id?: string | null;
    caption_text_source?: "title" | "template" | "custom";
    caption_custom_text?: string;
  };
  is_paused?: boolean;
  created_at?: string;
}

interface AutomationLog {
  id?: string;
  channel_name: string;
  video_title: string;
  status: "success" | "warning" | "failed";
  message: string;
  created_at: string;
}

export default function ChannelTrackerHub() {
  const { confirm } = useConfirm();
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  
  // Proxy Listbox states
  const [availableProxies, setAvailableProxies] = useState<string[]>([]);
  const [selectedProxy, setSelectedProxy] = useState<string>("");
  
  // Adding state
  const [channelQuery, setChannelQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"buffer" | "zernio">("buffer");
  
  // Single vs Multiple account state for Add Channel
  const [trackerAccountScope, setTrackerAccountScope] = useState<"single" | "multiple">("single");
  const [selectedMultiBufferProfiles, setSelectedMultiBufferProfiles] = useState<string[]>([]);
  const [selectedMultiZernioProfiles, setSelectedMultiZernioProfiles] = useState<string[]>([]);

  // Single vs Multiple account state for Edit Channel Modal
  const [editTrackerAccountScope, setEditTrackerAccountScope] = useState<"single" | "multiple">("single");
  const [editSelectedMultiBufferProfiles, setEditSelectedMultiBufferProfiles] = useState<string[]>([]);
  const [editSelectedMultiZernioProfiles, setEditSelectedMultiZernioProfiles] = useState<string[]>([]);

  // Buffer Credentials
  const [bufferProfileId, setBufferProfileId] = useState("");
  const [bufferAccessToken, setBufferAccessToken] = useState("");

  // Zernio Credentials
  const [zernioApiKey, setZernioApiKey] = useState("");
  const [zernioProfileId, setZernioProfileId] = useState("");
  const [zernioWebhookUrl, setZernioWebhookUrl] = useState("");
  const [zernioIntegrationMode, setZernioIntegrationMode] = useState<"api" | "webhook">("webhook");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [zernioAccounts, setZernioAccounts] = useState<any[]>([]);
  const [selectedZernioAccountId, setSelectedZernioAccountId] = useState<string>("");
  const [loadingZernioAccounts, setLoadingZernioAccounts] = useState(false);

  // Buffer Accounts from DB
  const [bufferAccounts, setBufferAccounts] = useState<any[]>([]);
  const [selectedBufferAccountId, setSelectedBufferAccountId] = useState<string>("");
  const [loadingBufferAccounts, setLoadingBufferAccounts] = useState(false);

  // Imported Buffer/Zernio accounts
  const [importedProfiles, setImportedProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  
  const [zernioProfiles, setZernioProfiles] = useState<any[]>([]);
  const [loadingZernioProfiles, setLoadingZernioProfiles] = useState(false);
  
  const [manualInputMode, setManualInputMode] = useState(false);
  const [manualZernioInputMode, setManualZernioInputMode] = useState(false);
  
  // Bypass toggles & Processing Strategy
  const [processingMode, setProcessingMode] = useState<"bypass" | "raw">("bypass");
  const [hflip, setHflip] = useState(true);
  const [speedUp, setSpeedUp] = useState(true);
  const [pitchShift, setPitchShift] = useState(false);
  const [colorBoost, setColorBoost] = useState(true);
  const [maxVideosPerDay, setMaxVideosPerDay] = useState(3);
  const [targetContentType, setTargetContentType] = useState<"both" | "videos" | "shorts">("both");

  // Automation Custom Hashtags
  const [customHashtags, setCustomHashtags] = useState("");
  const [hashtagOption, setHashtagOption] = useState<"custom_or_default" | "custom_only" | "append" | "none">("custom_or_default");

  // Caption template state (MoviePy)
  const [captionTemplates, setCaptionTemplates] = useState<any[]>([]);
  const [enableCaption, setEnableCaption] = useState(false);
  const [selectedCaptionTemplateId, setSelectedCaptionTemplateId] = useState<string>("");
  const [captionTextSource, setCaptionTextSource] = useState<"title" | "template" | "custom">("title");
  const [captionCustomText, setCaptionCustomText] = useState<string>("");

  // Logo watermark settings
  const [enableLogo, setEnableLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPosition, setLogoPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left" | "center">("top_right");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [logoOpacity, setLogoOpacity] = useState(0.85);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, filename: file.name })
        });
        const data = await res.json();
        if (data.url) {
          setLogoUrl(data.url);
          setEnableLogo(true);
        }
      } catch (err) {
        setLogoUrl(base64);
        setEnableLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Editing Channel Automation Modal states
  const [editingChannel, setEditingChannel] = useState<TrackedChannel | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPlatform, setEditPlatform] = useState<"buffer" | "zernio">("buffer");
  const [editBufferProfileId, setEditBufferProfileId] = useState("");
  const [editBufferAccessToken, setEditBufferAccessToken] = useState("");
  const [editZernioProfileId, setEditZernioProfileId] = useState("");
  const [editZernioApiKey, setEditZernioApiKey] = useState("");
  const [editTargetContentType, setEditTargetContentType] = useState<"both" | "videos" | "shorts">("both");
  const [editProxy, setEditProxy] = useState("");
  const [editMaxVideosPerDay, setEditMaxVideosPerDay] = useState(3);
  const [editProcessingMode, setEditProcessingMode] = useState<"bypass" | "raw">("bypass");
  const [editHflip, setEditHflip] = useState(true);
  const [editSpeedUp, setEditSpeedUp] = useState(true);
  const [editPitchShift, setEditPitchShift] = useState(false);
  const [editColorBoost, setEditColorBoost] = useState(true);
  const [editEnableLogo, setEditEnableLogo] = useState(false);
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoPosition, setEditLogoPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left" | "center">("top_right");
  const [editLogoSize, setEditLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [editLogoOpacity, setEditLogoOpacity] = useState(0.85);
  const [editIsPaused, setEditIsPaused] = useState(false);

  // Edit caption states
  const [editEnableCaption, setEditEnableCaption] = useState(false);
  const [editCaptionTemplateId, setEditCaptionTemplateId] = useState<string>("");
  const [editCaptionTextSource, setEditCaptionTextSource] = useState<"title" | "template" | "custom">("title");
  const [editCaptionCustomText, setEditCaptionCustomText] = useState<string>("");

  const handleOpenEditModal = (channel: TrackedChannel) => {
    setEditingChannel(channel);
    setEditName(channel.channel_name || "");
    setEditHandle(channel.channel_handle || "");
    setEditUrl(channel.channel_url || "");
    setEditPlatform((channel.platform as "buffer" | "zernio") || "buffer");
    setEditBufferProfileId(channel.buffer_profile_id || "");
    setEditBufferAccessToken(channel.buffer_access_token || "");
    setEditZernioProfileId(channel.zernio_profile_id || "");
    setEditZernioApiKey(channel.zernio_api_key || "");
    
    const bypass = (channel.bypass_settings || {}) as any;
    setEditProcessingMode(bypass.processingMode === "raw" || bypass.rawUpload ? "raw" : "bypass");
    setEditTargetContentType(bypass.targetContentType || "both");
    setEditProxy(bypass.proxy || "");
    setEditMaxVideosPerDay(bypass.maxVideosPerDay || 3);
    setEditHflip(bypass.hflip !== undefined ? bypass.hflip : true);
    setEditSpeedUp(bypass.speedUp !== undefined ? bypass.speedUp : true);
    setEditPitchShift(bypass.pitchShift !== undefined ? bypass.pitchShift : false);
    setEditColorBoost(bypass.colorBoost !== undefined ? bypass.colorBoost : true);
    setEditEnableLogo(!!bypass.enableLogo);
    setEditLogoUrl(bypass.logoUrl || "");
    setEditLogoPosition(bypass.logoPosition || "top_right");
    setEditLogoSize(bypass.logoSize || "medium");
    setEditLogoOpacity(bypass.logoOpacity || 0.85);
    setEditIsPaused(!!channel.is_paused);

    setEditEnableCaption(!!bypass.enableCaption || !!bypass.caption_template_id);
    setEditCaptionTemplateId(bypass.caption_template_id || bypass.captionTemplateId || (captionTemplates[0]?.id || ""));
    setEditCaptionTextSource(bypass.caption_text_source || bypass.captionTextSource || "title");
    setEditCaptionCustomText(bypass.caption_custom_text || bypass.captionCustomText || "");

    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, filename: file.name })
        });
        const data = await res.json();
        if (data.url) {
          setEditLogoUrl(data.url);
          setEditEnableLogo(true);
        }
      } catch (err) {
        setEditLogoUrl(base64);
        setEditEnableLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel || !editingChannel.id) return;

    if (!editName.trim()) {
      setEditError("اسم القناة مطلوب.");
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const updatedBypassSettings = {
        processingMode: editProcessingMode,
        rawUpload: editProcessingMode === "raw",
        hflip: editHflip,
        speedUp: editSpeedUp,
        pitchShift: editPitchShift,
        colorBoost: editColorBoost,
        maxVideosPerDay: editMaxVideosPerDay,
        proxy: editProxy,
        targetContentType: editTargetContentType,
        enableLogo: editEnableLogo,
        logoUrl: editLogoUrl,
        logoPosition: editLogoPosition,
        logoSize: editLogoSize,
        logoOpacity: editLogoOpacity,
        enableCaption: editEnableCaption,
        caption_template_id: editEnableCaption ? editCaptionTemplateId : null,
        caption_text_source: editEnableCaption ? editCaptionTextSource : "title",
        caption_custom_text: (editEnableCaption && editCaptionTextSource === "custom") ? editCaptionCustomText : ""
      };

      const updatePayload = {
        id: editingChannel.id,
        channel_name: editName.trim(),
        channel_handle: editHandle.trim(),
        channel_url: editUrl.trim(),
        platform: editPlatform,
        buffer_profile_id: editPlatform === "buffer" ? editBufferProfileId.trim() : editingChannel.buffer_profile_id,
        buffer_access_token: editPlatform === "buffer" ? editBufferAccessToken.trim() : editingChannel.buffer_access_token,
        zernio_profile_id: editPlatform === "zernio" ? editZernioProfileId.trim() : editingChannel.zernio_profile_id,
        zernio_api_key: editPlatform === "zernio" ? editZernioApiKey.trim() : editingChannel.zernio_api_key,
        is_paused: editIsPaused,
        bypass_settings: updatedBypassSettings
      };

      const { error } = await supabase
        .from("tracked_channels")
        .update(updatePayload)
        .eq("id", editingChannel.id);

      if (error) throw error;

      // Update local state
      setChannels(prev => prev.map(c => c.id === editingChannel.id ? { ...c, ...updatePayload } : c));

      // Log update
      await supabase.from("automation_logs").insert({
        channel_name: editName.trim(),
        video_title: "تعديل إعدادات الأتمتة",
        status: "success",
        message: `تم تحديث جميع إعدادات التتبع والنشر التلقائي لقناة "${editName.trim()}" بنجاح.`,
      });
      fetchLogs();

      setSuccessMsg(`تم حفظ وتحديث إعدادات أتمتة القناة "${editName.trim()}" بنجاح! ⚡`);
      setEditModalOpen(false);
      setEditingChannel(null);
    } catch (err: any) {
      console.error("Failed to update tracked channel:", err);
      setEditError(err.message || "فشل حفظ التغييرات.");
    } finally {
      setSavingEdit(false);
    }
  };

  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync animation states
  const [syncingIdx, setSyncingIdx] = useState<number | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Workflow Agent States
  const [agentActive, setAgentActive] = useState(true);
  const [agentInterval, setAgentInterval] = useState(10);
  const [agentStatus, setAgentStatus] = useState<"idle" | "running" | "error">("idle");
  const [agentLastRun, setAgentLastRun] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [runningAgentNow, setRunningAgentNow] = useState(false);

  useEffect(() => {
    fetchAgentStatus();
    const agentIntervalId = setInterval(fetchAgentStatus, 5000);
    return () => clearInterval(agentIntervalId);
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch("/api/workflow-agent/status");
      if (res.ok) {
        const data = await res.json();
        setAgentActive(data.active);
        setAgentInterval(data.intervalMinutes);
        setAgentStatus(data.status);
        setAgentLastRun(data.lastRun);
        setAgentLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch workflow agent status:", err);
    }
  };

  const handleToggleAgent = async (newActive: boolean) => {
    setLoadingAgent(true);
    try {
      const res = await fetch("/api/workflow-agent/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive, intervalMinutes: agentInterval })
      });
      if (res.ok) {
        const data = await res.json();
        setAgentActive(data.active);
        setAgentInterval(data.intervalMinutes);
        setAgentStatus(data.status);
      }
    } catch (err) {
      console.error("Failed to toggle agent:", err);
    } finally {
      setLoadingAgent(false);
    }
  };

  const handleIntervalChange = async (newInterval: number) => {
    setAgentInterval(newInterval);
    try {
      const res = await fetch("/api/workflow-agent/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: agentActive, intervalMinutes: newInterval })
      });
      if (res.ok) {
        const data = await res.json();
        setAgentInterval(data.intervalMinutes);
      }
    } catch (err) {
      console.error("Failed to update agent interval:", err);
    }
  };

  const handleRunAgentNow = async () => {
    setRunningAgentNow(true);
    try {
      const res = await fetch("/api/workflow-agent/run-now", { method: "POST" });
      if (res.ok) {
        setAgentStatus("running");
        fetchAgentStatus();
      } else {
        const data = await res.json();
        alert(data.error || "فشل إطلاق الفحص.");
      }
    } catch (err: any) {
      alert("خطأ أثناء الاتصال بالخادم: " + err.message);
    } finally {
      setRunningAgentNow(false);
    }
  };

  const loadZernioFromLocalStorage = () => {
    const savedZernioKey = localStorage.getItem("zernio_api_key") || "";
    const savedZernioWebhook = localStorage.getItem("zernio_webhook_url") || "";
    const savedZernioMode = (localStorage.getItem("zernio_integration_mode") as "api" | "webhook") || "webhook";
    
    setZernioIntegrationMode(savedZernioMode);
    
    if (savedZernioMode === "api") {
      if (savedZernioKey) {
        setZernioApiKey(savedZernioKey);
        fetchZernioProfilesForToken(savedZernioKey);
      }
    } else {
      if (savedZernioWebhook) {
        setZernioWebhookUrl(savedZernioWebhook);
        setZernioApiKey(savedZernioWebhook);
        setZernioProfileId("WEBHOOK_MODE");
      }
    }
  };

  const loadLinkedZernioAccounts = async (uid: string) => {
    setLoadingZernioAccounts(true);
    try {
      const { data, error } = await supabase.from("zernio_accounts").select("*").eq("user_id", uid);
      if (error) throw error;
      const list = data || [];
      setZernioAccounts(list);
      
      if (list.length > 0) {
        setSelectedZernioAccountId(list[0].id);
        applyZernioAccount(list[0]);
      } else {
        loadZernioFromLocalStorage();
      }
    } catch (err) {
      console.error("Error loading linked Zernio accounts in tracker:", err);
      loadZernioFromLocalStorage();
    } finally {
      setLoadingZernioAccounts(false);
    }
  };

  const loadLinkedBufferAccounts = async (uid: string) => {
    setLoadingBufferAccounts(true);
    try {
      const { data, error } = await supabase.from("buffer_accounts").select("*").eq("user_id", uid);
      if (error) throw error;
      const list = data || [];
      setBufferAccounts(list);
      
      if (list.length > 0) {
        setSelectedBufferAccountId(list[0].id);
        applyBufferAccount(list[0]);
      } else {
        const savedToken = localStorage.getItem("buffer_access_token") || "";
        if (savedToken) {
          setBufferAccessToken(savedToken);
          fetchProfilesForToken(savedToken);
        }
      }
    } catch (err) {
      console.error("Error loading linked Buffer accounts in tracker:", err);
    } finally {
      setLoadingBufferAccounts(false);
    }
  };

  const applyBufferAccount = (acc: any) => {
    setBufferAccessToken(acc.access_token || "");
    fetchProfilesForToken(acc.access_token || "");
  };

  const applyZernioAccount = (acc: any) => {
    if (acc.webhook_url && acc.api_key === "WEBHOOK_MODE") {
      setZernioIntegrationMode("webhook");
      setZernioWebhookUrl(acc.webhook_url);
      setZernioApiKey(acc.webhook_url);
      setZernioProfileId("WEBHOOK_MODE");
      setZernioProfiles([]);
    } else {
      setZernioIntegrationMode("api");
      setZernioApiKey(acc.api_key || "");
      setZernioWebhookUrl("");
      fetchZernioProfilesForToken(acc.api_key || "");
    }
  };

  const fetchAvailableProxies = async (uid: string) => {
    try {
      if (uid) {
        const { data } = await supabase.settings.get(uid);
        if (data && data.yt_proxy) {
          try {
            const parsed = JSON.parse(data.yt_proxy);
            if (Array.isArray(parsed)) {
              setAvailableProxies(parsed);
            } else {
              setAvailableProxies([data.yt_proxy]);
            }
          } catch (e) {
            const list = data.yt_proxy.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
            setAvailableProxies(list);
          }
        }
      } else {
        const stored = localStorage.getItem("yt_proxy") || "";
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setAvailableProxies(parsed);
            } else {
              setAvailableProxies([stored]);
            }
          } catch (e) {
            const list = stored.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
            setAvailableProxies(list);
          }
        }
      }
    } catch (err) {
      console.error("Error loading proxies:", err);
    }
  };

  const fetchAutomationSettings = async () => {
    try {
      const res = await fetch("/api/automation-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.automation_default_max_videos !== undefined) setMaxVideosPerDay(data.automation_default_max_videos);
        if (data.automation_default_content_type !== undefined) setTargetContentType(data.automation_default_content_type);
        if (data.automation_default_processing_mode !== undefined) setProcessingMode(data.automation_default_processing_mode);
        if (data.automation_default_hflip !== undefined) setHflip(data.automation_default_hflip);
        if (data.automation_default_speed_up !== undefined) setSpeedUp(data.automation_default_speed_up);
        if (data.automation_default_pitch_shift !== undefined) setPitchShift(data.automation_default_pitch_shift);
        if (data.automation_default_color_boost !== undefined) setColorBoost(data.automation_default_color_boost);
        if (data.automation_custom_hashtags !== undefined) setCustomHashtags(data.automation_custom_hashtags);
        if (data.automation_hashtag_option !== undefined) setHashtagOption(data.automation_hashtag_option);
      }
    } catch (err) {
      console.error("Failed to load automation settings from DB:", err);
    }
  };

  const handleSaveGlobalAutomationDefaults = async () => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/automation-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation_default_processing_mode: processingMode,
          automation_default_max_videos: maxVideosPerDay,
          automation_default_content_type: targetContentType,
          automation_default_hflip: hflip,
          automation_default_speed_up: speedUp,
          automation_default_pitch_shift: pitchShift,
          automation_default_color_boost: colorBoost,
          automation_custom_hashtags: customHashtags,
          automation_hashtag_option: hashtagOption,
        })
      });
      if (res.ok) {        setSuccessMsg("تم حفظ الإعدادات الافتراضية للأتمتة والهاشتاغات بنجاح في قاعدة البيانات PostgreSQL! 🗄️");
      } else {
        const errData = await res.json();
        setErrorMsg("فشل حفظ الإعدادات: " + errData.error);
      }
    } catch (err: any) {
      setErrorMsg("خطأ أثناء الاتصال بالخادم: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchLogs();
    fetchAutomationSettings();

    // Load Caption Templates
    fetch("/api/caption-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCaptionTemplates(data);
          const def = data.find((t: any) => t.is_default) || data[0];
          setSelectedCaptionTemplateId(def.id);
        }
      })
      .catch((e) => console.warn("Failed loading caption templates in ChannelTrackerHub:", e));

    // Load currentUser and linked Zernio/Buffer accounts
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        loadLinkedZernioAccounts(user.id);
        loadLinkedBufferAccounts(user.id);
        fetchAvailableProxies(user.id);
      } else {
        loadZernioFromLocalStorage();
        fetchAvailableProxies("");
      }
    }).catch(() => {
      loadZernioFromLocalStorage();
      fetchAvailableProxies("");
    });
  }, []);

  const fetchProfilesForToken = async (token: string) => {
    if (!token.trim()) return;
    setLoadingProfiles(true);
    setProfilesError(null);
    try {
      const res = await fetch("/api/buffer/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل جلب الحسابات من Buffer.");
      }
      const fetched = data.profiles || [];
      setImportedProfiles(fetched);
      if (fetched.length > 0) {
        setBufferProfileId(fetched[0].id);
        setSelectedMultiBufferProfiles(fetched.map((p: any) => p.id));
      }
    } catch (err: any) {
      setProfilesError(err.message || "حدث خطأ أثناء تحميل حسابات Buffer.");
    } finally {
      setLoadingProfiles(false);
    }
  };

  const fetchZernioProfilesForToken = async (key: string) => {
    if (!key.trim()) return;
    setLoadingZernioProfiles(true);
    try {
      const res = await fetch("/api/zernio/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const fetched = data.profiles || [];
        setZernioProfiles(fetched);
        if (fetched.length > 0) {
          setZernioProfileId(fetched[0].id);
          setSelectedMultiZernioProfiles(fetched.map((p: any) => p.id));
        }
      }
    } catch (err) {
      console.error("Failed fetching Zernio profiles inside tracker:", err);
    } finally {
      setLoadingZernioProfiles(false);
    }
  };

  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const { data, error } = await supabase
        .from("tracked_channels")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setChannels(data || []);
    } catch (err) {
      console.error("Failed to load channels", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!channelQuery.trim()) {
      setErrorMsg("يرجى إدخال رابط أو معرف قناة اليوتيوب.");
      return;
    }

    const targetBufferId = selectedPlatform === "buffer"
      ? (trackerAccountScope === "single"
          ? bufferProfileId.trim()
          : (selectedMultiBufferProfiles.length > 0 ? selectedMultiBufferProfiles.join(",") : bufferProfileId.trim()))
      : undefined;

    const targetZernioId = selectedPlatform === "zernio"
      ? (trackerAccountScope === "single"
          ? (zernioProfileId.trim() || "WEBHOOK_MODE")
          : (selectedMultiZernioProfiles.length > 0 ? selectedMultiZernioProfiles.join(",") : (zernioProfileId.trim() || "WEBHOOK_MODE")))
      : undefined;

    if (selectedPlatform === "buffer" && (!targetBufferId || !bufferAccessToken.trim())) {
      setErrorMsg("يرجى تحديد حسابات النشر في Buffer وإدخال رمز الوصول.");
      return;
    }

    if (selectedPlatform === "zernio" && !zernioApiKey.trim() && !zernioWebhookUrl.trim()) {
      setErrorMsg("يرجى إدخال إما مفتاح API Key الخاص بـ Zernio أو رابط Webhook URL الخاص بك.");
      return;
    }

    setActionLoading(true);

    try {
      // 1. Fetch channel details first using our backend info endpoint
      const res = await fetch("/api/channel-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelQuery, targetContentType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل جلب تفاصيل قناة اليوتيوب.");
      }

      const cleanHandle = channelQuery.startsWith("@") ? channelQuery : `@${data.channelTitle.replace(/\s+/g, "")}`;
      
      const newChannel: TrackedChannel = {
        channel_name: data.channelTitle || "قناة يوتيوب",
        channel_handle: cleanHandle,
        channel_url: data.channelUrl || channelQuery,
        platform: selectedPlatform,
        buffer_profile_id: targetBufferId,
        buffer_access_token: selectedPlatform === "buffer" ? bufferAccessToken.trim() : undefined,
        zernio_profile_id: targetZernioId,
        zernio_api_key: selectedPlatform === "zernio" ? (zernioApiKey.trim() || zernioWebhookUrl.trim()) : undefined,
        user_id: currentUser?.id || undefined,
        bypass_settings: {
          processingMode,
          rawUpload: processingMode === "raw",
          hflip,
          speedUp,
          pitchShift,
          colorBoost,
          maxVideosPerDay,
          proxy: selectedProxy,
          targetContentType,
          enableLogo,
          logoUrl,
          logoPosition,
          logoSize,
          logoOpacity,
          enableCaption,
          caption_template_id: enableCaption ? selectedCaptionTemplateId : null,
          caption_text_source: enableCaption ? captionTextSource : "title",
          caption_custom_text: (enableCaption && captionTextSource === "custom") ? captionCustomText : ""
        }
      };

      // Store in database
      const { error } = await supabase.from("tracked_channels").insert(newChannel);
      if (error) throw error;

      setSuccessMsg(`تم تفعيل التتبع التلقائي لقناة "${newChannel.channel_name}" بنجاح! 🎉`);
      setChannelQuery("");
      setSelectedProxy("");
      
      // Refresh list
      fetchChannels();
      
      // Log this action
      await supabase.from("automation_logs").insert({
        channel_name: newChannel.channel_name,
        video_title: "تفعيل تتبع جديد",
        status: "success",
        message: `تم ربط القناة مع منصة (${selectedPlatform === "zernio" ? "Zernio.com" : "Buffer"}) وبدء التتبع والنشر التلقائي عبر المنصة الموحدة.`,
      });
      fetchLogs();
    } catch (err: any) {
      setErrorMsg(err.message || "فشل إضافة القناة للتتبع.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    const isOk = await confirm({
      title: "إلغاء تتبع القناة",
      message: `هل أنت متأكد من إلغاء تتبع قناة "${name}" وحذفها من القوائم؟`,
      confirmText: "إلغاء التتبع",
      cancelText: "تراجع",
      variant: "danger",
    });
    if (!isOk) return;

    try {
      const { error } = await supabase.from("tracked_channels").delete().eq("id", id);
      if (error) throw error;

      setChannels(channels.filter(c => c.id !== id));
      
      // Log deletion
      await supabase.from("automation_logs").insert({
        channel_name: name,
        video_title: "إلغاء التتبع",
        status: "warning",
        message: "تم إلغاء تتبع القناة وحذف الإعدادات التلقائية الخاصة بها.",
      });
      fetchLogs();
    } catch (err) {
      console.error("Failed to delete channel", err);
    }
  };

  const handleTogglePause = async (idx: number) => {
    const channel = channels[idx];
    if (!channel || !channel.id) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    const newPauseState = !channel.is_paused;
    try {
      const { error } = await supabase
        .from("tracked_channels")
        .update({ is_paused: newPauseState })
        .eq("id", channel.id);

      if (error) throw error;

      // Update local state
      const updatedChannels = [...channels];
      updatedChannels[idx] = { ...channel, is_paused: newPauseState };
      setChannels(updatedChannels);

      // Log action
      await supabase.from("automation_logs").insert({
        channel_name: channel.channel_name,
        video_title: newPauseState ? "تعليق النشر التلقائي" : "تفعيل النشر التلقائي",
        status: newPauseState ? "warning" : "success",
        message: newPauseState 
          ? "تم تعليق النشر التلقائي لهذه القناة بنجاح. لن يتم نشر الفيديوهات الجديدة تلقائياً."
          : "تم تفعيل النشر التلقائي لهذه القناة بنجاح. سيتم فحص ونشر المقاطع الجديدة.",
      });
      fetchLogs();
      setSuccessMsg(newPauseState ? `تم تعليق النشر التلقائي لقناة "${channel.channel_name}"` : `تم تفعيل النشر التلقائي لقناة "${channel.channel_name}"`);
    } catch (err: any) {
      console.error("Failed to toggle pause", err);
      setErrorMsg(err.message || "فشل تعديل حالة النشر التلقائي.");
    }
  };

  // Trigger Live Auto Sync for a specific tracked channel
  const handleTriggerSync = async (idx: number) => {
    const channel = channels[idx];
    if (!channel) return;

    if (channel.is_paused) {
      setErrorMsg("النشر التلقائي معلق لهذه القناة. يرجى تفعيل النشر أولاً من الزر المخصص.");
      return;
    }

    setSyncingIdx(idx);
    setSyncLogs(["جاري الاتصال بقنوات يوتيوب وسحب قائمة الفيديوهات الأخيرة..."]);
    
    try {
      await new Promise(r => setTimeout(r, 1200));
      
      // 1. Fetch channel videos from our server endpoint
      const res = await fetch("/api/channel-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          channelQuery: channel.channel_url,
          proxyUrl: channel.bypass_settings?.proxy,
          targetContentType: channel.bypass_settings?.targetContentType || "both"
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل سحب الفيديوهات.");

      const newestVideo = data.videos && data.videos[0];
      if (!newestVideo) {
        setSyncLogs(prev => [...prev, "⚠️ لم يتم العثور على أي مقاطع فيديو عامة في هذه القناة حالياً."]);
        throw new Error("لا توجد مقاطع فيديو في القناة.");
      }

      setSyncLogs(prev => [
        ...prev,
        `✓ تم العثور على أحدث فيديو: "${newestVideo.title}"`,
        `[-] جاري فحص حالة النشر للفيديو لمنع التكرار...`
      ]);
      await new Promise(r => setTimeout(r, 1000));      // 2. Check Daily Limit from logs
      const { data: logs, error: countError } = await supabase.from("automation_logs");
      if (countError) throw countError;

      const todayStr = new Date().toISOString().split("T")[0];
      const todayLogs = (logs || []).filter((l: any) => 
        l.channel_name === channel.channel_name && 
        l.status === "success" && 
        l.created_at && l.created_at.startsWith(todayStr)
      );

      const dailyCount = todayLogs.length;
      const limit = channel.bypass_settings?.maxVideosPerDay || 3;
      if (dailyCount >= limit) {
        setSyncLogs(prev => [...prev, `⚠️ تم الوصول للحد الأقصى اليومي للنشر للقناة "${channel.channel_name}" (${dailyCount}/${limit}). سيتم التخطي.`]);
        setSyncingIdx(null);
        return;
      }
      
      // 3. Process with ffmpeg and upload to Cloudinary
      setSyncLogs(prev => [
        ...prev,
        `[-] جاري سحب رابط البث المباشر للفيديو باستخدام yt-dlp...`
      ]);

      const infoRes = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          videoUrl: newestVideo.url,
          proxyUrl: channel.bypass_settings?.proxy
        })
      });

      const infoData = await infoRes.json();
      if (!infoRes.ok) {
        throw new Error(infoData.error || "فشل الحصول على معلومات الفيديو ورابط البث.");
      }

      const bestVideoUrl = infoData.bestVideoUrl;
      if (!bestVideoUrl) {
        throw new Error("فشل الحصول على رابط بث مباشر صالح للفيديو.");
      }

      setSyncLogs(prev => [
        ...prev,
        `✓ تم سحب رابط البث المباشر بنجاح!`,
        `[-] جاري رفع الفيديو وتطبيق فلاتر تجنب الكوبيرايت وتخزينه على Cloudinary سحابياً...`
      ]);

      const uploadRes = await fetch("/api/upload-cloudinary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrl: bestVideoUrl,
          title: newestVideo.title,
          videoUrl: newestVideo.url,
          cookiesText: "",
          avoidCopyright: true,
          hflip: channel.bypass_settings?.hflip || false,
          speedUp: channel.bypass_settings?.speedUp || false,
          pitchShift: channel.bypass_settings?.pitchShift || false,
          colorBoost: channel.bypass_settings?.colorBoost || false
        })
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "فشل معالجة الفيديو ورفعه إلى Cloudinary.");
      }

      const finalVideoUrl = uploadData.secureUrl;
      if (!finalVideoUrl) {
        throw new Error("فشل استلام رابط فيديو صالح بعد المعالجة والرفع.");
      }

      setSyncLogs(prev => [
        ...prev,
        `✓ تم تعديل الفيديو ورفعه بنجاح إلى Cloudinary سحابياً! الرابط متوفر الآن.`
      ]);

      const isZernio = channel.platform === "zernio";
      let publishStatusMessage = "";
      
      setSyncLogs(prev => [
        ...prev,
        isZernio 
          ? `[-] جاري إرسال المنشور ونشر الفيديو تلقائياً إلى منصة Zernio...`
          : `[-] جاري إرسال المنشور ونشر الفيديو تلقائياً إلى حساب Buffer الخاص بك...`
      ]);

      if (isZernio) {
        publishStatusMessage = `تمت الأتمتة بنجاح! تم كشف مقطع جديد، تطبيق فلاتر الكوبيرايت، ونشره بنجاح عبر Zernio إلى الحساب (${channel.zernio_profile_id}).`;
        try {
          const isWebhook = channel.zernio_profile_id === "WEBHOOK_MODE";
          const publishRes = await fetch("/api/zernio/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: isWebhook ? undefined : channel.zernio_api_key,
              webhookUrl: isWebhook ? channel.zernio_api_key : undefined,
              profileIds: isWebhook ? undefined : [channel.zernio_profile_id],
              text: generateSmartCaption(newestVideo.title, "#Zernio"),
              media: {
                video: finalVideoUrl,
                thumbnail: newestVideo.thumbnail
              },
              now: true
            })
          });

          const publishData = await publishRes.json();
          if (publishRes.ok) {
            setSyncLogs(prev => [
              ...prev,
              `✓ تم النشر بنجاح وتأكيد الإرسال عبر Zernio!`
            ]);
          } else {
            publishStatusMessage = `تنبيه: تم تسجيل معالجة الفيديو ولكن فشل النشر في Zernio: ${publishData.error || "خطأ غير معروف"}`;
            setSyncLogs(prev => [
              ...prev,
              `⚠️ تنبيه: تم تسجيل معالجة الفيديو ولكن فشل النشر في Zernio: ${publishData.error || "خطأ غير معروف"}`
            ]);
          }
        } catch (publishErr: any) {
          publishStatusMessage = `تنبيه: تم تسجيل معالجة الفيديو ولكن فشل الاتصال بـ Zernio: ${publishErr.message}`;
          setSyncLogs(prev => [
            ...prev,
            `⚠️ فشل الاتصال بـ Zernio: ${publishErr.message}`
          ]);
        }
      } else {
        publishStatusMessage = `تمت الأتمتة بنجاح! تم كشف مقطع جديد، تطبيق فلاتر الكوبيرايت، ونشره بنجاح عبر Buffer إلى الحساب (${channel.buffer_profile_id}).`;
        try {
          const publishRes = await fetch("/api/buffer/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: channel.buffer_access_token,
              profileIds: [channel.buffer_profile_id],
              text: generateSmartCaption(newestVideo.title),
              media: {
                video: finalVideoUrl,
                thumbnail: newestVideo.thumbnail
              },
              now: true
            })
          });

          const publishData = await publishRes.json();
          if (publishRes.ok) {
            setSyncLogs(prev => [
              ...prev,
              `✓ تم النشر بنجاح وتأكيد الإرسال عبر Buffer!`
            ]);
          } else {
            publishStatusMessage = `تنبيه: تم تسجيل معالجة الفيديو ولكن فشل النشر في Buffer: ${publishData.error || "خطأ غير معروف"}`;
            setSyncLogs(prev => [
              ...prev,
              `⚠️ تنبيه: تم تسجيل معالجة الفيديو ولكن فشل النشر في Buffer: ${publishData.error || "خطأ غير معروف"}`
            ]);
          }
        } catch (publishErr: any) {
          publishStatusMessage = `تنبيه: تم تسجيل معالجة الفيديو ولكن فشل الاتصال بـ Buffer: ${publishErr.message}`;
          setSyncLogs(prev => [
            ...prev,
            `⚠️ فشل الاتصال بـ Buffer: ${publishErr.message}`
          ]);
        }
      }

      // Successfully processed! Add to processed table and logs
      if (channel.id) {
        await supabase.from("processed_videos").insert({
          channel_id: channel.id,
          video_id: newestVideo.id,
          video_title: newestVideo.title,
          published_to_buffer: true,
        });
      }

      await supabase.from("automation_logs").insert({
        channel_name: channel.channel_name,
        video_title: newestVideo.title,
        status: "success",
        message: publishStatusMessage,
      });

      setSyncLogs(prev => [
        ...prev,
        `✓ تم تسجيل المعالجة وتحديث قاعدة البيانات بنجاح.`,
        `🎉 الأتمتة اكتملت بالكامل!`
      ]);
      
      setTimeout(() => {
        setSyncingIdx(null);
        fetchLogs();
      }, 3000);

    } catch (err: any) {
      console.error("[Sync] Error during automation:", err);
      setSyncLogs(prev => [
        ...prev,
        `❌ فشل الأتمتة: ${err.message || "حدث خطأ أثناء المعالجة."}`
      ]);
      
      await supabase.from("automation_logs").insert({
        channel_name: channel.channel_name,
        video_title: "عملية التتبع",
        status: "error",
        message: `فشلت الأتمتة للفيديو المكتشف: ${err.message || "خطأ غير معروف"}`,
      });

      setTimeout(() => {
        setSyncingIdx(null);
        fetchLogs();
      }, 4000);
    }
  };

  return (
    <div className="space-y-6 text-right animate-fade-in" id="tracker-hub-root">
      
      {/* Tracker Hero banner */}
      <div className="bg-gradient-to-l from-indigo-900 to-indigo-950 border border-indigo-500/20 rounded-3xl p-6 md:p-8 text-white space-y-4">
        <div className="flex items-start justify-between">
          <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 text-[11px] px-3 py-1 rounded-full font-bold">
            ميزة الأتمتة التلقائية ⚡
          </span>
          <Youtube className="w-8 h-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">تتبع قنوات يوتيوب ونشرها عبر Buffer تلقائياً</h2>
          <p className="text-xs text-indigo-200/90 leading-relaxed max-w-2xl">
            أضف قنوات يوتيوب المفضلة للتتبع المستمر. بمجرد نشر القناة لأي مقطع فيديو جديد، سيقوم النظام تلقائياً بسحب المقطع، تطبيق فلاتر "تجنب الكوبيرايت وحظر الأمان" (تسريع، انعكاس، تباين)، ثم رفعه ونشره تلقائياً على حساب Buffer المرتبط بك.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RIGHT PANEL: Add channel to track */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              <span>إضافة قناة جديدة للتتبع التلقائي</span>
              <Plus className="w-4 h-4 text-indigo-600" />
            </h4>

            <form onSubmit={handleAddChannel} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">قناة يوتيوب المراد تتبعها</label>
                <input
                  type="text"
                  placeholder="رابط القناة أو المعرف (مثال: @NoCopyrightSounds)"
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              {/* Target Content Type Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>نوع المقاطع المستهدفة للتتبع والنشر:</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">تحديد المستهدف 🎯</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetContentType("both")}
                    className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      targetContentType === "both"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🎥 + ⚡</span>
                    <span>كلاهما</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetContentType("videos")}
                    className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      targetContentType === "videos"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🎥</span>
                    <span>فيديوهات فقط</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetContentType("shorts")}
                    className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      targetContentType === "shorts"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>⚡</span>
                    <span>Shorts فقط</span>
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">منصة النشر التلقائي للربط</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform("buffer")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      selectedPlatform === "buffer"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buffer 🌐</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform("zernio")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      selectedPlatform === "zernio"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Zernio ⚡</span>
                  </button>
                </div>
              </div>

              {/* Proxy Selector - 3rd child of form */}
              <div className="space-y-1 bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  <span>البروكسي المخصص لقناة التتبع</span>
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                </label>
                {availableProxies.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center py-2 bg-slate-100 rounded-xl">
                    لم يتم إعداد بروكسيات في صفحة "مدير البروكسي" بعد. سيتم استخدام البروكسي الافتراضي للنظام.
                  </div>
                ) : (
                  <CustomSelect
                    options={[
                      { value: "", label: "-- البروكسي الافتراضي --" },
                      ...availableProxies.map((p) => ({
                        value: p,
                        label: p,
                        badge: "IP Proxy",
                      })),
                    ]}
                    value={selectedProxy}
                    onChange={(val) => setSelectedProxy(val)}
                    placeholder="اختر البروكسي المخصص..."
                    variant="light"
                  />
                )}
                <p className="text-[10px] text-slate-400 mt-1 text-right">سيتم ربط هذا البروكسي تحديداً بعملية فحص وسحب الفيديوهات وتجنب الحظر على هذه القناة.</p>
              </div>

              {selectedPlatform === "buffer" ? (
                <>
                  {!manualInputMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setManualInputMode(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          تعديل يدوي متقدم؟
                        </button>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>حساب النشر المربوط في Buffer</span>
                          {loadingProfiles && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        </label>
                      </div>

                      {/* Buffer Accounts Selector */}
                      {Array.isArray(bufferAccounts) && bufferAccounts.length > 0 && (
                        <div className="space-y-1.5 pb-2 border-b border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700">اختر حساب Buffer المربوط:</label>
                          <select
                            value={selectedBufferAccountId}
                            onChange={(e) => {
                              const accId = e.target.value;
                              setSelectedBufferAccountId(accId);
                              const found = bufferAccounts.find(a => a.id === accId);
                              if (found) {
                                applyBufferAccount(found);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          >
                            {bufferAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {loadingProfiles ? (
                        <div className="flex items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 font-semibold gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>جاري تحميل الحسابات المرتبطة من Buffer...</span>
                        </div>
                      ) : importedProfiles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1">
                            <label className="text-xs font-bold text-slate-700">اختر حسابات النشر في Buffer</label>
                            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setTrackerAccountScope("single")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                  trackerAccountScope === "single"
                                    ? "bg-white text-indigo-600 shadow-2xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                حساب واحد 👤
                              </button>
                              <button
                                type="button"
                                onClick={() => setTrackerAccountScope("multiple")}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                  trackerAccountScope === "multiple"
                                    ? "bg-indigo-600 text-white shadow-2xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                عدة حسابات 👥 ({selectedMultiBufferProfiles.length})
                              </button>
                            </div>
                          </div>

                          {trackerAccountScope === "single" ? (
                            <>
                              <select
                                value={bufferProfileId}
                                onChange={(e) => setBufferProfileId(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold"
                                required
                              >
                                {importedProfiles.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.formatted_service} ({p.service_username})
                                  </option>
                                ))}
                              </select>
                              
                              {/* Show active selection details */}
                              {(() => {
                                const activeProfile = importedProfiles.find(p => p.id === bufferProfileId);
                                if (!activeProfile) return null;
                                return (
                                  <div className="flex items-center gap-2.5 bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-2.5 text-right">
                                    {activeProfile.avatar && (
                                      <img
                                        src={activeProfile.avatar}
                                        alt={activeProfile.service_username}
                                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[10px] font-bold text-slate-800">
                                        {activeProfile.formatted_service}
                                      </div>
                                      <div className="text-[9px] text-slate-500 font-mono truncate">
                                        @{activeProfile.service_username} • {activeProfile.id}
                                      </div>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                      مستورد وجاهز ✓
                                    </span>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-600">اختر الحسابات التي سيتم التتبع والنشر فيها تلقائياً:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedMultiBufferProfiles.length === importedProfiles.length) {
                                      setSelectedMultiBufferProfiles([]);
                                    } else {
                                      setSelectedMultiBufferProfiles(importedProfiles.map(p => p.id));
                                    }
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                >
                                  {selectedMultiBufferProfiles.length === importedProfiles.length ? "إلغاء الكل" : "تحديد الكل"}
                                </button>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                {importedProfiles.map((p) => {
                                  const isChecked = selectedMultiBufferProfiles.includes(p.id);
                                  return (
                                    <label
                                      key={p.id}
                                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                        isChecked
                                          ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setSelectedMultiBufferProfiles(prev =>
                                              prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                            );
                                          }}
                                          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                        />
                                        {p.avatar && (
                                          <img
                                            src={p.avatar}
                                            alt={p.service_username}
                                            className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                            referrerPolicy="no-referrer"
                                          />
                                        )}
                                        <span className="truncate font-bold text-[11px] text-slate-800">
                                          {p.formatted_service} (@{p.service_username})
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                        {p.formatted_service}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl text-xs text-amber-900 leading-relaxed space-y-2 text-right">
                          <p className="font-semibold text-[11px] text-amber-950">
                            لم يتم العثور على رمز وصول Buffer أو لم يتم ربط أي حسابات بعد.
                          </p>
                          <p className="text-[10px] text-slate-600">
                            يرجى الانتقال لصفحة <strong>"الإعدادات"</strong> لإضافة حساب Buffer الخاص بك، لتتمكن من استيراد قنوات النشر تلقائياً هنا.
                          </p>
                          <div className="flex justify-between items-center pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser) {
                                  loadLinkedBufferAccounts(currentUser.id);
                                }
                              }}
                              className="px-2 py-1 bg-white hover:bg-slate-50 border border-amber-300 text-[10px] font-bold rounded-lg transition-colors text-amber-900 cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-700" />
                              <span>إعادة التحقق</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setManualInputMode(true)}
                              className="text-[9px] text-indigo-700 font-bold hover:underline"
                            >
                              أو أدخل البيانات يدوياً ⚙️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setManualInputMode(false)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          العودة للاستيراد التلقائي؟
                        </button>
                        <span className="text-xs font-bold text-slate-700">إدخال يدوي متقدم</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">معرف حساب النشر في Buffer (Profile ID)</label>
                        <input
                          type="text"
                          placeholder="أدخل معرف الحساب في Buffer"
                          value={bufferProfileId}
                          onChange={(e) => setBufferProfileId(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold text-left font-sans"
                          style={{ direction: "ltr" }}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">رمز وصول Buffer (Buffer Access Token)</label>
                        <input
                          type="password"
                          placeholder="أدخل رمز الوصول الخاص بـ Buffer"
                          value={bufferAccessToken}
                          onChange={(e) => setBufferAccessToken(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          required
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  {!manualZernioInputMode ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setManualZernioInputMode(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          تعديل يدوي متقدم؟
                        </button>
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>ربط الأتمتة بـ Zernio</span>
                          {(loadingZernioProfiles || loadingZernioAccounts) && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                        </label>
                      </div>

                      {/* Zernio Accounts Selector */}
                      {Array.isArray(zernioAccounts) && zernioAccounts.length > 0 && (
                        <div className="space-y-1.5 pb-2 border-b border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700">اختر حساب Zernio المربوط:</label>
                          <select
                            value={selectedZernioAccountId}
                            onChange={(e) => {
                              const accId = e.target.value;
                              setSelectedZernioAccountId(accId);
                              const found = zernioAccounts.find(a => a.id === accId);
                              if (found) {
                                applyZernioAccount(found);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                          >
                            {zernioAccounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.api_key === "WEBHOOK_MODE" ? "Webhook" : "API Key"})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {zernioIntegrationMode === "webhook" ? (
                        <div className="space-y-2.5">
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-right">
                            <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1 mb-1 justify-end">
                              <span>طريقة الربط النشطة: رابط Webhook ⚡</span>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">
                              تم استيراد رابط الـ Webhook الخاص بك تلقائياً من صفحة الناشر وسيتم إرسال الفيديوهات المكتشفة إليه مباشرة.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500">رابط الـ Webhook المستورد</label>
                            <input
                              type="text"
                              value={zernioWebhookUrl || "لم يتم ضبط رابط ويب-هوك بعد في صفحة الناشر"}
                              readOnly
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left text-slate-500 select-all"
                              style={{ direction: "ltr" }}
                            />
                          </div>
                        </div>
                      ) : (
                        // API Mode
                        <div className="space-y-2.5">
                          {loadingZernioProfiles ? (
                            <div className="flex items-center justify-center p-4 bg-white border border-slate-100 rounded-xl text-xs text-slate-500 font-semibold gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                              <span>جاري تحميل قنوات النشر من Zernio...</span>
                            </div>
                          ) : zernioProfiles.length > 0 ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pb-1">
                                <label className="text-xs font-bold text-slate-700">اختر قنوات النشر في Zernio</label>
                                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => setTrackerAccountScope("single")}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                      trackerAccountScope === "single"
                                        ? "bg-white text-indigo-600 shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    حساب واحد 👤
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTrackerAccountScope("multiple")}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                      trackerAccountScope === "multiple"
                                        ? "bg-indigo-600 text-white shadow-2xs"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                                  >
                                    عدة حسابات 👥 ({selectedMultiZernioProfiles.length})
                                  </button>
                                </div>
                              </div>

                              {trackerAccountScope === "single" ? (
                                <>
                                  <select
                                    value={zernioProfileId}
                                    onChange={(e) => setZernioProfileId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold"
                                    required
                                  >
                                    {zernioProfiles.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.formatted_service} ({p.service_username})
                                      </option>
                                    ))}
                                  </select>

                                  {/* Show active selection details */}
                                  {(() => {
                                    const activeProfile = zernioProfiles.find(p => p.id === zernioProfileId);
                                    if (!activeProfile) return null;
                                    return (
                                      <div className="flex items-center gap-2.5 bg-indigo-50/20 border border-indigo-100/50 rounded-xl p-2.5 text-right mt-1.5">
                                        {activeProfile.avatar && (
                                          <img
                                            src={activeProfile.avatar}
                                            alt={activeProfile.service_username}
                                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                            referrerPolicy="no-referrer"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[10px] font-bold text-slate-800">
                                            {activeProfile.formatted_service}
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-mono truncate">
                                            @{activeProfile.service_username} • {activeProfile.id}
                                          </div>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                          مستورد وجاهز ✓
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                                    <span className="text-[10px] font-bold text-slate-600">اختر الحسابات التي سيتم التتبع والنشر فيها تلقائياً:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (selectedMultiZernioProfiles.length === zernioProfiles.length) {
                                          setSelectedMultiZernioProfiles([]);
                                        } else {
                                          setSelectedMultiZernioProfiles(zernioProfiles.map(p => p.id));
                                        }
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                    >
                                      {selectedMultiZernioProfiles.length === zernioProfiles.length ? "إلغاء الكل" : "تحديد الكل"}
                                    </button>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                    {zernioProfiles.map((p) => {
                                      const isChecked = selectedMultiZernioProfiles.includes(p.id);
                                      return (
                                        <label
                                          key={p.id}
                                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                            isChecked
                                              ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                setSelectedMultiZernioProfiles(prev =>
                                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                );
                                              }}
                                              className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                            />
                                            {p.avatar && (
                                              <img
                                                src={p.avatar}
                                                alt={p.service_username}
                                                className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                                referrerPolicy="no-referrer"
                                              />
                                            )}
                                            <span className="truncate font-bold text-[11px] text-slate-800">
                                              {p.formatted_service} (@{p.service_username})
                                            </span>
                                          </div>
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                            {p.formatted_service}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-amber-50/50 border border-amber-200/60 p-3.5 rounded-xl text-xs text-amber-900 leading-relaxed space-y-2 text-right">
                              <p className="font-semibold text-[11px] text-amber-950">
                                لم يتم العثور على حسابات مستوردة من Zernio.
                              </p>
                              <p className="text-[10px] text-slate-600">
                                يرجى الانتقال إلى صفحة <strong>"ناشر Zernio ⚡"</strong> لحفظ وتفعيل حساباتك أولاً باستخدام مفتاح API.
                              </p>
                              <div className="flex justify-between items-center pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const savedKey = localStorage.getItem("zernio_api_key") || "";
                                    if (savedKey) {
                                      setZernioApiKey(savedKey);
                                      fetchZernioProfilesForToken(savedKey);
                                    } else {
                                      alert("يرجى إعداد وحفظ حساب Zernio أولاً في تبويب 'ناشر Zernio'.");
                                    }
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-amber-300 text-[10px] font-bold rounded-lg transition-colors text-amber-900 cursor-pointer flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3 text-amber-700" />
                                  <span>إعادة التحقق</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => setManualZernioInputMode(true)}
                                  className="text-[9px] text-indigo-700 font-bold hover:underline"
                                >
                                  أو أدخل البيانات يدوياً ⚙️
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setManualZernioInputMode(false)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          العودة للاستيراد التلقائي؟
                        </button>
                        <span className="text-xs font-bold text-slate-700">إدخال يدوي متقدم</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">طريقة الربط بـ Zernio</label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setZernioProfileId("");
                              setZernioApiKey("");
                              setZernioWebhookUrl("");
                            }}
                            className={`py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              !zernioApiKey && zernioWebhookUrl
                                ? "bg-slate-400/20 text-indigo-700"
                                : "bg-white text-indigo-600 shadow-2xs"
                            }`}
                          >
                            <span>رابط الـ Webhook ⚡</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const savedKey = localStorage.getItem("zernio_api_key") || "";
                              if (savedKey) {
                                setZernioApiKey(savedKey);
                                fetchZernioProfilesForToken(savedKey);
                              }
                            }}
                            className="py-1.5 text-[11px] font-bold rounded-md text-slate-600 hover:text-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>مفتاح API Key 🔑</span>
                          </button>
                        </div>
                      </div>

                      {/* Webhook/Key input */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">رابط الـ Webhook الخاص بـ Zernio أو مفتاح الـ API</label>
                        <input
                          type="text"
                          placeholder="أدخل رابط Webhook أو مفتاح API"
                          value={zernioApiKey || zernioWebhookUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.startsWith("http")) {
                              setZernioWebhookUrl(val);
                              setZernioApiKey(val); // Use as API Key parameter as well for polymorphic schema
                              setZernioProfileId("WEBHOOK_MODE");
                            } else {
                              setZernioApiKey(val);
                              setZernioWebhookUrl("");
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          required
                        />
                      </div>

                      {zernioApiKey && !zernioApiKey.startsWith("http") && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">معرف حساب النشر في Zernio (Profile ID)</label>
                          <input
                            type="text"
                            placeholder="أدخل معرف حساب Zernio (مثال: default)"
                            value={zernioProfileId}
                            onChange={(e) => setZernioProfileId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-left font-sans"
                            style={{ direction: "ltr" }}
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">الحد الأقصى للفيديوهات المنشورة يومياً</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxVideosPerDay}
                  onChange={(e) => setMaxVideosPerDay(parseInt(e.target.value) || 3)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">تحديد عدد معين لتفادي الحظر من المنصات بسبب كثرة النشر.</p>
              </div>

              {/* Processing Strategy & Copyright Bypass Options */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3 text-right">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <h5 className="text-xs font-bold text-indigo-950">استراتيجية ومعالجة الفيديو قبل الرفع إلى Cloudinary:</h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setProcessingMode("bypass")}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      processingMode === "bypass"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span>🛡️</span>
                        <span>فلاتر تفادي الكوبيرايت وحظر الأمان</span>
                      </span>
                      <input
                        type="radio"
                        name="procMode"
                        checked={processingMode === "bypass"}
                        onChange={() => setProcessingMode("bypass")}
                        className="accent-indigo-500 pointer-events-none"
                      />
                    </div>
                    <p className={`text-[10px] leading-relaxed ${processingMode === "bypass" ? "text-indigo-100" : "text-slate-500"}`}>
                      معالجة وتعديل معالم الفيديو (انعكاس، تسريع، نبرة الصوت، الألوان وشعارك) لتجاوز خوارزميات الاكتشاف.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProcessingMode("raw")}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      processingMode === "raw"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span>🚀</span>
                        <span>رفع الفيديو خام مباشرة (Raw Upload)</span>
                      </span>
                      <input
                        type="radio"
                        name="procMode"
                        checked={processingMode === "raw"}
                        onChange={() => setProcessingMode("raw")}
                        className="accent-emerald-500 pointer-events-none"
                      />
                    </div>
                    <p className={`text-[10px] leading-relaxed ${processingMode === "raw" ? "text-emerald-100" : "text-slate-500"}`}>
                      رفع الفيديو الأصلي بدقته وجودته الكاملة فوراً إلى Cloudinary بدون معالجة FFmpeg (أسرع وأدق).
                    </p>
                  </button>
                </div>

                {processingMode === "bypass" ? (
                  <div className="bg-white/90 rounded-xl p-3 border border-indigo-100/80 space-y-2 text-right text-xs">
                    <span className="text-[10px] font-bold text-indigo-900 block mb-1">حدد الفلاتر المراد تطبيقها تلقائياً:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hflip}
                          onChange={(e) => setHflip(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>انعكاس أفقي للفيديو (Mirror)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={speedUp}
                          onChange={(e) => setSpeedUp(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>تسريع خفيف للفيديو (1.05x)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pitchShift}
                          onChange={(e) => setPitchShift(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>تعديل نبرة الصوت</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={colorBoost}
                          onChange={(e) => setColorBoost(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>تعديل تباين وسطوع الألوان</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-2.5 flex items-center gap-2 text-emerald-800 text-xs">
                    <span className="text-base">✨</span>
                    <span className="text-[11px] font-semibold">
                      خيار مميز للسرعة! سيتم رفع الفيديو خام فوراً بدقته الأصلية إلى Cloudinary بدون إعادة ترميز.
                    </span>
                  </div>
                )}

                {/* Logo / Watermark Overlay */}
                <div className="border-t border-indigo-100/80 pt-3 space-y-2 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">إضافة شعار قناتك كعلامة مائية تلقائية</span>
                    <label className="flex items-center gap-2 text-xs font-bold text-indigo-950 cursor-pointer">
                      <span>إضافة لوغو / شعار القناة 🖼️</span>
                      <input
                        type="checkbox"
                        checked={enableLogo}
                        onChange={(e) => setEnableLogo(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                    </label>
                  </div>

                  {enableLogo && (
                    <div className="bg-white rounded-xl p-3 border border-indigo-100 shadow-2xs space-y-3 text-right text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">رابط الشعار أو رفعه من جهازك (PNG)</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="رابط اللوغو (https://...)"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                            style={{ direction: "ltr" }}
                          />
                          <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0">
                            <span>رفع صورة</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {logoUrl && (
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <img src={logoUrl} alt="Logo preview" className="w-8 h-8 object-contain rounded bg-slate-200/50 p-0.5" />
                          <span className="text-[10px] text-emerald-600 font-bold">✓ تم إدراج الشعار</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">زاوية وضع الشعار</label>
                          <select
                            value={logoPosition}
                            onChange={(e) => setLogoPosition(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="top_right">↗️ أعلى اليمين (Top Right)</option>
                            <option value="top_left">↖️ أعلى اليسار (Top Left)</option>
                            <option value="bottom_right">↘️ أسفل اليمين (Bottom Right)</option>
                            <option value="bottom_left">↙️ أسفل اليسار (Bottom Left)</option>
                            <option value="center">🎯 المنتصف (Center)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">حجم الشعار</label>
                          <select
                            value={logoSize}
                            onChange={(e) => setLogoSize(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                          >
                            <option value="small">صغير (120px)</option>
                            <option value="medium">متوسط (180px)</option>
                            <option value="large">كبير (260px)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* MoviePy Caption Template Option */}
                <div className="border-t border-slate-200/60 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">كتابة كابشن عربي مدمج عبر MoviePy</span>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <span>إضافة كابشن على الفيديو ✍️</span>
                      <input
                        type="checkbox"
                        checked={enableCaption}
                        onChange={(e) => setEnableCaption(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  {enableCaption && (
                    <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 space-y-3 text-right text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">اختر قالب الكابشن المجهز مسبقاً</label>
                        <select
                          value={selectedCaptionTemplateId}
                          onChange={(e) => setSelectedCaptionTemplateId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                        >
                          {captionTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.font_family} - {t.font_size}pt - {t.position === "bottom" ? "أسفل" : t.position === "top" ? "أعلى" : "المنتصف"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          مصدر نص الكابشن في الفيديوهات المسحوبة تلقائياً:
                        </label>
                        <div className="grid grid-cols-1 gap-1.5 bg-white p-2 rounded-xl border border-indigo-100">
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                            <input
                              type="radio"
                              name="hubTrackerCaptionTextSource"
                              value="title"
                              checked={captionTextSource === "title"}
                              onChange={() => setCaptionTextSource("title")}
                              className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>🎬 عنوان الفيديو المكتشف (Dynamic Video Title)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                            <input
                              type="radio"
                              name="hubTrackerCaptionTextSource"
                              value="template"
                              checked={captionTextSource === "template"}
                              onChange={() => setCaptionTextSource("template")}
                              className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>📝 الكابشن الافتراضي المسجل في القالب (Template Text)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                            <input
                              type="radio"
                              name="hubTrackerCaptionTextSource"
                              value="custom"
                              checked={captionTextSource === "custom"}
                              onChange={() => setCaptionTextSource("custom")}
                              className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>✍️ كابشن مخصص ثابت لجميع فيديوهات هذه القناة</span>
                          </label>
                        </div>

                        {captionTextSource === "custom" && (
                          <div className="pt-1">
                            <input
                              type="text"
                              value={captionCustomText}
                              onChange={(e) => setCaptionCustomText(e.target.value)}
                              placeholder="اكتب نص الكابشن المخصص هنا..."
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] text-indigo-600 font-medium">
                        {captionTextSource === "title"
                          ? "💡 سيتم أخذ عنوان كل فيديو جديد تلقائياً وكتابته ككابشن مدمج على المقطع قبل الرفع."
                          : captionTextSource === "template"
                          ? "💡 سيتم استخدام الكابشن الافتراضي المسجل في القالب المختار."
                          : "💡 سيتم استخدام الكابشن المخصص الثابت أعلاه على جميع الفيديوهات المسحوبة تلقائياً."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Automation Hashtags Settings */}
                <div className="border-t border-slate-200/60 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">قائمة الهاشتاغات للوضع التلقائي (Automation Hashtags)</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">استراتيجية إضافة الهاشتاغات عند النشر التلقائي:</label>
                      <select
                        value={hashtagOption}
                        onChange={(e) => setHashtagOption(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="custom_or_default">✨ استخدام المخصصة (وإذا كانت فارغة تُستخدم الافتراضية #fyp #viral)</option>
                        <option value="custom_only">🎯 استخدام الهاشتاغات المخصصة فقط</option>
                        <option value="append">➕ دمج المخصصة مع الافتراضية (#fyp #viral + المخصصة)</option>
                        <option value="none">🚫 عدم إضافة أي هاشتاغ (عنوان الفيديو فقط)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">الهاشتاغات المخصصة (افصل بينها بمسافة أو #):</label>
                      <input
                        type="text"
                        value={customHashtags}
                        onChange={(e) => setCustomHashtags(e.target.value)}
                        placeholder="#fyp #viral #explore #ترند #فيديو #reels"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-mono font-medium text-slate-800 placeholder-slate-400"
                      />
                    </div>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[9px] font-bold text-slate-400">قوالب جاهزة:</span>
                      <button
                        type="button"
                        onClick={() => setCustomHashtags("#fyp #viral #trending #reels #explore")}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-indigo-100"
                      >
                        ⚡ ترند عالمي
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomHashtags("#ترند #فيديو #اكسبلور #تيك_توك #ريلز")}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-emerald-100"
                      >
                        🇸🇦 ترند عربي
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomHashtags("#gaming #gamer #shorts #gameplay")}
                        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-purple-100"
                      >
                        🎮 ألعاب وجيمنج
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomHashtags("#tech #ai #software #innovations")}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-blue-100"
                      >
                        💡 تقنية وذكاء اصطناعي
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveGlobalAutomationDefaults}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🗄️ حفظ هذه الخيارات كافتراضية لقاعدة البيانات (PostgreSQL)</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري تفعيل الأتمتة...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>تشغيل تتبع ومزامنة تلقائية 🚀</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Automatic Automation Agent Control Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-500/20 p-5 text-white space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                agentActive 
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300" 
                  : "bg-slate-500/20 border-slate-400/30 text-slate-300"
              }`}>
                {agentActive ? "العامل نشط ومتصل 🟢" : "العامل معطل حالياً ⚪"}
              </span>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold">عامل الأتمتة والـ Workflow الذكي</h4>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-2.5 text-[10px] text-indigo-200 flex items-center justify-between">
              <span className="font-bold">🗄️ حفظ تلقائي ومستمر:</span>
              <span>جميع إعدادات الأتمتة تُحفظ مباشرة في قاعدة البيانات PostgreSQL</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-normal">
              يقوم هذا الوكيل البرمجي بالتحقق آلياً من القنوات النشطة في الخلفية دون الحاجة لإبقاء نافذة المتصفح مفتوحة، ويعيد نشر أي محتوى جديد يكتشفه فوراً مع تطبيق تعديلات حظر الكوبيرايت.
            </p>

            <div className="border-t border-slate-800 pt-3 space-y-3">
              {/* Agent Settings Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-800 px-2 py-1 rounded-xl">
                  <select
                    value={agentInterval}
                    onChange={(e) => handleIntervalChange(Number(e.target.value))}
                    className="bg-transparent text-[11px] font-bold text-indigo-200 focus:outline-none cursor-pointer"
                    style={{ direction: "rtl" }}
                  >
                    <option value={1} className="text-slate-900">كل دقيقة واحدة</option>
                    <option value={3} className="text-slate-900">كل 3 دقائق</option>
                    <option value={5} className="text-slate-900">كل 5 دقائق</option>
                    <option value={10} className="text-slate-900">كل 10 دقائق</option>
                    <option value={15} className="text-slate-900">كل 15 دقيقة</option>
                    <option value={30} className="text-slate-900">كل 30 دقيقة</option>
                    <option value={60} className="text-slate-900">كل ساعة واحدة</option>
                  </select>
                  <label className="text-[10px] text-slate-400">فترة التحقق الدورية:</label>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAgent(!agentActive)}
                  disabled={loadingAgent}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                    agentActive 
                      ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30" 
                      : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {agentActive ? "تعطيل الوكيل" : "تفعيل الوكيل التلقائي"}
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-3">
                <div className="flex items-center gap-1">
                  <span>حالة الفحص الفوري:</span>
                  <span className={`font-bold ${
                    agentStatus === "running" ? "text-amber-400 animate-pulse" : "text-slate-300"
                  }`}>
                    {agentStatus === "running" ? "جاري الفحص الآن..." : "مستقر ومستعد"}
                  </span>
                </div>
                {agentLastRun && (
                  <div>
                    <span>آخر فحص: </span>
                    <span className="font-mono text-slate-300">{new Date(agentLastRun).toLocaleTimeString("ar-SA-u-nu-latn")}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunAgentNow}
                disabled={runningAgentNow || agentStatus === "running"}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                {runningAgentNow || agentStatus === "running" ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>جاري تشغيل الفحص الآلي بالخلفية...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-200" />
                    <span>تشغيل دورة الفحص يدوياً الآن ⚡</span>
                  </>
                )}
              </button>

              {/* Real-time Agent Logs terminal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                  <button 
                    onClick={fetchAgentStatus} 
                    type="button"
                    className="hover:text-indigo-400 text-[9px] underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>تحديث السجلات</span>
                  </button>
                  <span>أحدث سجلات تشغيل الوكيل:</span>
                </div>
                <div className="h-[120px] bg-black/40 border border-slate-800 rounded-xl p-2.5 font-mono text-[9px] text-slate-300 overflow-y-auto space-y-1 text-right" style={{ direction: "rtl" }}>
                  {agentLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">لا توجد سجلات تشغيل حالية.</div>
                  ) : (
                    agentLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed border-b border-slate-900 pb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LEFT PANEL: Tracked Channels list & Sync logs */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Active channels container */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-800">قائمة القنوات تحت التتبع التلقائي</h4>

            {loadingChannels ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 mt-2">جاري جلب القنوات المربوطة...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <Tv className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">لا توجد قنوات تحت التتبع حالياً.</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                  استخدم النموذج الجانبي لإضافة قناة وبدء مزامنتها ونشر فيديوهاتها بشكل آلي وتجنب الكوبيرايت.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {channels.map((chan, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 space-y-3.5 bg-slate-50/50 hover:bg-slate-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(chan)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          title="تعديل جميع إعدادات الأتمتة والقناة"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-600" />
                          <span>تعديل الأتمتة</span>
                        </button>
                        <button
                          onClick={() => handleTriggerSync(idx)}
                          disabled={syncingIdx !== null || chan.is_paused}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingIdx === idx ? "animate-spin" : ""}`} />
                          <span>تحقق ومزامنة الآن</span>
                        </button>
                        <button
                          onClick={() => handleTogglePause(idx)}
                          className={`px-2.5 py-1.5 font-bold text-[10px] rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                            chan.is_paused
                              ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                          }`}
                          title={chan.is_paused ? "تفعيل النشر التلقائي" : "تعليق النشر التلقائي"}
                        >
                          {chan.is_paused ? (
                            <>
                              <Play className="w-3 h-3" />
                              <span>تفعيل النشر</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3" />
                              <span>تعليق النشر</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => chan.id && handleDeleteChannel(chan.id, chan.channel_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-lg transition-all"
                          title="حذف القناة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <h5 className="text-xs font-bold text-slate-800">{chan.channel_name}</h5>
                          <div className="flex items-center gap-1.5 justify-end pt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono" style={{ direction: "ltr" }}>{chan.channel_handle}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              chan.is_paused ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {chan.is_paused ? "معلق" : "نشط"}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              chan.is_paused ? "bg-amber-400" : "bg-emerald-500 rounded-full animate-pulse"
                            }`} title={chan.is_paused ? "النشر التلقائي معلق" : "نشط ومتصل"}></span>
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-sans">
                          YT
                        </div>
                      </div>
                    </div>

                    {/* Auto post destination detail */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-bold">طريقة معالجة الفيديو:</span>
                        <div className="flex gap-1.5 flex-wrap pt-1">
                          {(chan.bypass_settings?.processingMode === "raw" || chan.bypass_settings?.rawUpload) ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <span>🚀</span>
                              <span>رفع فيديو خام مباشر</span>
                            </span>
                          ) : (
                            <>
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[9px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <span>🛡️</span>
                                <span>فلاتر أمان</span>
                              </span>
                              {chan.bypass_settings?.hflip && <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 py-0.5 rounded-md font-bold">انعكاس</span>}
                              {chan.bypass_settings?.speedUp && <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 py-0.5 rounded-md font-bold">تسريع</span>}
                              {chan.bypass_settings?.colorBoost && <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 py-0.5 rounded-md font-bold">ألوان</span>}
                              {chan.bypass_settings?.enableLogo && <span className="bg-slate-100 text-slate-700 text-[8px] px-1.5 py-0.5 rounded-md font-bold">لوغو</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] font-bold">
                          {chan.platform === "zernio" ? "حساب النشر في Zernio ⚡" : "حساب النشر في Buffer 🌐"}
                        </span>
                        <span className="font-bold text-slate-700 font-mono text-[10px]" style={{ direction: "ltr" }}>
                          {chan.platform === "zernio" ? (chan.zernio_profile_id || "WEBHOOK_MODE") : chan.buffer_profile_id}
                        </span>
                      </div>
                    </div>

                    {/* Target Content Type & Proxy controls */}
                    <div className="border-t border-slate-200/60 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] font-bold mb-1">المحتوى المستهدف للتتبع:</span>
                        <select
                          value={chan.bypass_settings?.targetContentType || "both"}
                          onChange={async (e) => {
                            const newTarget = e.target.value as "both" | "videos" | "shorts";
                            try {
                              const updatedBypass = {
                                ...chan.bypass_settings,
                                targetContentType: newTarget
                              };
                              const { error } = await supabase
                                .from("tracked_channels")
                                .update({ bypass_settings: updatedBypass })
                                .eq("id", chan.id);
                              if (error) throw error;
                              
                              const updatedChannels = [...channels];
                              updatedChannels[idx] = {
                                ...chan,
                                bypass_settings: updatedBypass
                              };
                              setChannels(updatedChannels);
                              setSuccessMsg(`تم تحديث نوع المحتوى المستهدف لقناة "${chan.channel_name}" بنجاح.`);
                            } catch (err: any) {
                              setErrorMsg(`فشل تحديث نوع المحتوى: ${err.message}`);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-[10px] font-bold text-slate-800"
                        >
                          <option value="both">🎥 + ⚡ كلاهما (فيديوهات و Shorts)</option>
                          <option value="videos">🎥 الفيديوهات الطويلة فقط</option>
                          <option value="shorts">⚡ مقاطع Shorts القصيرة فقط</option>
                        </select>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] font-bold mb-1">البروكسي المخصص لهذه القناة:</span>
                        <select
                          value={chan.bypass_settings?.proxy || ""}
                          onChange={async (e) => {
                            const newProxy = e.target.value;
                            try {
                              const updatedBypass = {
                                ...chan.bypass_settings,
                                proxy: newProxy
                              };
                              const { error } = await supabase
                                .from("tracked_channels")
                                .update({ bypass_settings: updatedBypass })
                                .eq("id", chan.id);
                              if (error) throw error;
                              
                              // Update local state
                              const updatedChannels = [...channels];
                              updatedChannels[idx] = {
                                ...chan,
                                bypass_settings: updatedBypass
                              };
                              setChannels(updatedChannels);
                              setSuccessMsg(`تم تحديث البروكسي المخصص لقناة "${chan.channel_name}" بنجاح.`);
                            } catch (err: any) {
                              setErrorMsg(`فشل تحديث البروكسي: ${err.message}`);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-[10px] font-semibold font-mono"
                          style={{ direction: "ltr" }}
                        >
                          <option value="" className="font-sans">-- البروكسي الافتراضي للنظام --</option>
                          {availableProxies.map((p, pidx) => (
                            <option key={pidx} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Channel Specific Custom Hashtags */}
                    <div className="border-t border-slate-200/60 pt-2">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[9px] font-bold mb-1">الهاشتاغات المخصصة لهذه القناة (تتجاوز العامة):</span>
                        <input
                          type="text"
                          value={(chan.bypass_settings as any)?.custom_hashtags || ""}
                          onChange={(e) => {
                            const newHashtags = e.target.value;
                            const updatedBypass = {
                              ...chan.bypass_settings,
                              custom_hashtags: newHashtags
                            };
                            const updatedChannels = [...channels];
                            updatedChannels[idx] = {
                              ...chan,
                              bypass_settings: updatedBypass
                            };
                            setChannels(updatedChannels);
                          }}
                          onBlur={async () => {
                            try {
                              const { error } = await supabase
                                .from("tracked_channels")
                                .update({ bypass_settings: chan.bypass_settings })
                                .eq("id", chan.id);
                              if (error) throw error;
                              setSuccessMsg(`تم تحديث الهاشتاغات المخصصة لقناة "${chan.channel_name}" بنجاح.`);
                            } catch (err: any) {
                              setErrorMsg(`فشل حفظ الهاشتاغات للقناة: ${err.message}`);
                            }
                          }}
                          placeholder="مثال: #fyp #viral #تراكس (اتركه فارغاً للاستعانة بالهاشتاغات العامة)"
                          className="w-full px-2.5 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-[10px] font-mono font-medium text-slate-800 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Progressive live tracking console inside selected item */}
                    {syncingIdx === idx && (
                      <div className="border border-slate-800 rounded-xl p-3 bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1.5 text-right mt-3 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <span className="text-indigo-400 animate-pulse font-sans font-bold">مزامنة تتبع نشطة...</span>
                          <span className="text-[9px] text-slate-500 font-sans">Live Tracker Output</span>
                        </div>
                        {syncLogs.map((log, lidx) => (
                          <div key={lidx} className="flex gap-1.5 items-start">
                            <span className="text-slate-500 shrink-0">[{lidx + 1}]</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Automation logs */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                onClick={fetchLogs}
                className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                title="تحديث السجلات"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <h4 className="text-sm font-bold text-slate-800">سجل الأتمتة والنشر التلقائي</h4>
            </div>

            {loadingLogs ? (
              <div className="text-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">لا توجد سجلات أتمتة مسجلة بعد.</p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-3 border-b border-slate-50 pb-2.5 text-right">
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 shrink-0">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString("ar-SA-u-nu-latn") : ""}
                    </span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                          log.status === "success" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : log.status === "warning" 
                            ? "bg-amber-50 text-amber-700" 
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {log.status === "success" ? "مكتمل" : log.status === "warning" ? "تنبيه" : "فشل"}
                        </span>
                        <h5 className="text-[11px] font-bold text-slate-700 truncate">
                          {log.channel_name} | <span className="text-indigo-600">{log.video_title}</span>
                        </h5>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modal for Editing Channel Automation */}
      {editModalOpen && editingChannel && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 text-right space-y-0" dir="rtl">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">تعديل إعدادات الأتمتة لقناة: {editingChannel.channel_name}</h3>
                  <p className="text-[11px] text-slate-400">قم بتعديل كافة تفاصيل التتبع، المنصة المربوطة، فلاتر الكوبيرايت والحد اليومي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingChannel(null);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveEditedChannel} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Section 1: Basic Channel Details */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-indigo-600" />
                  <span>بيانات القناة الأساسية</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">اسم القناة</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">معرف القناة (Handle)</label>
                    <input
                      type="text"
                      value={editHandle}
                      onChange={(e) => setEditHandle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                      style={{ direction: "ltr" }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">رابط القناة (Channel URL)</label>
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                    style={{ direction: "ltr" }}
                    required
                  />
                </div>
              </div>

              {/* Section 2: Publishing Platform */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>منصة النشر المربوطة بالأتمتة</span>
                </h4>

                <div className="grid grid-cols-2 gap-2 bg-slate-200/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditPlatform("buffer")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      editPlatform === "buffer"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buffer 🌐</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPlatform("zernio")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      editPlatform === "zernio"
                        ? "bg-white text-indigo-600 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Zernio ⚡</span>
                  </button>
                </div>

                {editPlatform === "buffer" ? (
                  <div className="space-y-3 pt-1">
                    {importedProfiles.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">اختر من حسابات Buffer المستوردة:</label>
                        <select
                          value={editBufferProfileId}
                          onChange={(e) => setEditBufferProfileId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                        >
                          <option value="">-- اختر حساب --</option>
                          {importedProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.formatted_service} ({p.service_username}) - {p.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">معرف حساب Buffer (Profile ID)</label>
                        <input
                          type="text"
                          value={editBufferProfileId}
                          onChange={(e) => setEditBufferProfileId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          placeholder="Buffer Profile ID"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">رمز وصول Buffer (AccessToken)</label>
                        <input
                          type="password"
                          value={editBufferAccessToken}
                          onChange={(e) => setEditBufferAccessToken(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          placeholder="Buffer Access Token"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {zernioProfiles.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">اختر من حسابات Zernio المستوردة:</label>
                        <select
                          value={editZernioProfileId}
                          onChange={(e) => setEditZernioProfileId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                        >
                          <option value="WEBHOOK_MODE">رابط Webhook تلقائي</option>
                          {zernioProfiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.formatted_service} ({p.service_username}) - {p.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">معرف حساب Zernio (Profile ID)</label>
                        <input
                          type="text"
                          value={editZernioProfileId}
                          onChange={(e) => setEditZernioProfileId(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          placeholder="WEBHOOK_MODE أو Profile ID"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">مفتاح API Key أو Webhook URL</label>
                        <input
                          type="text"
                          value={editZernioApiKey}
                          onChange={(e) => setEditZernioApiKey(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-left"
                          style={{ direction: "ltr" }}
                          placeholder="Zernio API Key or Webhook URL"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Target Content, Proxy & Limits */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>المحتوى المستهدف والبروكسي والحد اليومي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">نوع المقاطع المستهدفة</label>
                    <select
                      value={editTargetContentType}
                      onChange={(e) => setEditTargetContentType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="both">🎥 + ⚡ كلاهما (فيديوهات و Shorts)</option>
                      <option value="videos">🎥 الفيديوهات الطويلة فقط</option>
                      <option value="shorts">⚡ مقاطع Shorts القصيرة فقط</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">البروكسي المخصص</label>
                    <select
                      value={editProxy}
                      onChange={(e) => setEditProxy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      style={{ direction: "ltr" }}
                    >
                      <option value="" className="font-sans">-- البروكسي الافتراضي --</option>
                      {availableProxies.map((p, pidx) => (
                        <option key={pidx} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">الحد اليومي للنشر</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={editMaxVideosPerDay}
                      onChange={(e) => setEditMaxVideosPerDay(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Copyright Bypass Filters & Raw Mode */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 space-y-3 text-right">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>طريقة معالجة الفيديو لهذه القناة</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditProcessingMode("bypass")}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      editProcessingMode === "bypass"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                        : "bg-white text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span>🛡️</span>
                        <span>تطبيق فلاتر الكوبيرايت</span>
                      </span>
                      <input
                        type="radio"
                        name="editProcMode"
                        checked={editProcessingMode === "bypass"}
                        onChange={() => setEditProcessingMode("bypass")}
                        className="accent-indigo-500 pointer-events-none"
                      />
                    </div>
                    <p className={`text-[10px] leading-relaxed ${editProcessingMode === "bypass" ? "text-indigo-100" : "text-slate-500"}`}>
                      تطبيق فلاتر الأمان (انعكاس، تسريع، نبرة الصوت، ألوان) لتجاوز حقوق النشر.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditProcessingMode("raw")}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      editProcessingMode === "raw"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100"
                        : "bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <span>🚀</span>
                        <span>رفع الفيديو خام مباشرة</span>
                      </span>
                      <input
                        type="radio"
                        name="editProcMode"
                        checked={editProcessingMode === "raw"}
                        onChange={() => setEditProcessingMode("raw")}
                        className="accent-emerald-500 pointer-events-none"
                      />
                    </div>
                    <p className={`text-[10px] leading-relaxed ${editProcessingMode === "raw" ? "text-emerald-100" : "text-slate-500"}`}>
                      رفع الفيديو الأصلي كما هو فوراً دون معالجة أو تعديل لـ Cloudinary.
                    </p>
                  </button>
                </div>

                {editProcessingMode === "bypass" ? (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <input
                        type="checkbox"
                        checked={editHflip}
                        onChange={(e) => setEditHflip(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>انعكاس أفقي للفيديو (HFlip)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <input
                        type="checkbox"
                        checked={editSpeedUp}
                        onChange={(e) => setEditSpeedUp(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>تسريع خفيف للفيديو (1.05x)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <input
                        type="checkbox"
                        checked={editPitchShift}
                        onChange={(e) => setEditPitchShift(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>تعديل نبرة الصوت (Pitch Shift)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <input
                        type="checkbox"
                        checked={editColorBoost}
                        onChange={(e) => setEditColorBoost(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>تعديل تباين وسطوع الألوان</span>
                    </label>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-2.5 text-emerald-800 text-xs">
                    <span className="font-semibold">✨ تم تفعيل الرفع الخام: سيتم نشر مقاطع هذه القناة فوراً إلى Cloudinary بدقتها وجودتها الأصلية.</span>
                  </div>
                )}
              </div>

              {/* Section 5: Watermark Logo Overlay */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEnableLogo}
                      onChange={(e) => setEditEnableLogo(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>تفعيل الشعار / العلامة المائية للتجميع 🖼️</span>
                  </label>
                  <span className="text-[10px] text-slate-500">إدراج شعار شفاف على الفيديوهات المكتشفة</span>
                </div>

                {editEnableLogo && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">رابط الشعار أو رفعه من الجهاز</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={editLogoUrl}
                          onChange={(e) => setEditLogoUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                          style={{ direction: "ltr" }}
                        />
                        <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer shrink-0">
                          <span>رفع صورة</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {editLogoUrl && (
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <img src={editLogoUrl} alt="Edit Logo Preview" className="w-8 h-8 object-contain rounded bg-slate-200/50 p-0.5" />
                        <span className="text-[10px] text-emerald-600 font-bold">✓ الشعار جاهز للإدراج</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">موقع الشعار</label>
                        <select
                          value={editLogoPosition}
                          onChange={(e) => setEditLogoPosition(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        >
                          <option value="top_right">↗️ أعلى اليمين (Top Right)</option>
                          <option value="top_left">↖️ أعلى اليسار (Top Left)</option>
                          <option value="bottom_right">↘️ أسفل اليمين (Bottom Right)</option>
                          <option value="bottom_left">↙️ أسفل اليسار (Bottom Left)</option>
                          <option value="center">🎯 المنتصف (Center)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">حجم الشعار</label>
                        <select
                          value={editLogoSize}
                          onChange={(e) => setEditLogoSize(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        >
                          <option value="small">صغير (120px)</option>
                          <option value="medium">متوسط (180px)</option>
                          <option value="large">كبير (260px)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5.5: Caption Template (MoviePy) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editEnableCaption}
                      onChange={(e) => setEditEnableCaption(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>إضافة كابشن عربي مدمج عبر MoviePy ✍️</span>
                  </label>
                  <span className="text-[10px] text-slate-500">طباعة نص أنيق ومتحرك على الفيديو</span>
                </div>

                {editEnableCaption && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">اختر قالب الكابشن المجهز مسبقاً</label>
                      <select
                        value={editCaptionTemplateId}
                        onChange={(e) => setEditCaptionTemplateId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {captionTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.font_family} - {t.font_size}pt - {t.position === "bottom" ? "أسفل" : t.position === "top" ? "أعلى" : "المنتصف"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        مصدر نص الكابشن في الفيديوهات المسحوبة تلقائياً:
                      </label>
                      <div className="grid grid-cols-1 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                          <input
                            type="radio"
                            name="editModalCaptionTextSource"
                            value="title"
                            checked={editCaptionTextSource === "title"}
                            onChange={() => setEditCaptionTextSource("title")}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>🎬 عنوان الفيديو المكتشف (Dynamic Video Title)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                          <input
                            type="radio"
                            name="editModalCaptionTextSource"
                            value="template"
                            checked={editCaptionTextSource === "template"}
                            onChange={() => setEditCaptionTextSource("template")}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>📝 الكابشن الافتراضي المسجل في القالب (Template Text)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-white">
                          <input
                            type="radio"
                            name="editModalCaptionTextSource"
                            value="custom"
                            checked={editCaptionTextSource === "custom"}
                            onChange={() => setEditCaptionTextSource("custom")}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>✍️ كابشن مخصص ثابت لجميع فيديوهات هذه القناة</span>
                        </label>
                      </div>

                      {editCaptionTextSource === "custom" && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={editCaptionCustomText}
                            onChange={(e) => setEditCaptionCustomText(e.target.value)}
                            placeholder="اكتب نص الكابشن المخصص هنا..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-indigo-600 font-medium">
                      {editCaptionTextSource === "title"
                        ? "💡 سيتم أخذ عنوان كل فيديو جديد تلقائياً وكتابته ككابشن مدمج على المقطع قبل الرفع."
                        : editCaptionTextSource === "template"
                        ? "💡 سيتم استخدام الكابشن الافتراضي المسجل في القالب المختار."
                        : "💡 سيتم استخدام الكابشن المخصص الثابت أعلاه على جميع الفيديوهات المسحوبة تلقائياً."}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 6: Status Toggle */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">حالة النشر والتتبع التلقائي</span>
                  <span className="text-[10px] text-slate-500">يمكنك تعليق أو تفعيل النشر لهذه القناة في أي وقت</span>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsPaused(!editIsPaused)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    editIsPaused
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}
                >
                  {editIsPaused ? (
                    <>
                      <Pause className="w-4 h-4 text-amber-600" />
                      <span>معلق حالياً</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-600" />
                      <span>نشط وتلقائي 🟢</span>
                    </>
                  )}
                </button>
              </div>

              {editError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Form Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingChannel(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري حفظ التغييرات...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>حفظ إعدادات الأتمتة 💾</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
