"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Check, Search, Users, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { useOrganizationMembers, type Member } from "@/hooks/use-organization-members"
import { useCreateGroupChat } from "@/hooks/use-group-chats"
import { useAuth } from "@/hooks/use-auth"

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-orange-500 to-red-600",
]

function memberGradient(id: number) {
  return GRADIENTS[id % GRADIENTS.length]
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MemberAvatar({ member, size = "md" }: { member: Member; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-9 h-9 text-[10px]" : "w-11 h-11 text-[11px]"
  if (member.profile_pic_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.profile_pic_url}
        alt={member.name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div
      className={`${dim} rounded-full bg-linear-to-br ${memberGradient(member.id)} flex items-center justify-center font-semibold text-white shrink-0`}
    >
      {memberInitials(member.name)}
    </div>
  )
}

// ─── Step 1: Select members ───────────────────────────────────────────────────

function SelectMembersStep({
  selectedIds,
  onToggle,
  onNext,
  onClose,
  currentUserUuid,
}: {
  selectedIds: Set<number>
  onToggle: (member: Member) => void
  onNext: () => void
  onClose: () => void
  currentUserUuid?: string
}) {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useOrganizationMembers(1, search, 200)

  const members = useMemo(() => {
    const all = (data?.data ?? []).filter((m) => m.uuid !== currentUserUuid)
    return [...all].sort((a, b) => a.name.localeCompare(b.name))
  }, [data, currentUserUuid])

  const selectedMembers = members.filter((m) => selectedIds.has(m.id))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/8 transition-colors text-slate-500 dark:text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white leading-none">
              Add members
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
              {selectedIds.size} selected
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="text-[14px] font-semibold text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed hover:text-blue-400 transition-colors"
        >
          Next
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-white/6 border border-slate-200 dark:border-white/8 rounded-xl px-3 py-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selected chips strip */}
      <AnimatePresence initial={false}>
        {selectedMembers.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden shrink-0"
          >
            <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-3 scrollbar-none">
              {selectedMembers.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="relative">
                    <MemberAvatar member={m} size="sm" />
                    <button
                      type="button"
                      onClick={() => onToggle(m)}
                      className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-slate-600 dark:bg-slate-400 rounded-full flex items-center justify-center text-white"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[52px] truncate text-center">
                    {m.name.split(" ")[0]}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/6 mx-4 mb-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-1 px-2 pt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-white/8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 dark:bg-white/8 rounded w-2/5" />
                  <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-[13px] text-slate-400 dark:text-slate-600">No members found</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {members.map((m) => {
              const isSelected = selectedIds.has(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggle(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/4 transition-colors text-left"
                >
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                      {m.email}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 dark:border-white/20"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 2: Name the group ───────────────────────────────────────────────────

function NameGroupStep({
  selectedMembers,
  onBack,
  onCreate,
  isCreating,
}: {
  selectedMembers: Member[]
  onBack: () => void
  onCreate: (name: string) => void
  isCreating: boolean
}) {
  const [groupName, setGroupName] = useState("")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/8 transition-colors text-slate-500 dark:text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white leading-none">
            New Group
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onCreate(groupName.trim())}
          disabled={!groupName.trim() || isCreating}
          className="text-[14px] font-semibold text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed hover:text-blue-400 transition-colors"
        >
          {isCreating ? "Creating…" : "Create"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Group avatar + name input */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600 mb-1.5">
              Group name
            </label>
            <input
              type="text"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && groupName.trim() && !isCreating) {
                  onCreate(groupName.trim())
                }
              }}
              maxLength={80}
              className="w-full bg-slate-100 dark:bg-white/6 border border-slate-200 dark:border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-blue-400/60 dark:focus:border-blue-500/40 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Members section */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600 mb-2">
            Members · {selectedMembers.length}
          </p>
          <div className="">
            {selectedMembers
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 py-2.5 rounded-xl"
                >
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                      {m.email}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type Step = "select" | "name"

type CreateGroupModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserUuid?: string
}

export function CreateGroupModal({ open, onOpenChange, currentUserUuid }: CreateGroupModalProps) {
  const [step, setStep] = useState<Step>("select")
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([])
  const createGroup = useCreateGroupChat()

  function toggleMember(member: Member) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(member.id)) {
        next.delete(member.id)
      } else {
        next.add(member.id)
      }
      return next
    })
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id)
      if (exists) return prev.filter((m) => m.id !== member.id)
      return [...prev, member]
    })
  }

  function handleClose() {
    onOpenChange(false)
  }

  function reset() {
    setStep("select")
    setSelectedIds(new Set())
    setSelectedMembers([])
  }

  async function handleCreate(name: string) {
    await createGroup.mutateAsync({
      name,
      memberIds: Array.from(selectedIds),
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(480px,95vw)] h-[min(640px,92vh)] bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/8 overflow-hidden flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <AnimatePresence mode="wait" initial={false}>
            {step === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-col h-full"
              >
                <SelectMembersStep
                  selectedIds={selectedIds}
                  onToggle={toggleMember}
                  onNext={() => setStep("name")}
                  onClose={handleClose}
                  currentUserUuid={currentUserUuid}
                />
              </motion.div>
            ) : (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-col h-full"
              >
                <NameGroupStep
                  selectedMembers={selectedMembers}
                  onBack={() => setStep("select")}
                  onCreate={handleCreate}
                  isCreating={createGroup.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
