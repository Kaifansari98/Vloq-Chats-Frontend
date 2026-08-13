"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Check, Search, Users, X, Loader2 } from "lucide-react"
import { BaseModal } from "@/components/ui/base-modal"
import { useOrganizationMembers, type Member } from "@/hooks/use-organization-members"
import { useCreateGroupChat } from "@/hooks/use-group-chats"
import { useAuth } from "@/hooks/use-auth"

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-[#00a884] to-emerald-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-yellow-600",
  "from-teal-500 to-emerald-600",
  "from-fuchsia-500 to-pink-600",
  "from-orange-500 to-red-600",
]

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]!
}

function getInitials(name: string) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  size = "md",
}: {
  member: Member
  size?: "sm" | "md"
}) {
  const sizeClasses = size === "sm" ? "w-7.5 h-7.5 text-[11px]" : "w-10 h-10 text-[13px]"

  if (member.profile_pic_url) {
    return (
      <img
        src={member.profile_pic_url}
        alt={member.name}
        className={`${sizeClasses} rounded-full object-cover shrink-0 ring-2 ring-white/10`}
      />
    )
  }

  const grad = getGradient(member.name)
  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white shrink-0 shadow-xs`}
    >
      {getInitials(member.name)}
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
    <div className="flex flex-col h-full bg-slate-50/30 dark:bg-black/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">
                Add members
              </h2>
              {selectedIds.size > 0 && (
                <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-in fade-in zoom-in-95 shrink-0">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500 truncate">
              Select contacts to add to this group
            </p>
          </div>
        </div>

        {/* Close button on top right */}
        <button
          type="button"
          onClick={onClose}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-slate-400 active:scale-95 cursor-pointer shrink-0 ml-2"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2.5 bg-slate-100/80 dark:bg-white/6 border border-slate-200/80 dark:border-white/10 rounded-2xl px-3.5 py-2.5 transition-all focus-within:border-[var(--accent)]/60 focus-within:ring-2 focus-within:ring-[var(--accent)]/20 shadow-inner">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-0.5"
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
            <div className="flex gap-3 overflow-x-auto px-5 pt-2 pb-3 scrollbar-none">
              {selectedMembers.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group"
                >
                  <div className="relative">
                    <div className="ring-2 ring-emerald-500/30 dark:ring-emerald-500/40 rounded-full p-0.5">
                      <MemberAvatar member={m} size="sm" />
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggle(m)}
                      className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 rounded-full flex items-center justify-center hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90 cursor-pointer"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 max-w-[56px] truncate text-center">
                    {m.name.split(" ")[0]}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="h-px bg-slate-200/60 dark:bg-white/8 mx-5 mb-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 min-h-0">
        {isLoading ? (
          <div className="space-y-1.5 px-2 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-3 py-3 rounded-2xl animate-pulse bg-slate-100/50 dark:bg-white/4">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-white/8 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-white/8 rounded-full w-2/5" />
                  <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded-full w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/6 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No members found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try searching with a different name</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((m) => {
              const isSelected = selectedIds.has(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggle(m)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 text-left group cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20"
                      : "hover:bg-slate-100/70 dark:hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[var(--accent)] transition-colors">
                      {m.name}
                    </p>
                    <p className="text-[11.5px] text-slate-400 dark:text-slate-500 truncate">
                      {m.email}
                    </p>
                  </div>
                  <div
                    className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-[var(--accent)] border-[var(--accent)] shadow-md shadow-emerald-500/30 scale-105"
                        : "border-slate-300 dark:border-white/20 group-hover:border-slate-400 dark:group-hover:border-white/40"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with Next button */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#182229]/60 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {selectedIds.size > 0
            ? `${selectedIds.size} member${selectedIds.size === 1 ? "" : "s"} selected`
            : "Select members to continue"}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="px-6 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Name the group ───────────────────────────────────────────────────

function NameGroupStep({
  selectedMembers,
  onBack,
  onClose,
  onCreate,
  isCreating,
}: {
  selectedMembers: Member[]
  onBack: () => void
  onClose: () => void
  onCreate: (name: string) => void
  isCreating: boolean
}) {
  const [groupName, setGroupName] = useState("")

  return (
    <div className="flex flex-col h-full bg-slate-50/30 dark:bg-black/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
         
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">
              New Group
            </h2>
            <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500 truncate">
              Set group title and finalize
            </p>
          </div>
        </div>

        {/* Close button on top right */}
        <button
          type="button"
          onClick={onClose}
          className="w-8.5 h-8.5 flex items-center justify-center rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-slate-400 active:scale-95 cursor-pointer shrink-0 ml-2"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 min-h-0">
        {/* Group avatar + name input */}
        <div className="flex items-center gap-4 mb-8 bg-slate-100/50 dark:bg-white/4 p-4 rounded-3xl border border-slate-200/60 dark:border-white/8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00a884] via-emerald-600 to-teal-700 flex items-center justify-center shrink-0 shadow-lg ">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Group Name
              </label>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-600">
                {groupName.length}/80
              </span>
            </div>
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
              className="w-full bg-white dark:bg-[#1f2c34] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all shadow-xs"
              autoFocus
            />
          </div>
        </div>

        {/* Members section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Participants · {selectedMembers.length}
            </p>
          </div>
          <div className="space-y-1">
            {selectedMembers
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl bg-white/40 dark:bg-white/4 border border-slate-100 dark:border-white/5"
                >
                  <MemberAvatar member={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {m.email}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
                    Member
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer with Create Group button */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#182229]/60 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8 cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onCreate(groupName.trim())}
          disabled={!groupName.trim() || isCreating}
          className="px-6 py-2 rounded-xl text-sm font-semibold bg-[var(--accent)] text-white shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer flex items-center gap-2"
        >
          {isCreating && <Loader2 className="w-4 h-4 animate-spin text-white" />}
          {isCreating ? "Creating Group..." : "Create Group"}
        </button>
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
    <BaseModal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      size="xl"
      showCloseButton={false}
      className="h-[min(640px,92vh)]"
      contentClassName="p-0 flex flex-col h-full overflow-hidden"
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
              onClose={handleClose}
              onCreate={handleCreate}
              isCreating={createGroup.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </BaseModal>
  )
}

export { CreateGroupModal as AddMembersModal }
