"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Shield, Trash2, Settings } from "lucide-react";
import { BaseModal } from "@/components/ui/base-modal";
import { Input } from "@/components/ui/input";
import {
  useMyIp,
  useOrgSettings,
  useUpdateIpRestriction,
  useAllowedIps,
  useAddAllowedIp,
  useRemoveAllowedIp,
  useDeleteAllAllowedIps,
} from "@/hooks/use-org-settings";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isValidIp(ip: string) {
  const v4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const v6 = /^[0-9a-fA-F:]+$/;
  return v4.test(ip) || (v6.test(ip) && ip.includes(":"));
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [ipError, setIpError] = useState<string | null>(null);

  const { data: settingsData, isLoading: isLoadingSettings } = useOrgSettings();
  const isEnabled = settingsData?.data?.isIpRestrictionEnabled ?? false;

  const { data: ipData, isLoading: isLoadingIps } = useAllowedIps(
    open && isEnabled,
  );
  const { data: myIpData } = useMyIp(open && isEnabled);
  const allowedIps = ipData?.data ?? [];

  const updateRestriction = useUpdateIpRestriction();
  const addIp = useAddAllowedIp();
  const removeIp = useRemoveAllowedIp();
  const deleteAllIps = useDeleteAllAllowedIps();

  function handleToggle() {
    if (!isEnabled) {
      setConfirmOpen(true);
    } else {
      updateRestriction.mutate(false);
    }
  }

  function handleConfirmEnable() {
    updateRestriction.mutate(true, {
      onSuccess: () => setConfirmOpen(false),
    });
  }

  function handleAddIp() {
    setIpError(null);
    const ip = newIp.trim();
    if (!ip) {
      setIpError("IP address is required");
      return;
    }
    if (!isValidIp(ip)) {
      setIpError("Enter a valid IPv4 or IPv6 address");
      return;
    }

    addIp.mutate(
      { ipAddress: ip, label: newLabel.trim() || undefined },
      {
        onSuccess: () => {
          setNewIp("");
          setNewLabel("");
          setShowAddForm(false);
          setIpError(null);
        },
        onError: () =>
          setIpError("This IP may already be added, or the request failed"),
      },
    );
  }

  function handleCancelAdd() {
    setShowAddForm(false);
    setNewIp("");
    setNewLabel("");
    setIpError(null);
  }

  return (
    <>
      <BaseModal
        open={open}
        onOpenChange={onOpenChange}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span>Settings</span>
          </div>
        }
        desc="Organization settings & security preferences"
        size="lg"
      >
        <div className="space-y-6">
          {/* Security section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[var(--accent)]" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Security
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/4">
              {/* IP restriction row */}
              <div className="flex items-start justify-between gap-4 p-4.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                    Enable IP Restriction
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    Only allow access from specific IP addresses. Users on
                    unallowed IPs will be blocked and logged out.
                  </p>
                </div>

                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={
                    isLoadingSettings || updateRestriction.isPending
                  }
                  onClick={handleToggle}
                  className={`relative mt-0.5 shrink-0 inline-flex h-6.5 w-12 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                    isEnabled
                      ? "bg-[var(--accent)]"
                      : "bg-slate-300 dark:bg-white/15"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      isEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Allowed IPs section — only when restriction is enabled */}
              {isEnabled && (
                <div className="border-t border-slate-200/80 dark:border-white/10 p-4.5 space-y-4 bg-white/60 dark:bg-black/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200">
                      Allowed IP Addresses
                      {allowedIps.length > 0 && (
                        <span className="ml-1.5 font-semibold text-slate-400 dark:text-slate-500">
                          ({allowedIps.length})
                        </span>
                      )}
                    </p>
                    {allowedIps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAllOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete All
                      </button>
                    )}
                  </div>

                  {/* No IPs warning */}
                  {!isLoadingIps &&
                    allowedIps.length === 0 &&
                    !showAddForm && (
                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500 dark:text-amber-400" />
                          <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                            No allowed IPs added yet. All users can still
                            access the system. Add an IP address to start
                            restricting access.
                          </p>
                        </div>
                        {myIpData?.ip && (
                          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-500/20 dark:bg-white/5">
                            <div className="min-w-0">
                              <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                                Your current IP (as seen by the server)
                              </p>
                              <p className="font-mono text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                                {myIpData.ip}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewIp(myIpData.ip);
                                setShowAddForm(true);
                              }}
                              className="shrink-0 rounded-xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 cursor-pointer"
                            >
                              Add this IP
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Add IP form */}
                  {showAddForm ? (
                    <div className="space-y-3 bg-slate-50 dark:bg-white/4 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
                      {myIpData?.ip && (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              Your current IP (as seen by the server)
                            </p>
                            <p className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-200">
                              {myIpData.ip}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewIp(myIpData.ip);
                              setIpError(null);
                            }}
                            className="shrink-0 rounded-xl border border-emerald-300 bg-emerald-100/80 px-3 py-1 text-[11px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                          >
                            Use this IP
                          </button>
                        </div>
                      )}
                      <Input
                        type="text"
                        value={newIp}
                        onChange={(e) => {
                          setNewIp(e.target.value);
                          setIpError(null);
                        }}
                        placeholder="IP address — e.g. 192.168.1.1"
                        autoFocus
                        className="font-mono text-xs"
                      />
                      <Input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Label (optional) — e.g. Office Wi-Fi"
                        className="text-xs"
                      />
                      {ipError && (
                        <p className="text-[12px] text-rose-500 font-medium">
                          {ipError}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddIp}
                          disabled={addIp.isPending || !newIp.trim()}
                          className="h-9 rounded-xl bg-[var(--accent)] px-4 text-xs font-semibold text-white transition-all hover:brightness-110 shadow-md shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                          {addIp.isPending ? "Saving..." : "Save IP"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelAdd}
                          className="h-9 rounded-xl border border-slate-200 bg-slate-100 px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex h-9 items-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-white/20 px-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] dark:hover:border-[var(--accent)] dark:hover:text-[var(--accent)] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add IP Address
                    </button>
                  )}

                  {/* IP list */}
                  {isLoadingIps ? (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500">
                      Loading...
                    </p>
                  ) : allowedIps.length > 0 ? (
                    <div className="space-y-2">
                      {allowedIps.map((ip) => (
                        <div
                          key={ip.uuid}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/4 px-3.5 py-2.5 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              {ip.ipAddress}
                            </p>
                            {ip.label && (
                              <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                {ip.label}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeIp.mutate(ip.uuid)}
                            disabled={removeIp.isPending}
                            aria-label={`Remove ${ip.ipAddress}`}
                            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </BaseModal>

      {/* Confirmation dialog — enable IP restriction */}
      <BaseModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Enable IP Restriction?"
        size="sm"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmEnable}
              disabled={updateRestriction.isPending}
              className="h-9 flex-1 rounded-xl bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-500/20 transition-colors hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              {updateRestriction.isPending ? "Enabling..." : "Enable"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="w-11 h-11 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
            This will restrict access to only the IP addresses you add. Any
            user on an unallowed IP will be blocked and logged out
            immediately. Make sure to add your own IP first.
          </p>
        </div>
      </BaseModal>

      {/* Confirmation dialog — delete all IPs */}
      <BaseModal
        open={confirmDeleteAllOpen}
        onOpenChange={setConfirmDeleteAllOpen}
        title="Delete All IP Addresses?"
        size="sm"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setConfirmDeleteAllOpen(false)}
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteAllIps.isPending}
              onClick={() =>
                deleteAllIps.mutate(undefined, {
                  onSuccess: () => setConfirmDeleteAllOpen(false),
                })
              }
              className="h-9 flex-1 rounded-xl bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-500/20 transition-colors hover:bg-red-400 disabled:opacity-50 cursor-pointer"
            >
              {deleteAllIps.isPending ? "Deleting..." : "Delete All"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="w-11 h-11 rounded-2xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
            This will remove all {allowedIps.length} allowed IP
            {allowedIps.length !== 1 ? "s" : ""}. All users will be able to
            access the system from any IP until you add new ones.
          </p>
        </div>
      </BaseModal>
    </>
  );
}
