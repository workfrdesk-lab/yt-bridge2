import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Trash2, HelpCircle, CheckCircle2, RefreshCw, X, ShieldAlert, Sparkles } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ReactNode;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      confirm: async (options: ConfirmOptions) => {
        return window.confirm(`${options.title}\n\n${options.message}`);
      }
    };
  }
  return context;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState) {
      confirmState.resolve(true);
      setConfirmState(null);
    }
  };

  const handleCancel = () => {
    if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    }
  };

  const variant = confirmState?.options.variant || "danger";

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-red-500/15 border-red-500/30 text-red-400 shadow-red-500/20",
          accentGlow: "from-red-600/20 to-rose-600/5",
          confirmBtn: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-950/50 border border-red-500/30",
          defaultIcon: <Trash2 className="w-6 h-6 text-red-400" />,
          titleColor: "text-red-200",
        };
      case "warning":
        return {
          iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/20",
          accentGlow: "from-amber-600/20 to-orange-600/5",
          confirmBtn: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-950/50 border border-amber-500/30",
          defaultIcon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          titleColor: "text-amber-200",
        };
      case "info":
        return {
          iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-purple-500/20",
          accentGlow: "from-purple-600/20 to-indigo-600/5",
          confirmBtn: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/50 border border-purple-500/30",
          defaultIcon: <HelpCircle className="w-6 h-6 text-purple-400" />,
          titleColor: "text-purple-200",
        };
      case "success":
        return {
          iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/20",
          accentGlow: "from-emerald-600/20 to-teal-600/5",
          confirmBtn: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/30",
          defaultIcon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
          titleColor: "text-emerald-200",
        };
    }
  };

  const currentStyles = getVariantStyles();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto" dir="rtl">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-10"
            >
              {/* Top Accent Gradient Line */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${currentStyles.accentGlow}`} />

              {/* Decorative background radial light */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${currentStyles.accentGlow} blur-2xl opacity-60 pointer-events-none`} />

              <div className="p-6 relative z-10">
                {/* Header with Icon and Close Button */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl border shadow-inner ${currentStyles.iconBg}`}>
                      {confirmState.options.icon || currentStyles.defaultIcon}
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${currentStyles.titleColor}`}>
                        {confirmState.options.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        تأكيد الإجراء المطلوب
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Message */}
                <div className="mt-4 py-2 px-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80">
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {confirmState.options.message}
                  </p>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all cursor-pointer hover:shadow-md"
                  >
                    {confirmState.options.cancelText || "إلغاء"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${currentStyles.confirmBtn}`}
                  >
                    {confirmState.options.confirmText || "نعم، تأكيد"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
