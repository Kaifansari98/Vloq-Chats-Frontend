"use client"

import { useState } from "react"
import { Dialog } from "radix-ui"
import { AlertTriangle, Plus, Shield, Trash2, X } from "lucide-react"
import {
  useMyIp,
  useOrgSettings,
  useUpdateIpRestriction,
  useAllowedIps,
  useAddAllowedIp,
  useRemoveAllowedIp,
} from "@/hooks/use-org-settings"

type SettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OVERLAY =
  "fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"

const CONTENT =
  "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 " +
  "rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10 " +
  "dark:border-white/9 dark:bg-[#0e1c32] dark:shadow-black/60 " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"

function isValidIp(ip: string) {
  const v4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const v6 = /^[0-9a-fA-F:]+$/
  return v4.test(ip) || (v6.test(ip) && ip.includes(":"))
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIp, setNewIp] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [ipError, setIpError] = useState<string | null>(null)

  const { data: settingsData, isLoading: isLoadingSettings } = useOrgSettings()
  const isEnabled = settingsData?.data?.isIpRestrictionEnabled ?? false

  const { data: ipData, isLoading: isLoadingIps } = useAllowedIps(open && isEnabled)
  const { data: myIpData } = useMyIp(open && isEnabled)
  const allowedIps = ipData?.data ?? []

  const updateRestriction = useUpdateIpRestriction()
  const addIp = useAddAllowedIp()
  const removeIp = useRemoveAllowedIp()

  function handleToggle() {
    if (!isEnabled) {
      setConfirmOpen(true)
    } else {
      updateRestriction.mutate(false)
    }
  }

  function handleConfirmEnable() {
    updateRestriction.mutate(true, {
      onSuccess: () => setConfirmOpen(false),
    })
  }

  function handleAddIp() {
    setIpError(null)
    const ip = newIp.trim()
    if (!ip) { setIpError("IP address is required"); return }
    if (!isValidIp(ip)) { setIpError("Enter a valid IPv4 or IPv6 address"); return }

    addIp.mutate(
      { ipAddress: ip, label: newLabel.trim() || undefined },
      {
        onSuccess: () => {
          setNewIp("")
          setNewLabel("")
          setShowAddForm(false)
          setIpError(null)
        },
        onError: () => setIpError("This IP may already be added, or the request failed"),
      },
    )
  }

  function handleCancelAdd() {
    setShowAddForm(false)
    setNewIp("")
    setNewLabel("")
    setIpError(null)
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className={OVERLAY} />
          <Dialog.Content className={CONTENT}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/8">
              <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
                Settings
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-400 dark:hover:bg-white/8">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Organization settings</Dialog.Description>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">

              {/* Security section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Security
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/8 overflow-hidden">

                  {/* IP restriction row */}
                  <div className="flex items-start justify-between gap-4 px-4 py-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
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
                      disabled={isLoadingSettings || updateRestriction.isPending}
                      onClick={handleToggle}
                      className={`relative mt-0.5 shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isEnabled
                          ? "bg-blue-500"
                          : "bg-slate-200 dark:bg-white/12"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Allowed IPs section — only when restriction is enabled */}
                  {isEnabled && (
                    <div className="border-t border-slate-200 dark:border-white/8 px-4 py-4 space-y-3">

                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                        Allowed IP Addresses
                        {allowedIps.length > 0 && (
                          <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
                            ({allowedIps.length})
                          </span>
                        )}
                      </p>

                      {/* No IPs warning */}
                      {!isLoadingIps && allowedIps.length === 0 && !showAddForm && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                            <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-300">
                              No allowed IPs added yet. All users can still
                              access the system. Add an IP address to start
                              restricting access.
                            </p>
                          </div>
                          {myIpData?.ip && (
                            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/60 px-3 py-2 dark:border-amber-500/20 dark:bg-white/4">
                              <div className="min-w-0">
                                <p className="text-[11px] text-amber-600 dark:text-amber-400/70">Your current IP (as seen by the server)</p>
                                <p className="font-mono text-[12px] font-medium text-slate-700 dark:text-slate-200">{myIpData.ip}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setNewIp(myIpData.ip); setShowAddForm(true) }}
                                className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                              >
                                Add this IP
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add IP form */}
                      {showAddForm ? (
                        <div className="space-y-2">
                          {myIpData?.ip && (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/8 dark:bg-white/4">
                              <div className="min-w-0">
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">Your current IP (as seen by the server)</p>
                                <p className="font-mono text-[12px] font-medium text-slate-700 dark:text-slate-200">{myIpData.ip}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setNewIp(myIpData.ip); setIpError(null) }}
                                className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                              >
                                Use this IP
                              </button>
                            </div>
                          )}
                          <input
                            type="text"
                            value={newIp}
                            onChange={(e) => { setNewIp(e.target.value); setIpError(null) }}
                            placeholder="IP address — e.g. 192.168.1.1"
                            autoFocus
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-mono text-[13px] text-slate-800 outline-none transition-colors placeholder:font-sans focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                          />
                          <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Label (optional) — e.g. Office Wi-Fi"
                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                          />
                          {ipError && (
                            <p className="text-[12px] text-rose-500">{ipError}</p>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={handleAddIp}
                              disabled={addIp.isPending || !newIp.trim()}
                              className="h-8 rounded-xl bg-blue-500 px-4 text-[12px] font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {addIp.isPending ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelAdd}
                              className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddForm(true)}
                          className="flex h-8 items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 text-[12px] font-medium text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-white/15 dark:text-slate-400 dark:hover:border-blue-500/50 dark:hover:text-blue-400"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add IP Address
                        </button>
                      )}

                      {/* IP list */}
                      {isLoadingIps ? (
                        <p className="text-[12px] text-slate-400 dark:text-slate-500">
                          Loading...
                        </p>
                      ) : allowedIps.length > 0 ? (
                        <div className="space-y-1.5">
                          {allowedIps.map((ip) => (
                            <div
                              key={ip.uuid}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/8 dark:bg-white/4"
                            >
                              <div className="min-w-0">
                                <p className="font-mono text-[13px] font-medium text-slate-800 dark:text-slate-100">
                                  {ip.ipAddress}
                                </p>
                                {ip.label && (
                                  <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                                    {ip.label}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeIp.mutate(ip.uuid)}
                                disabled={removeIp.isPending}
                                aria-label={`Remove ${ip.ipAddress}`}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Confirmation dialog — enable IP restriction */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={OVERLAY.replace("z-50", "z-60")} />
          <Dialog.Content className={CONTENT.replace("z-50", "z-60").replace("max-w-lg", "max-w-sm") + " p-6"}>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
              <Shield className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            </div>

            <Dialog.Title className="mb-1.5 text-base font-semibold text-slate-900 dark:text-white">
              Enable IP Restriction?
            </Dialog.Title>
            <Dialog.Description className="mb-6 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
              This will restrict access to only the IP addresses you add. Any
              user on an unallowed IP will be blocked and logged out
              immediately. Make sure to add your own IP first.
            </Dialog.Description>

            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleConfirmEnable}
                disabled={updateRestriction.isPending}
                className="h-9 flex-1 rounded-xl bg-amber-500 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                {updateRestriction.isPending ? "Enabling..." : "Enable"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
