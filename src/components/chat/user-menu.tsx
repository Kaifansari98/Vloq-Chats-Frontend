"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DropdownMenu, Dialog } from "radix-ui";
import {
  ChevronsUpDown,
  Settings,
  LogOut,
  AlertTriangle,
  UserPlus,
  Users,
  UserCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  X,
  Camera,
  Loader2,
} from "lucide-react";
import { PasswordStrengthField } from "@/components/comp-51";
import { SettingsModal } from "@/components/chat/settings-modal";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserMenuProps = {
  collapsed?: boolean;
};

type OrgUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  isActive: boolean;
  organizationId: number;
  userTypeId: number;
  createdAt: string;
};

const USERS_PER_PAGE = 10;

const AVATAR_COLORS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-green-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-red-600",
  "from-sky-500 to-cyan-600",
];

function avatarColor(name: string): string {
  const code = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function getUserInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response: unknown }).response === "object" &&
    (error as { response: unknown }).response !== null
  ) {
    const resp = (error as { response: { data?: { message?: string } } })
      .response;
    if (typeof resp.data?.message === "string") return resp.data.message;
  }
  return fallback;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole(user?.userTypeCode);
  const router = useRouter();
  const [roles, setRoles] = useState<Array<{ id: number; code: string }>>([]);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);

  // Sidebar / header profile pic (fetched on mount, updated after save)
  const [sidebarProfilePicUrl, setSidebarProfilePicUrl] = useState<string | null>(null);

  // Update Profile state
  const [updateProfileOpen, setUpdateProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileRoleCode, setProfileRoleCode] = useState("MEMBER");
  const [profilePassword, setProfilePassword] = useState("");
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [currentProfilePicUrl, setCurrentProfilePicUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const profilePicInputRef = useRef<HTMLInputElement>(null);

  // Create user form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoleCode, setSelectedRoleCode] = useState("MEMBER");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage Users list state
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [orgUsersLoading, setOrgUsersLoading] = useState(false);
  const [orgUsersTotal, setOrgUsersTotal] = useState(0);
  const [orgUsersPage, setOrgUsersPage] = useState(1);
  const [orgUsersSearch, setOrgUsersSearch] = useState("");
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);

  // Edit user state
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleCode, setEditRoleCode] = useState("MEMBER");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete user state
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrgUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle confirmation state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<OrgUser | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Hovered row in the manage users list
  const [hoveredUserUuid, setHoveredUserUuid] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const dark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  // Fetch profile pic URL on mount so avatars show it immediately
  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ user: { profile_pic_url: string | null } }>("/users/me");
        setSidebarProfilePicUrl(res.data.user.profile_pic_url ?? null);
      } catch {
        // Non-fatal — keep null, initials will show
      }
    })();
  }, []);

  // Fetch current user profile when Update Profile modal opens
  useEffect(() => {
    if (!updateProfileOpen) return;

    void (async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const res = await api.get<{
          user: {
            uuid: string;
            name: string;
            email: string;
            userTypeId: number;
            profile_pic_url: string | null;
          };
        }>("/users/me");
        const u = res.data.user;
        setProfileName(u.name);
        setProfileEmail(u.email);
        setProfileRoleCode(user?.userTypeCode ?? "MEMBER");
        setCurrentProfilePicUrl(u.profile_pic_url ?? null);
        setProfilePicPreview(null);
        setProfilePicFile(null);
        setProfilePassword("");
      } catch {
        setProfileError("Failed to load profile");
      } finally {
        setIsLoadingProfile(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateProfileOpen]);

  useEffect(() => {
    if ((!createUserOpen && !manageUsersOpen && !editUserOpen && !updateProfileOpen) || !isAdmin) {
      return;
    }

    void (async () => {
      try {
        const response = await api.get<{
          data: Array<{ id: number; code: string }>;
        }>("/users/roles");
        setRoles(response.data.data);
      } catch {
        setRoles([]);
      }
    })();
  }, [createUserOpen, manageUsersOpen, editUserOpen, updateProfileOpen, isAdmin]);

  useEffect(() => {
    if (!manageUsersOpen || !isAdmin) return;

    let cancelled = false;
    const delay = orgUsersSearch ? 300 : 0;

    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        setOrgUsersLoading(true);
        try {
          const res = await api.post<{ data: OrgUser[]; total: number }>(
            "/users/members",
            {
              page: orgUsersPage,
              limit: USERS_PER_PAGE,
              search: orgUsersSearch,
            },
          );
          if (!cancelled) {
            setOrgUsers(res.data.data);
            setOrgUsersTotal(res.data.total);
          }
        } catch {
          if (!cancelled) setOrgUsers([]);
        } finally {
          if (!cancelled) setOrgUsersLoading(false);
        }
      })();
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [manageUsersOpen, orgUsersPage, orgUsersSearch, isAdmin, usersRefreshKey]);

  const roleMap = useMemo(
    () =>
      roles.reduce<Record<number, string>>((acc, r) => {
        acc[r.id] = r.code;
        return acc;
      }, {}),
    [roles],
  );

  const totalPages = Math.max(1, Math.ceil(orgUsersTotal / USERS_PER_PAGE));

  function handleManageUsersOpenChange(open: boolean) {
    setManageUsersOpen(open);
    if (!open) {
      setOrgUsersSearch("");
      setOrgUsersPage(1);
    }
  }

  function handleSearchChange(value: string) {
    setOrgUsersSearch(value);
    setOrgUsersPage(1);
  }

  function openEditUser(u: OrgUser) {
    setEditTarget(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRoleCode(roleMap[u.userTypeId] ?? "MEMBER");
    setEditPassword("");
    setEditError(null);
    setEditUserOpen(true);
  }

  function openDeleteUser(u: OrgUser) {
    setDeleteTarget(u);
    setDeleteUserOpen(true);
  }

  function openStatusConfirm(u: OrgUser) {
    setStatusConfirmTarget(u);
    setStatusConfirmOpen(true);
  }

  async function confirmToggleStatus() {
    if (!statusConfirmTarget) return;
    const target = statusConfirmTarget;
    const activating = !target.isActive;
    setIsTogglingStatus(true);

    try {
      await api.patch(`/users/${target.uuid}`, { isActive: activating });
      setStatusConfirmOpen(false);
      setUsersRefreshKey((k) => k + 1);
      toast.success(
        activating
          ? `${target.name} has been activated.`
          : `${target.name} has been deactivated.`,
      );
    } catch (error) {
      toast.error(extractErrorMessage(error, activating ? "Failed to activate user." : "Failed to deactivate user."));
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleEditUser() {
    if (!editTarget) return;
    setEditError(null);
    setIsEditing(true);

    try {
      const selectedRole = roles.find((r) => r.code === editRoleCode);

      if (!selectedRole) {
        setEditError("User role is required");
        return;
      }

      const body: Record<string, unknown> = {
        name: editName.trim(),
        email: editEmail.trim(),
        userTypeId: selectedRole.id,
      };
      if (editPassword.length >= 6) {
        body.password = editPassword;
      }

      await api.patch(`/users/${editTarget.uuid}`, body);

      setEditUserOpen(false);
      setUsersRefreshKey((k) => k + 1);
      toast.success("User updated successfully.");
    } catch (error) {
      setEditError(extractErrorMessage(error, "Failed to update user"));
      toast.error(extractErrorMessage(error, "Failed to update user."));
    } finally {
      setIsEditing(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleting(true);

    try {
      await api.delete(`/users/${target.uuid}`);
      setDeleteUserOpen(false);
      toast.success(`${target.name} has been removed.`);
      if (orgUsers.length === 1 && orgUsersPage > 1) {
        setOrgUsersPage((p) => p - 1);
      } else {
        setUsersRefreshKey((k) => k + 1);
      }
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to delete user."));
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmLogout() {
    void (async () => {
      const fcmToken = window.localStorage.getItem("vloq:fcmToken");

      if (fcmToken) {
        try {
          await api.post("/users/push-tokens/remove", { token: fcmToken });
          window.localStorage.removeItem("vloq:fcmToken");
        } catch {
          // Logout should proceed even if push-token cleanup fails.
        }
      }

      document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0`;
      document.cookie = `${AUTH_USER_COOKIE}=; path=/; max-age=0`;
      router.replace("/login");
    })();
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const itemClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] cursor-pointer outline-none transition-colors " +
    "text-slate-600 dark:text-slate-300 " +
    "hover:bg-slate-100 focus:bg-slate-100 hover:text-slate-900 focus:text-slate-900 " +
    "dark:hover:bg-white/6 dark:focus:bg-white/6 dark:hover:text-white dark:focus:text-white";

  function handleProfilePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5 MB.");
      return;
    }
    setProfilePicFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePicPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSaveProfile() {
    if (!user) return;
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      // Upload profile pic first if a new one was selected
      if (profilePicFile) {
        const formData = new FormData();
        formData.append("file", profilePicFile);
        const picRes = await api.post<{ profile_pic_url: string }>(
          "/users/me/profile-pic",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        setCurrentProfilePicUrl(picRes.data.profile_pic_url);
        setSidebarProfilePicUrl(picRes.data.profile_pic_url);
        setProfilePicPreview(null);
        setProfilePicFile(null);
      }

      // Update name / email / password
      const body: Record<string, unknown> = {
        name: profileName.trim(),
        email: profileEmail.trim(),
      };
      if (isAdmin && profileRoleCode) {
        const selectedRole = roles.find((r) => r.code === profileRoleCode);
        if (selectedRole) body.userTypeId = selectedRole.id;
      }
      if (profilePassword.length >= 6) {
        body.password = profilePassword;
      }

      await api.patch(`/users/${user.uuid}`, body);

      setUpdateProfileOpen(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      const msg = extractErrorMessage(error, "Failed to update profile");
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleCreateUser() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const selectedRole = roles.find((role) => role.code === selectedRoleCode);

      if (!selectedRole) {
        setSubmitError("User role is required");
        return;
      }

      const profile = await api.get<{
        user: {
          organizationId: number;
        };
      }>("/users/me");

      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        organizationId: profile.data.user.organizationId,
        userTypeId: selectedRole.id,
        provider: "EMAIL",
      });

      setName("");
      setEmail("");
      setPassword("");
      setSelectedRoleCode("MEMBER");
      setCreateUserOpen(false);
    } catch (error: unknown) {
      setSubmitError(extractErrorMessage(error, "Failed to create user"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={logoutOpen} onOpenChange={setLogoutOpen}>
      <DropdownMenu.Root>
        {/* ── Trigger: user card ── */}
        <DropdownMenu.Trigger asChild>
          <button
            className={`flex w-full items-center rounded-xl transition-colors outline-none hover:bg-slate-100 dark:hover:bg-white/6 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-white/8 ${
              collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"
            }`}
          >
            <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[11px] font-semibold text-white shadow-md shadow-blue-500/20">
              {sidebarProfilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sidebarProfilePicUrl} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
              ) : initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate">
                    {user?.name ?? "You"}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                    {user?.email ?? ""}
                  </p>
                </div>
                <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-700 shrink-0" />
              </>
            )}
          </button>
        </DropdownMenu.Trigger>

        {/* ── Dropdown content ── */}
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="right"
            align="end"
            sideOffset={12}
            className={cn(
              "z-50 w-64 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60",
              "border border-slate-200 dark:border-white/9",
              "bg-white dark:bg-[#0e1c32]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=right]:slide-in-from-left-2",
            )}
          >
            {/* User header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/7">
              <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[11px] font-semibold text-white">
                {sidebarProfilePicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sidebarProfilePicUrl} alt={user?.name ?? "avatar"} className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name ?? "You"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email ?? ""}
                </p>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              {isAdmin && (
                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreateUserOpen(true);
                  }}
                  className={itemClass}
                >
                  <UserPlus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Create User
                </DropdownMenu.Item>
              )}

              {/* Visible to all users */}
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setUpdateProfileOpen(true);
                }}
                className={itemClass}
              >
                <UserCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Update Profile
              </DropdownMenu.Item>

              {isAdmin && (
                <>
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      setManageUsersOpen(true);
                    }}
                    className={itemClass}
                  >
                    <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Manage Users
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      setSettingsOpen(true);
                    }}
                    className={itemClass}
                  >
                    <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    Settings
                  </DropdownMenu.Item>
                </>
              )}
            </div>

            <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-white/7 mx-2" />

            {/* Logout */}
            <div className="p-1.5">
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  setLogoutOpen(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-500 dark:text-red-400 cursor-pointer outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* ── Logout confirmation dialog ── */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/9 bg-white dark:bg-[#0e1c32] p-6 shadow-2xl shadow-black/10 dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>

          <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Log out of ButterFly Chats?
          </Dialog.Title>
          <Dialog.Description className="text-[13px] text-slate-500 leading-relaxed mb-6">
            You&apos;ll be signed out of your account and redirected to the
            login page. Any unsent messages will be lost.
          </Dialog.Description>

          <div className="flex items-center gap-3">
            <Dialog.Close asChild>
              <button className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/9 bg-slate-100 dark:bg-white/4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={confirmLogout}
              className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-400 text-sm font-medium text-white transition-colors shadow-lg shadow-red-500/20"
            >
              Log out
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* ── Create User dialog ── */}
      <Dialog.Root open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/10 dark:border-white/9 dark:bg-[#0e1c32] dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
                  Create User
                </Dialog.Title>
                <Dialog.Description className="text-[13px] text-slate-500 dark:text-slate-400">
                  Add a new member to this workspace using email login.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-400 dark:hover:bg-white/8">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter user name"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  User Role
                </label>
                <select
                  value={selectedRoleCode}
                  onChange={(e) => setSelectedRoleCode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <PasswordStrengthField
                  label="Password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={setPassword}
                />
              </div>

              {submitError && (
                <p className="text-[12px] text-rose-500">{submitError}</p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={
                  isSubmitting ||
                  name.trim().length < 2 ||
                  email.trim().length === 0 ||
                  password.length < 6 ||
                  selectedRoleCode.length === 0
                }
                className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Manage Users dialog ── */}
      <Dialog.Root
        open={manageUsersOpen}
        onOpenChange={handleManageUsersOpenChange}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex flex-col w-full max-w-lg max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10 dark:border-white/9 dark:bg-[#0e1c32] dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-200 dark:border-white/7 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white leading-none">
                    Manage Users
                  </Dialog.Title>
                  <Dialog.Description className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {orgUsersLoading && orgUsersTotal === 0
                      ? "Loading..."
                      : orgUsersTotal > 0
                        ? `${orgUsersTotal} member${orgUsersTotal !== 1 ? "s" : ""} in your organization`
                        : "No members found"}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-400 dark:hover:bg-white/8">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={orgUsersSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name or email..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white dark:border-white/8 dark:bg-white/4 dark:text-slate-100 dark:focus:bg-white/6 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* User list */}
            <div className="overflow-y-auto flex-1 px-3 py-2">
              {/* Loading skeletons */}
              {orgUsersLoading && (
                <div className="space-y-0.5 py-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-white/8 shrink-0" />
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="h-3 w-28 rounded-md bg-slate-200 dark:bg-white/8" />
                        <div className="h-2.5 w-44 rounded-md bg-slate-100 dark:bg-white/5" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-slate-100 dark:bg-white/5 shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!orgUsersLoading && orgUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/6 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                    {orgUsersSearch
                      ? "No members match your search"
                      : "No members found"}
                  </p>
                  {orgUsersSearch && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="mt-2 text-[12px] text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}

              {/* User rows */}
              {!orgUsersLoading && orgUsers.length > 0 && (
                <div className="space-y-0.5 py-1">
                  {orgUsers.map((u) => {
                    const userInitials = getUserInitials(u.name);
                    const color = avatarColor(u.name);
                    const roleCode = roleMap[u.userTypeId] ?? "MEMBER";
                    const isCurrentUser = u.email === user?.email;
                    const isHovered = hoveredUserUuid === u.uuid;

                    return (
                      <div
                        key={u.uuid}
                        onMouseEnter={() => setHoveredUserUuid(u.uuid)}
                        onMouseLeave={() => setHoveredUserUuid(null)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/4 transition-colors"
                      >
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 shrink-0 rounded-full bg-linear-to-br ${color} flex items-center justify-center text-[11px] font-semibold text-white`}
                        >
                          {userInitials}
                        </div>

                        {/* Name & email */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                              {u.name}
                            </p>
                            {isCurrentUser && (
                              <span className="shrink-0 text-[10px] font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-full px-1.5 py-px">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {u.email}
                          </p>
                        </div>

                        {/* Role badge — always visible, slides left when action buttons appear */}
                        <motion.span
                          layout="position"
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className={cn(
                            "shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border",
                            roleCode === "ADMIN"
                              ? "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20"
                              : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/6 dark:text-slate-400 dark:border-white/10",
                          )}
                        >
                          {roleCode === "ADMIN" ? "Admin" : "Member"}
                        </motion.span>

                        {/* Action buttons — slide in from right on hover */}
                        <AnimatePresence initial={false}>
                          {isHovered && (
                            <motion.div
                              key="actions"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="flex items-center gap-1 shrink-0"
                            >
                              {/* Edit */}
                              <motion.button
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.18,
                                  delay: 0.03,
                                  ease: "easeOut",
                                }}
                                onClick={() => openEditUser(u)}
                                title="Edit user"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </motion.button>

                              {/* Activate — solid green when already active (current state) */}
                              <motion.button
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.18,
                                  delay: 0.06,
                                  ease: "easeOut",
                                }}
                                onClick={() => {
                                  if (!u.isActive) openStatusConfirm(u);
                                }}
                                title={
                                  u.isActive
                                    ? "User is active"
                                    : "Activate user"
                                }
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                  u.isActive
                                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 cursor-default"
                                    : "text-slate-400 dark:text-slate-500 hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400",
                                )}
                              >
                                <UserRoundCheck className="w-3.5 h-3.5" />
                              </motion.button>

                              {/* Deactivate — solid rose when already inactive (current state) */}
                              <motion.button
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.18,
                                  delay: 0.09,
                                  ease: "easeOut",
                                }}
                                onClick={() => {
                                  if (u.isActive) openStatusConfirm(u);
                                }}
                                title={
                                  u.isActive
                                    ? "Deactivate user"
                                    : "User is inactive"
                                }
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                  !u.isActive
                                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 cursor-default"
                                    : "text-slate-400 dark:text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400",
                                )}
                              >
                                <UserRoundX className="w-3.5 h-3.5" />
                              </motion.button>

                              {/* Delete */}
                              {!isCurrentUser && (
                                <motion.button
                                  initial={{ opacity: 0, x: 12 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    duration: 0.18,
                                    delay: 0.12,
                                    ease: "easeOut",
                                  }}
                                  onClick={() => openDeleteUser(u)}
                                  title="Delete user"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!orgUsersLoading && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-white/5 shrink-0">
                <button
                  onClick={() => setOrgUsersPage((p) => Math.max(1, p - 1))}
                  disabled={orgUsersPage === 1}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/4 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-[12px] text-slate-500 dark:text-slate-400">
                  Page {orgUsersPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setOrgUsersPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={orgUsersPage === totalPages}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 dark:border-white/8 bg-slate-50 dark:bg-white/4 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Edit User dialog ── */}
      <Dialog.Root open={editUserOpen} onOpenChange={setEditUserOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/10 dark:border-white/9 dark:bg-[#0e1c32] dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
                  Edit User
                </Dialog.Title>
                <Dialog.Description className="text-[13px] text-slate-500 dark:text-slate-400">
                  Update details for{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {editTarget?.name}
                  </span>
                  .
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-400 dark:hover:bg-white/8">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Full name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter user name"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                  User Role
                </label>
                <select
                  value={editRoleCode}
                  onChange={(e) => setEditRoleCode(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <PasswordStrengthField
                  label="New password (optional)"
                  placeholder="Leave blank to keep current password"
                  value={editPassword}
                  onChange={setEditPassword}
                />
              </div>

              {editError && (
                <p className="text-[12px] text-rose-500">{editError}</p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Dialog.Close asChild>
                <button className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleEditUser}
                disabled={
                  isEditing ||
                  editName.trim().length < 2 ||
                  editEmail.trim().length === 0 ||
                  editRoleCode.length === 0 ||
                  (editPassword.length > 0 && editPassword.length < 6)
                }
                className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEditing ? "Saving..." : "Save changes"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Delete User confirmation dialog ── */}
      <Dialog.Root open={deleteUserOpen} onOpenChange={setDeleteUserOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/9 bg-white dark:bg-[#0e1c32] p-6 shadow-2xl shadow-black/10 dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-4">
              <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
            </div>

            <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
              Delete {deleteTarget?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-slate-500 leading-relaxed mb-6">
              This will remove{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {deleteTarget?.email}
              </span>{" "}
              from your organization. They will lose access immediately. This
              action cannot be undone.
            </Dialog.Description>

            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button
                  disabled={isDeleting}
                  className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/9 bg-slate-100 dark:bg-white/4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-400 text-sm font-medium text-white transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete user"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Status toggle confirmation dialog ── */}
      <Dialog.Root open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/9 bg-white dark:bg-[#0e1c32] p-6 shadow-2xl shadow-black/10 dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <div
              className={cn(
                "w-11 h-11 rounded-2xl border flex items-center justify-center mb-4",
                statusConfirmTarget?.isActive
                  ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                  : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
              )}
            >
              {statusConfirmTarget?.isActive ? (
                <UserRoundX className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              ) : (
                <UserRoundCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              )}
            </div>

            <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
              {statusConfirmTarget?.isActive ? "Deactivate" : "Activate"}{" "}
              {statusConfirmTarget?.name}?
            </Dialog.Title>
            <Dialog.Description className="text-[13px] text-slate-500 leading-relaxed mb-6">
              {statusConfirmTarget?.isActive ? (
                <>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {statusConfirmTarget.name}
                  </span>{" "}
                  will be deactivated and immediately lose access to the workspace. You can reactivate them at any time.
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {statusConfirmTarget?.name}
                  </span>{" "}
                  will be reactivated and regain full access to the workspace.
                </>
              )}
            </Dialog.Description>

            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button
                  disabled={isTogglingStatus}
                  className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/9 bg-slate-100 dark:bg-white/4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={() => void confirmToggleStatus()}
                disabled={isTogglingStatus}
                className={cn(
                  "flex-1 h-9 rounded-xl text-sm font-medium text-white transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                  statusConfirmTarget?.isActive
                    ? "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
                    : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20",
                )}
              >
                {isTogglingStatus
                  ? "Saving..."
                  : statusConfirmTarget?.isActive
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── Update Profile dialog ── */}
      <Dialog.Root
        open={updateProfileOpen}
        onOpenChange={(open) => {
          setUpdateProfileOpen(open);
          if (!open) {
            setProfilePicFile(null);
            setProfilePicPreview(null);
            setProfilePassword("");
            setProfileError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-black/10 dark:border-white/9 dark:bg-[#0e1c32] dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">

            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white">
                  Update Profile
                </Dialog.Title>
                <Dialog.Description className="text-[13px] text-slate-500 dark:text-slate-400">
                  Update your personal details and profile picture.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/8 dark:bg-white/4 dark:text-slate-400 dark:hover:bg-white/8">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile picture upload */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-white/8 shadow-lg">
                      {profilePicPreview ?? currentProfilePicUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profilePicPreview ?? currentProfilePicUrl ?? ""}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-semibold text-white">
                          {initials}
                        </div>
                      )}
                    </div>
                    {/* Camera overlay */}
                    <button
                      type="button"
                      onClick={() => profilePicInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Change profile picture"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <input
                    ref={profilePicInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleProfilePicChange}
                  />
                  <button
                    type="button"
                    onClick={() => profilePicInputRef.current?.click()}
                    className="text-[12px] font-medium text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    {profilePicPreview ? "Change photo" : currentProfilePicUrl ? "Replace photo" : "Upload photo"}
                  </button>
                  {profilePicFile && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {profilePicFile.name} · {(profilePicFile.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-white/6" />

                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                  />
                </div>

                {/* Role — visible to admins only */}
                {isAdmin && (
                  <div>
                    <label className="mb-1.5 block text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      User Role
                    </label>
                    <select
                      value={profileRoleCode}
                      onChange={(e) => setProfileRoleCode(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 dark:border-white/8 dark:bg-white/4 dark:text-slate-100"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                )}

                {/* Password */}
                <div>
                  <PasswordStrengthField
                    label="New password (optional)"
                    placeholder="Leave blank to keep current password"
                    value={profilePassword}
                    onChange={setProfilePassword}
                  />
                </div>

                {profileError && (
                  <p className="text-[12px] text-rose-500">{profileError}</p>
                )}
              </div>
            )}

            {!isLoadingProfile && (
              <div className="mt-6 flex items-center gap-3">
                <Dialog.Close asChild>
                  <button className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/9 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => void handleSaveProfile()}
                  disabled={
                    isSavingProfile ||
                    profileName.trim().length < 2 ||
                    profileEmail.trim().length === 0 ||
                    (profilePassword.length > 0 && profilePassword.length < 6)
                  }
                  className="flex-1 h-10 rounded-xl bg-blue-500 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSavingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Dialog.Root>
  );
}
