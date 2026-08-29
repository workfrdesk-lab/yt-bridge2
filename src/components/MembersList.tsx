import React, { useState, useEffect } from "react";
import { 
  Users, UserCheck, UserX, Shield, ShieldAlert, Search, RefreshCw, 
  Trash2, CheckCircle2, Clock, AlertCircle, Sparkles, Filter
} from "lucide-react";

interface UserMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_approved: boolean;
  created_at: string;
}

interface MembersListProps {
  adminUserId: string;
}

export default function MembersList({ adminUserId }: MembersListProps) {
  const [members, setMembers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "admin">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!adminUserId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/members?user_id=${adminUserId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل جلب قائمة الأعضاء.");
      }
      setMembers(data.users || []);
    } catch (err: any) {
      console.error("[MembersList] Error loading members:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء تحميل بيانات الأعضاء.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [adminUserId]);

  const handleToggleApproval = async (targetUserId: string, currentApprovedStatus: boolean) => {
    setActionLoadingId(targetUserId);
    setActionSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/members/toggle-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          is_approved: !currentApprovedStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير حالة التفعيل.");

      setMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, is_approved: !currentApprovedStatus } : m))
      );
      
      const statusText = !currentApprovedStatus ? "تم منح صلاحية الدخول للعضو بنجاح 🟢" : "تم تمكين حظر الدخول للعضو 🔴";
      setActionSuccessMsg(statusText);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل تعديل حالة العضو.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setActionLoadingId(targetUserId);
    setActionSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/members/toggle-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_user_id: adminUserId,
          target_user_id: targetUserId,
          role: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير دور العضو.");

      setMembers((prev) =>
        prev.map((m) => (m.id === targetUserId ? { ...m, role: newRole, is_approved: newRole === "admin" ? true : m.is_approved } : m))
      );

      setActionSuccessMsg(newRole === "admin" ? "تمت ترقية العضو إلى مسؤول (Admin) 👑" : "تم تعديل الدور إلى مستخدم عادي 👤");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل تعديل الدور.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (!window.confirm(`هل أنت تأكد من رغبتك في حذف العضو (${targetEmail}) نهائياً من النظام؟`)) {
      return;
    }

    setActionLoadingId(targetUserId);
    setActionSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/members/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_user_id: adminUserId,
          target_user_id: targetUserId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف العضو.");

      setMembers((prev) => prev.filter((m) => m.id !== targetUserId));
      setActionSuccessMsg("تم حذف حساب العضو بنجاح.");
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل حذف العضو.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered list calculation
  const filteredMembers = members.filter((m) => {
    const matchesSearch = 
      (m.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === "pending") return !m.is_approved && m.role !== "admin";
    if (filterTab === "approved") return m.is_approved;
    if (filterTab === "admin") return m.role === "admin" || m.email?.toLowerCase() === "aamaanaah22@gmail.com";
    return true;
  });

  const totalCount = members.length;
  const pendingCount = members.filter((m) => !m.is_approved && m.role !== "admin" && m.email?.toLowerCase() !== "aamaanaah22@gmail.com").length;
  const approvedCount = members.filter((m) => m.is_approved || m.role === "admin").length;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-5 text-right animate-fade-in" id="admin-members-list-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={fetchMembers}
          disabled={loading}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث القائمة</span>
        </button>

        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 justify-end">
            <span>قائمة الأعضاء وإدارة الصلاحيات</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </h4>
          <p className="text-xs text-slate-500">
            تحكم في تفعيل حسابات المسجلين ومنحهم صلاحية استخدام المنصة.
          </p>
        </div>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="block text-xs text-slate-500 font-medium">إجمالي المسجلين</span>
          <span className="text-base font-bold text-slate-800">{totalCount}</span>
        </div>
        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 text-center">
          <span className="block text-xs text-emerald-700 font-medium">حسابات مفعلة</span>
          <span className="text-base font-bold text-emerald-800">{approvedCount}</span>
        </div>
        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100 text-center">
          <span className="block text-xs text-amber-700 font-medium">بانتظار الموافقة</span>
          <span className="text-base font-bold text-amber-800">{pendingCount}</span>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="بحث بالاسم أو البريد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold focus:outline-none"
          />
          <Search className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === "all" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            الكل ({totalCount})
          </button>
          <button
            onClick={() => setFilterTab("pending")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === "pending" ? "bg-amber-500 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />}
            <span>معلقة ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterTab("approved")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === "approved" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            المعتمدين
          </button>
          <button
            onClick={() => setFilterTab("admin")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === "admin" ? "bg-purple-600 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            المسؤولون
          </button>
        </div>
      </div>

      {/* Members Cards / Table List */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs font-bold space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
          <p>جاري تحميل قائمة الاعضاء...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">لا يوجد أعضاء يطابقون خيارات البحث.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMembers.map((member) => {
            const isAdmin = member.role === "admin" || member.email?.toLowerCase() === "aamaanaah22@gmail.com";
            const isApproved = member.is_approved || isAdmin;
            const isSelf = member.id === adminUserId || member.email?.toLowerCase() === "aamaanaah22@gmail.com";
            const isLoadingThis = actionLoadingId === member.id;

            return (
              <div
                key={member.id}
                className={`bg-white rounded-xl p-4 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !isApproved 
                    ? "border-amber-200 bg-amber-50/20" 
                    : isAdmin 
                    ? "border-indigo-100 shadow-2xs" 
                    : "border-slate-200"
                }`}
              >
                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-2 sm:order-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {!isSelf && (
                    <button
                      onClick={() => handleDeleteUser(member.id, member.email)}
                      disabled={isLoadingThis}
                      className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer shrink-0"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {!isSelf && (
                    <button
                      onClick={() => handleToggleRole(member.id, member.role)}
                      disabled={isLoadingThis}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{member.role === "admin" ? "تغيير لمستخدم" : "ترقية لمسؤول"}</span>
                    </button>
                  )}

                  {!isSelf && (
                    <button
                      onClick={() => handleToggleApproval(member.id, isApproved)}
                      disabled={isLoadingThis}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        isApproved
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>تعطيل الدخول</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>تفعيل الدخول ✓</span>
                        </>
                      )}
                    </button>
                  )}

                  {isSelf && (
                    <span className="text-[11px] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg font-bold border border-indigo-100">
                      حسابك الحالي
                    </span>
                  )}
                </div>

                {/* User Info Details */}
                <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto justify-end">
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {isAdmin ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <span>👑</span>
                          <span>مسؤول</span>
                        </span>
                      ) : isApproved ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <span>🟢</span>
                          <span>مفعل</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <span>⏳</span>
                          <span>بانتظار الموافقة</span>
                        </span>
                      )}

                      <h5 className="font-bold text-slate-800 text-sm">
                        {member.full_name || "بدون اسم"}
                      </h5>
                    </div>

                    <p className="text-xs text-slate-500 font-mono mt-0.5" dir="ltr">
                      {member.email}
                    </p>

                    {member.created_at && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
                        <span>تاريخ التسجيل: {new Date(member.created_at).toLocaleDateString("ar-EG")}</span>
                        <Clock className="w-3 h-3 text-slate-400" />
                      </p>
                    )}
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    isAdmin 
                      ? "bg-purple-100 text-purple-700 border border-purple-200" 
                      : isApproved 
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {(member.email || "U").charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
