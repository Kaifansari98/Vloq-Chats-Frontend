"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useOrganizationMembers,
  type Member,
} from "@/hooks/use-organization-members";
import { useDirectChats } from "@/hooks/use-direct-chats";
import {
  useDirectMessages,
  useMarkDirectChatRead,
  useSendDirectMessage,
} from "@/hooks/use-direct-messages";
import { EmptyChat } from "@/components/chat/empty-chat";
import {
  ChatWindow,
  type ChatConversation,
} from "@/components/chat/chat-window";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { createChatSocket, type ChatSocket } from "@/lib/socket";

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
  } satisfies ChatConversation;
}

export function ChatLayout() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
  const socketRef = useRef<ChatSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingParticipantRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);
  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!token) return;

    const socket = createChatSocket(token);
    socketRef.current = socket;

    socket.on("direct_message:new", (incomingMessage: { senderId: number }) => {
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
      setTypingUserIds((prev) =>
        prev.filter((userId) => userId !== incomingMessage.senderId),
      );
    });

    socket.on("direct_message:read", () => {
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
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

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token, queryClient]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const { data, isLoading } = useOrganizationMembers(1, debouncedSearch);
  const { data: directChatsData, isLoading: isLoadingDirectChats } =
    useDirectChats(1, debouncedSearch);
  const directChatsByMemberUuid = new Map(
    (directChatsData?.data ?? []).map((chat) => [
      chat.otherParticipant.uuid,
      chat,
    ]),
  );

  const conversations = (data?.data ?? [])
    .filter((member) => member.uuid !== user?.uuid)
    .map((member) =>
      memberToConversation(member, directChatsByMemberUuid.get(member.uuid)),
    )
    .map((conversation) => ({
      ...conversation,
      online: onlineUserIds.includes(conversation.memberId),
      isTyping: typingUserIds.includes(conversation.memberId),
    }))
    .sort((a, b) => {
      if (a.latestActivityAt !== b.latestActivityAt) {
        return b.latestActivityAt - a.latestActivityAt;
      }
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.name.localeCompare(b.name);
    });

  const selected = conversations.find((c) => c.id === selectedId);
  const { data: messagesData, isLoading: isLoadingMessages } =
    useDirectMessages(selected?.memberId);
  const sendDirectMessage = useSendDirectMessage(selected?.memberId);
  const markDirectChatRead = useMarkDirectChatRead();

  function emitTypingState(participantUserId: number, isTyping: boolean) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("direct_message:typing", { participantUserId, isTyping });
  }

  function stopTyping() {
    if (!isTypingRef.current || !typingParticipantRef.current) return;
    emitTypingState(typingParticipantRef.current, false);
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value);

    if (!selected?.memberId) return;

    typingParticipantRef.current = selected.memberId;

    if (!value.trim()) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      emitTypingState(selected.memberId, true);
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1200);
  }

  useEffect(() => {
    if (isLoading || isLoadingDirectChats || hasAutoSelectedRef.current) return;
    if (conversations.length === 0) return;

    hasAutoSelectedRef.current = true;

    const stored = localStorage.getItem("vloq:selectedChatId");
    const match = stored ? conversations.find((c) => c.id === stored) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(match ? match.id : conversations[0].id);
  }, [isLoading, isLoadingDirectChats, conversations]);

  function selectConversation(id: string) {
    setSelectedId(id);
    localStorage.setItem("vloq:selectedChatId", id);
  }

  const selectedMemberId = selected?.memberId;

  useEffect(() => {
    stopTyping();
    typingParticipantRef.current = selectedMemberId ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId]);

  useEffect(() => {
    if (!selected?.memberId || isLoadingMessages || !messagesData?.data?.length)
      return;

    const hasUnreadMessages = conversations.some(
      (c) => c.memberId === selected.memberId && c.unread > 0,
    );

    if (!hasUnreadMessages || markDirectChatRead.isPending) return;

    markDirectChatRead.mutate(selected.memberId);
  }, [
    conversations,
    isLoadingMessages,
    markDirectChatRead,
    messagesData?.data?.length,
    selected?.memberId,
  ]);

  async function sendMessage() {
    const content = message.trim();
    if (!content || !selected?.memberId) return;
    stopTyping();
    await sendDirectMessage.mutateAsync(content);
    setMessage("");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100">
      <ChatSidebar
        conversations={conversations}
        selectedId={selectedId}
        isLoading={isLoading}
        isLoadingDirectChats={isLoadingDirectChats}
        isSidebarCollapsed={isSidebarCollapsed}
        search={search}
        user={user}
        onSelectConversation={selectConversation}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSearchChange={setSearch}
      />

      {selected ? (
        <ChatWindow
          selected={selected}
          message={message}
          messages={(messagesData?.data ?? []).map((item) => ({
            uuid: item.uuid,
            content: item.content,
            senderName: item.senderName,
            isOwnMessage: item.isOwnMessage,
            createdAt: item.createdAt,
            status: item.status,
          }))}
          isLoadingMessages={isLoadingMessages}
          isSendingMessage={sendDirectMessage.isPending}
          isPeerTyping={typingUserIds.includes(selected.memberId)}
          onMessageChange={handleMessageChange}
          onSendMessage={sendMessage}
        />
      ) : (
        <main className="flex-1 flex flex-col min-w-0">
          <EmptyChat />
        </main>
      )}
    </div>
  );
}
