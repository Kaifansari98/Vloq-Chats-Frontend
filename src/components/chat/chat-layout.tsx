"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import {
  useOrganizationMembers,
  type Member,
} from "@/hooks/use-organization-members";
import { useDirectChats } from "@/hooks/use-direct-chats";
import type {
  ChatListFilter,
  DirectChat,
  DirectChatsResponse,
  GroupChat,
} from "@/hooks/use-direct-chats";
import {
  useDirectMessages,
  type DirectMessage,
  useMarkDirectChatRead,
  useSendDirectMessage,
  useUploadDirectMessage,
} from "@/hooks/use-direct-messages";
import {
  useGroupMessages,
  useSendGroupMessage,
  useUploadGroupMessage,
} from "@/hooks/use-group-messages";
import { EmptyChat } from "@/components/chat/empty-chat";
import {
  ChatWindow,
  type ChatConversation,
  type ChatMessage,
} from "@/components/chat/chat-window";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { NotificationsPage } from "@/components/notifications/notifications-page";
import { CreateGroupModal } from "@/components/chat/create-group-modal";
import { createChatSocket, type ChatSocket } from "@/lib/socket";
import type { NotificationItem } from "@/hooks/use-notifications";

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-orange-500 to-red-600",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMessageMentions(
  content: string,
  participants: Array<{ id: number; name: string }>,
) {
  const mentions: Array<{
    mentionedUserId: number;
    offset: number;
    length: number;
  }> = [];

  for (const participant of [...participants].sort(
    (left, right) => right.name.length - left.name.length,
  )) {
    const regex = new RegExp(
      `@${escapeRegExp(participant.name)}(?=\\s|$)`,
      "g",
    );

    let match: RegExpExecArray | null = regex.exec(content);
    while (match) {
      mentions.push({
        mentionedUserId: participant.id,
        offset: match.index,
        length: match[0].length,
      });
      match = regex.exec(content);
    }
  }

  return mentions
    .filter(
      (mention, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.mentionedUserId === mention.mentionedUserId &&
            candidate.offset === mention.offset,
        ) === index,
    )
    .sort((left, right) => left.offset - right.offset);
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "";

  const timestamp = new Date(dateString).getTime();

  if (Number.isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function getActivityTimestamp(dateString?: string) {
  if (!dateString) return 0;

  const timestamp = new Date(dateString).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildDmNotificationBody(message: { content: string | null; type: string }): string {
  if (message.content?.trim()) return message.content.slice(0, 100);
  switch (message.type) {
    case "IMAGE": return "Sent an image";
    case "VIDEO": return "Sent a video";
    case "AUDIO": return "Sent an audio message";
    case "FILE": return "Sent a file";
    default: return "Sent you a message";
  }
}

function formatLastMessagePreview(
  lastMessage?: {
    content: string | null;
    type: string;
  } | null,
) {
  if (!lastMessage) return "No messages yet";
  if (lastMessage.content?.trim()) return lastMessage.content;

  switch (lastMessage.type) {
    case "IMAGE":
      return "Sent an image";
    case "VIDEO":
      return "Sent a video";
    case "AUDIO":
      return "Sent an audio message";
    case "FILE":
      return "Sent a file";
    default:
      return "New message";
  }
}

function memberToConversation(
  member: Member,
  directChat?: {
    unreadCount: number;
    lastMessage: {
      content: string | null;
      type: string;
      createdAt: string;
    } | null;
  },
) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return {
    id: member.uuid,
    memberId: member.id,
    name: member.name,
    initials,
    lastMessage: formatLastMessagePreview(directChat?.lastMessage),
    time: formatRelativeTime(directChat?.lastMessage?.createdAt),
    unread: directChat?.unreadCount ?? 0,
    latestActivityAt: getActivityTimestamp(directChat?.lastMessage?.createdAt),
    online: false,
    isTyping: false,
    gradient: GRADIENTS[member.id % GRADIENTS.length],
    profile_pic_url: member.profile_pic_url ?? null,
  } satisfies ChatConversation;
}

function directChatToConversation(
  directChat: DirectChat,
  gradient: string,
): ChatConversation {
  const name = directChat.otherParticipant.name;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    id: directChat.otherParticipant.uuid,
    memberId: directChat.otherParticipant.id,
    name,
    initials,
    lastMessage: formatLastMessagePreview(directChat.lastMessage),
    time: formatRelativeTime(directChat.lastMessage?.createdAt),
    unread: directChat.unreadCount,
    latestActivityAt: getActivityTimestamp(directChat.lastMessage?.createdAt),
    online: false,
    isTyping: false,
    gradient,
    profile_pic_url: directChat.otherParticipant.profile_pic_url ?? null,
  };
}

function groupChatToConversation(
  groupChat: GroupChat,
  gradient: string,
): ChatConversation {
  const name = groupChat.name;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    id: groupChat.uuid,
    memberId: 0,
    name,
    initials,
    lastMessage: formatLastMessagePreview(groupChat.lastMessage),
    time: formatRelativeTime(groupChat.lastMessage?.createdAt),
    unread: groupChat.unreadCount,
    latestActivityAt: getActivityTimestamp(groupChat.lastMessage?.createdAt),
    online: false,
    isTyping: false,
    gradient,
    participants: groupChat.participants.map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      profile_pic_url: p.profile_pic_url ?? null,
    })),
  };
}

export function ChatLayout() {
  const { user, token } = useAuth();
  const { isAdmin } = useUserRole(user?.userTypeCode);
  const pathname = usePathname();
  const isNotificationsRoute = pathname === "/notifications";
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem("vloq:selectedChatId"),
  );
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatListFilter>("ALL");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
  const [groupTypingUsers, setGroupTypingUsers] = useState<
    Array<{ conversationUuid: string; userId: number; userName: string }>
  >([]);
  const socketRef = useRef<ChatSocket | null>(null);
  const selectedMemberIdRef = useRef<number | undefined>(undefined);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTargetRef = useRef<
    | { type: "direct"; participantUserId: number }
    | { type: "group"; conversationUuid: string }
    | null
  >(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const chatFromUrl = searchParams.get("chat");
    if (!chatFromUrl) return;

    startTransition(() => {
      setSelectedId(chatFromUrl);
    });
    localStorage.setItem("vloq:selectedChatId", chatFromUrl);
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!token) return;

    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on("direct_message:new", (incomingMessage: DirectMessage) => {
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
      setTypingUserIds((prev) =>
        prev.filter((userId) => userId !== incomingMessage.senderId),
      );

      if (incomingMessage.senderUuid !== user?.uuid) {
        const isActiveConversation =
          selectedMemberIdRef.current === incomingMessage.senderId &&
          document.visibilityState === "visible";

        if (!isActiveConversation) {
          const body = buildDmNotificationBody(incomingMessage);
          const title = incomingMessage.senderName;

          if (document.visibilityState !== "visible" && Notification.permission === "granted") {
            const n = new Notification(title, { body, icon: "/favicon.ico" });
            n.onclick = () => {
              window.focus();
              localStorage.setItem("vloq:selectedChatId", incomingMessage.senderUuid);
              setSelectedId(incomingMessage.senderUuid);
            };
          }

          toast.info(title, {
            description: body,
            duration: 5000,
            action: {
              label: "Open",
              onClick: () => {
                localStorage.setItem("vloq:selectedChatId", incomingMessage.senderUuid);
                setSelectedId(incomingMessage.senderUuid);
              },
            },
          });
        }
      }
    });

    socket.on("direct_message:read", () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    });

    socket.on("group_chat:created", () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    });

    socket.on("group_message:new", (incomingMessage: DirectMessage) => {
      setGroupTypingUsers((prev) =>
        prev.filter(
          (entry) =>
            !(
              entry.conversationUuid === incomingMessage.conversationUuid &&
              entry.userId === incomingMessage.senderId
            ),
        ),
      );
      queryClient.setQueriesData<DirectChatsResponse>(
        { queryKey: ["direct-chats"] },
        (current) => {
          if (!current) return current;

          return {
            ...current,
            data: current.data.map((chat) => {
              if (
                chat.type !== "GROUP" ||
                chat.uuid !== incomingMessage.conversationUuid
              ) {
                return chat;
              }

              const isOwnMessage = incomingMessage.senderUuid === user?.uuid;
              const isActiveGroup =
                selectedId === incomingMessage.conversationUuid;

              return {
                ...chat,
                unreadCount:
                  isOwnMessage || isActiveGroup ? 0 : chat.unreadCount + 1,
                lastMessage: {
                  uuid: incomingMessage.uuid,
                  content: incomingMessage.content,
                  type: incomingMessage.type,
                  createdAt: incomingMessage.createdAt,
                },
                updatedAt: incomingMessage.createdAt,
              };
            }),
          };
        },
      );
      void queryClient.invalidateQueries({
        queryKey: ["group-messages", incomingMessage.conversationUuid],
      });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
    });

    socket.on("notification:new", (notification: NotificationItem) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });

      if (document.visibilityState !== "visible" && Notification.permission === "granted") {
        const n = new Notification(notification.title, {
          body: notification.body ?? undefined,
          icon: "/favicon.ico",
        });
        n.onclick = () => {
          window.focus();
          if (notification.conversationUuid) {
            localStorage.setItem("vloq:selectedChatId", notification.conversationUuid);
            setSelectedId(notification.conversationUuid);
          }
        };
      }

      toast.info(notification.title, {
        description: notification.body,
        duration: 5000,
        action: notification.conversationUuid
          ? {
              label: "Open",
              onClick: () => {
                localStorage.setItem(
                  "vloq:selectedChatId",
                  notification.conversationUuid!,
                );
                setSelectedId(notification.conversationUuid);
              },
            }
          : undefined,
      });
    });

    socket.on("presence:snapshot", (payload: { onlineUserIds?: number[] }) => {
      setOnlineUserIds(
        Array.isArray(payload.onlineUserIds) ? payload.onlineUserIds : [],
      );
    });

    socket.on(
      "presence:changed",
      (payload: { userId?: number; isOnline?: boolean }) => {
        if (typeof payload.userId !== "number") return;
        const userId = payload.userId;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (payload.isOnline) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return Array.from(next);
        });
      },
    );

    socket.on(
      "direct_message:typing",
      (payload: { fromUserId?: number; isTyping?: boolean }) => {
        if (typeof payload.fromUserId !== "number") return;
        const fromUserId = payload.fromUserId;
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          if (payload.isTyping) {
            next.add(fromUserId);
          } else {
            next.delete(fromUserId);
          }
          return Array.from(next);
        });
      },
    );

    socket.on(
      "group_message:typing",
      (payload: {
        conversationUuid?: string;
        fromUserId?: number;
        fromUserName?: string;
        isTyping?: boolean;
      }) => {
        if (
          typeof payload.conversationUuid !== "string" ||
          typeof payload.fromUserId !== "number" ||
          typeof payload.fromUserName !== "string"
        ) {
          return;
        }

        const conversationUuid = payload.conversationUuid;
        const fromUserId = payload.fromUserId;
        const fromUserName = payload.fromUserName;

        setGroupTypingUsers((prev) => {
          const filtered = prev.filter(
            (entry) =>
              !(
                entry.conversationUuid === conversationUuid &&
                entry.userId === fromUserId
              ),
          );

          if (!payload.isTyping) {
            return filtered;
          }

          return [
            ...filtered,
            {
              conversationUuid,
              userId: fromUserId,
              userName: fromUserName,
            },
          ];
        });
      },
    );

    socket.on("ip_restricted", () => {
      const past = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      document.cookie = `vloq_access_token=; ${past}`;
      document.cookie = `vloq_auth_user=; ${past}`;
      window.location.href = "/login";
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token, queryClient, selectedId, user?.uuid]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const { data, isLoading } = useOrganizationMembers(1, debouncedSearch);
  const { data: directChatsData, isLoading: isLoadingDirectChats } =
    useDirectChats(1, debouncedSearch, activeFilter);
  const baseConversations = (() => {
    const allChats = directChatsData?.data ?? [];

    // Build conversation items for every chat (DIRECT + GROUP) returned by the API
    const chatItems = allChats.map((chat, index) =>
      chat.type === "GROUP"
        ? groupChatToConversation(chat, GRADIENTS[index % GRADIENTS.length])
        : directChatToConversation(
            chat,
            GRADIENTS[chat.otherParticipant.id % GRADIENTS.length],
          ),
    );

    if (activeFilter !== "ALL") return chatItems;

    // For ALL: also surface members who have never sent/received a direct message
    const membersWithDirectChat = new Set(
      allChats
        .filter((chat): chat is DirectChat => chat.type === "DIRECT")
        .map((chat) => chat.otherParticipant.uuid),
    );

    const memberItems = (data?.data ?? [])
      .filter(
        (member) =>
          member.uuid !== user?.uuid && !membersWithDirectChat.has(member.uuid),
      )
      .map((member) => memberToConversation(member, undefined));

    return [...chatItems, ...memberItems];
  })();

  const conversations = baseConversations
    .map((conversation) => ({
      ...conversation,
      online: onlineUserIds.includes(conversation.memberId),
      isTyping:
        conversation.memberId === 0
          ? groupTypingUsers.some(
              (entry) => entry.conversationUuid === conversation.id,
            )
          : typingUserIds.includes(conversation.memberId),
      onlineParticipantNames: (conversation as ChatConversation).participants
        ?.filter((p) => onlineUserIds.includes(p.id))
        .map((p) => p.name.split(" ")[0]),
      onlineParticipants: (
        conversation as ChatConversation
      ).participants?.filter((p) => onlineUserIds.includes(p.id)),
    }))
    .sort((a, b) => {
      if (a.latestActivityAt !== b.latestActivityAt) {
        return b.latestActivityAt - a.latestActivityAt;
      }
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.name.localeCompare(b.name);
    });

  const effectiveSelectedId =
    selectedId &&
    conversations.some((conversation) => conversation.id === selectedId)
      ? selectedId
      : activeFilter === "ALL"
        ? (conversations[0]?.id ?? null)
        : null;
  const selected = conversations.find((c) => c.id === effectiveSelectedId);
  const isGroup = selected?.memberId === 0;
  const directMemberId =
    !isGroup && selected?.memberId ? selected.memberId : undefined;
  const groupConvUuid = isGroup ? selected?.id : undefined;

  const { data: directMessagesData, isLoading: isLoadingDirectMessages } =
    useDirectMessages(directMemberId);
  const { data: groupMessagesData, isLoading: isLoadingGroupMessages } =
    useGroupMessages(groupConvUuid);

  const messagesData = isGroup ? groupMessagesData : directMessagesData;
  const isLoadingMessages = isGroup
    ? isLoadingGroupMessages
    : isLoadingDirectMessages;

  const sendDirectMessage = useSendDirectMessage(directMemberId);
  const uploadDirectMessage = useUploadDirectMessage(directMemberId);
  const sendGroupMessage = useSendGroupMessage(groupConvUuid);
  const uploadGroupMessage = useUploadGroupMessage(groupConvUuid);
  const markDirectChatRead = useMarkDirectChatRead();

  function emitDirectTypingState(participantUserId: number, isTyping: boolean) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("direct_message:typing", { participantUserId, isTyping });
  }

  function emitGroupTypingState(conversationUuid: string, isTyping: boolean) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("group_message:typing", { conversationUuid, isTyping });
  }

  function stopTyping() {
    if (!isTypingRef.current || !typingTargetRef.current) return;
    if (typingTargetRef.current.type === "direct") {
      emitDirectTypingState(typingTargetRef.current.participantUserId, false);
    } else {
      emitGroupTypingState(typingTargetRef.current.conversationUuid, false);
    }
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value);

    if (!selected) return;

    if (selected.memberId === 0) {
      typingTargetRef.current = {
        type: "group",
        conversationUuid: selected.id,
      };
    } else if (selected.memberId) {
      typingTargetRef.current = {
        type: "direct",
        participantUserId: selected.memberId,
      };
    } else {
      return;
    }

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      if (typingTargetRef.current.type === "direct") {
        emitDirectTypingState(typingTargetRef.current.participantUserId, true);
      } else {
        emitGroupTypingState(typingTargetRef.current.conversationUuid, true);
      }
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1200);
  }

  function selectConversation(id: string) {
    setSelectedFiles([]);
    setReplyToMessage(null);
    setSelectedId(id);
    localStorage.setItem("vloq:selectedChatId", id);
  }

  const selectedMemberId = selected?.memberId;
  const selectedConversationId = selected?.id;

  useEffect(() => {
    // Sync ref so socket handlers can read the current DM partner without stale closures
    selectedMemberIdRef.current = selectedMemberId || undefined;
    stopTyping();
    if (!selected) {
      typingTargetRef.current = null;
    } else if (selected.memberId === 0) {
      typingTargetRef.current = {
        type: "group",
        conversationUuid: selected.id,
      };
    } else if (selected.memberId) {
      typingTargetRef.current = {
        type: "direct",
        participantUserId: selected.memberId,
      };
    } else {
      typingTargetRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, selectedConversationId]);

  useEffect(() => {
    if (
      !selected?.memberId ||
      selected.memberId === 0 ||
      isLoadingMessages ||
      !messagesData?.data?.length
    )
      return;
    if (!selected.unread || markDirectChatRead.isPending) return;

    markDirectChatRead.mutate(selected.memberId);
  }, [
    selected?.memberId,
    selected?.unread,
    isLoadingMessages,
    messagesData?.data?.length,
    markDirectChatRead,
  ]);

  useEffect(() => {
    if (!selected || selected.memberId !== 0 || isLoadingMessages) return;
    if (!selected.unread) return;

    queryClient.setQueriesData<DirectChatsResponse>(
      { queryKey: ["direct-chats"] },
      (current) => {
        if (!current) return current;

        return {
          ...current,
          data: current.data.map((chat) =>
            chat.type === "GROUP" && chat.uuid === selected.id
              ? { ...chat, unreadCount: 0 }
              : chat,
          ),
        };
      },
    );
    void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
  }, [selected, isLoadingMessages, queryClient]);

  useEffect(() => {
    if (!selected || isLoadingMessages || !messagesData?.data) return;
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [selected?.id, isLoadingMessages, messagesData?.data, queryClient]);

  async function sendVoiceMessage(file: File) {
    if (!selected) return;

    const pendingId = `pending-voice-${Date.now()}`;
    const objectUrl = URL.createObjectURL(file);

    const pendingMsg: ChatMessage = {
      uuid: pendingId,
      content: null,
      senderName: user?.name ?? "",
      isOwnMessage: true,
      createdAt: new Date().toISOString(),
      status: "sent",
      attachments: [
        {
          uuid: `pending-${file.name}-${file.size}`,
          attachmentType: "DOCUMENT",
          name: file.name,
          url: objectUrl,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ],
      isPending: true,
      uploadProgress: 0,
    };

    setPendingMessages((prev) => [...prev, pendingMsg]);

    const updateProgress = (pct: number) => {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.uuid === pendingId ? { ...m, uploadProgress: pct } : m,
        ),
      );
    };

    try {
      if (isGroup) {
        await uploadGroupMessage.mutateAsync({
          content: "",
          files: [file],
          mentions: [],
          onUploadProgress: updateProgress,
        });
      } else {
        if (!selected.memberId) return;
        await uploadDirectMessage.mutateAsync({
          content: "",
          files: [file],
          onUploadProgress: updateProgress,
        });
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPendingMessages((prev) => prev.filter((m) => m.uuid !== pendingId));
    }
  }

  async function sendMessage() {
    const content = message.trim();
    if ((!content && selectedFiles.length === 0) || !selected) return;

    stopTyping();

    const filesToUpload = [...selectedFiles];
    const replyToMessageUuid = replyToMessage?.uuid;
    setMessage("");
    setSelectedFiles([]);
    setReplyToMessage(null);

    if (filesToUpload.length === 0) {
      if (isGroup) {
        const mentions = buildMessageMentions(
          content,
          "participants" in selected ? (selected.participants ?? []) : [],
        );
        await sendGroupMessage.mutateAsync({ content, mentions, replyToMessageUuid });
      } else {
        if (!selected.memberId) return;
        await sendDirectMessage.mutateAsync({ content, replyToMessageUuid });
      }
      return;
    }

    // File upload — show optimistic message immediately
    const pendingId = `pending-${Date.now()}`;
    const objectUrls: string[] = [];

    const pendingAttachments = filesToUpload.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.push(url);
      return {
        uuid: `pending-${file.name}-${file.size}`,
        attachmentType: file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT",
        name: file.name,
        url,
        mimeType: file.type,
        sizeBytes: file.size,
      };
    });

    const pendingMsg: ChatMessage = {
      uuid: pendingId,
      content: content || null,
      senderName: user?.name ?? "",
      isOwnMessage: true,
      createdAt: new Date().toISOString(),
      status: "sent",
      attachments: pendingAttachments,
      isPending: true,
      uploadProgress: 0,
    };

    setPendingMessages((prev) => [...prev, pendingMsg]);

    const updateProgress = (pct: number) => {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.uuid === pendingId ? { ...m, uploadProgress: pct } : m,
        ),
      );
    };

    try {
      if (isGroup) {
        const mentions = buildMessageMentions(
          content,
          "participants" in selected ? (selected.participants ?? []) : [],
        );
        await uploadGroupMessage.mutateAsync({
          content,
          files: filesToUpload,
          mentions,
          replyToMessageUuid,
          onUploadProgress: updateProgress,
        });
      } else {
        if (!selected.memberId) return;
        await uploadDirectMessage.mutateAsync({
          content,
          files: filesToUpload,
          replyToMessageUuid,
          onUploadProgress: updateProgress,
        });
      }
    } finally {
      for (const url of objectUrls) URL.revokeObjectURL(url);
      setPendingMessages((prev) => prev.filter((m) => m.uuid !== pendingId));
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100">
      <ChatSidebar
        conversations={conversations}
        selectedId={effectiveSelectedId}
        isLoading={isLoading}
        isLoadingDirectChats={isLoadingDirectChats}
        isSidebarCollapsed={isSidebarCollapsed}
        search={search}
        activeFilter={activeFilter}
        isAdmin={isAdmin}
        user={user}
        onSelectConversation={selectConversation}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSearchChange={setSearch}
        onFilterChange={setActiveFilter}
        onCreateGroup={() => setShowCreateGroup(true)}
      />

      {isNotificationsRoute ? (
        <NotificationsPage />
      ) : selected ? (
        <ChatWindow
          selected={selected}
          message={message}
          messages={[
            ...(messagesData?.data ?? []).map((item) => ({
              uuid: item.uuid,
              content: item.content,
              senderName: item.senderName,
              isOwnMessage: item.isOwnMessage,
              createdAt: item.createdAt,
              status: item.status,
              readAt: item.readAt,
              attachments: item.attachments,
              replyTo: item.replyTo,
            })),
            ...pendingMessages,
          ]}
          isLoadingMessages={isLoadingMessages}
          selectedFiles={selectedFiles}
          isSendingMessage={
            sendDirectMessage.isPending ||
            uploadDirectMessage.isPending ||
            sendGroupMessage.isPending ||
            uploadGroupMessage.isPending
          }
          isPeerTyping={
            selected.memberId === 0
              ? groupTypingUsers.some(
                  (entry) => entry.conversationUuid === selected.id,
                )
              : typingUserIds.includes(selected.memberId)
          }
          typingNames={
            selected.memberId === 0
              ? groupTypingUsers
                  .filter((entry) => entry.conversationUuid === selected.id)
                  .map((entry) => entry.userName.split(" ")[0])
              : []
          }
          replyToMessage={replyToMessage}
          onMessageChange={handleMessageChange}
          onSendMessage={sendMessage}
          onSendVoiceMessage={sendVoiceMessage}
          onFileSelect={setSelectedFiles}
          onRemoveFile={(index) =>
            setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
          }
          onReply={setReplyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      ) : (
        <main className="flex-1 flex flex-col min-w-0">
          <EmptyChat />
        </main>
      )}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        currentUserUuid={user?.uuid}
      />
    </div>
  );
}
