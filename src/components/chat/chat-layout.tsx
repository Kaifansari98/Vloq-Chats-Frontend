"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
} from "@/components/chat/chat-window";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { CreateGroupModal } from "@/components/chat/create-group-modal";
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
    })),
  };
}

export function ChatLayout() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem("vloq:selectedChatId"),
  );
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTargetRef = useRef<
    { type: "direct"; participantUserId: number } | { type: "group"; conversationUuid: string } | null
  >(null);
  const isTypingRef = useRef(false);

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
                unreadCount: isOwnMessage || isActiveGroup
                  ? 0
                  : chat.unreadCount + 1,
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
  const directChatsByMemberUuid = new Map(
    (directChatsData?.data ?? [])
      .filter((chat): chat is DirectChat => chat.type === "DIRECT")
      .map((chat) => [chat.otherParticipant.uuid, chat]),
  );

  const baseConversations =
    activeFilter === "ALL"
      ? (data?.data ?? [])
          .filter((member) => member.uuid !== user?.uuid)
          .map((member) =>
            memberToConversation(
              member,
              directChatsByMemberUuid.get(member.uuid),
            ),
          )
      : (directChatsData?.data ?? []).map((chat, index) =>
          chat.type === "GROUP"
            ? groupChatToConversation(chat, GRADIENTS[index % GRADIENTS.length])
            : directChatToConversation(
                chat,
                GRADIENTS[chat.otherParticipant.id % GRADIENTS.length],
              ),
        );

  const conversations = baseConversations
    .map((conversation) => ({
      ...conversation,
      online: onlineUserIds.includes(conversation.memberId),
      isTyping: conversation.memberId === 0
        ? groupTypingUsers.some((entry) => entry.conversationUuid === conversation.id)
        : typingUserIds.includes(conversation.memberId),
      onlineParticipantNames: (conversation as ChatConversation).participants
        ?.filter((p) => onlineUserIds.includes(p.id))
        .map((p) => p.name.split(" ")[0]),
      onlineParticipants: (conversation as ChatConversation).participants
        ?.filter((p) => onlineUserIds.includes(p.id)),
    }))
    .sort((a, b) => {
      if (a.latestActivityAt !== b.latestActivityAt) {
        return b.latestActivityAt - a.latestActivityAt;
      }
      if (a.unread !== b.unread) return b.unread - a.unread;
      return a.name.localeCompare(b.name);
    });

  const effectiveSelectedId =
    selectedId && conversations.some((conversation) => conversation.id === selectedId)
      ? selectedId
      : activeFilter === "ALL"
        ? (conversations[0]?.id ?? null)
        : null;
  const selected = conversations.find((c) => c.id === effectiveSelectedId);
  const isGroup = selected?.memberId === 0;
  const directMemberId = !isGroup && selected?.memberId ? selected.memberId : undefined;
  const groupConvUuid = isGroup ? selected?.id : undefined;

  const { data: directMessagesData, isLoading: isLoadingDirectMessages } =
    useDirectMessages(directMemberId);
  const { data: groupMessagesData, isLoading: isLoadingGroupMessages } =
    useGroupMessages(groupConvUuid);

  const messagesData = isGroup ? groupMessagesData : directMessagesData;
  const isLoadingMessages = isGroup ? isLoadingGroupMessages : isLoadingDirectMessages;

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
      typingTargetRef.current = { type: "group", conversationUuid: selected.id };
    } else if (selected.memberId) {
      typingTargetRef.current = { type: "direct", participantUserId: selected.memberId };
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
    setSelectedId(id);
    localStorage.setItem("vloq:selectedChatId", id);
  }

  const selectedMemberId = selected?.memberId;
  const selectedConversationId = selected?.id;

  useEffect(() => {
    stopTyping();
    if (!selected) {
      typingTargetRef.current = null;
    } else if (selected.memberId === 0) {
      typingTargetRef.current = { type: "group", conversationUuid: selected.id };
    } else if (selected.memberId) {
      typingTargetRef.current = { type: "direct", participantUserId: selected.memberId };
    } else {
      typingTargetRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemberId, selectedConversationId]);

  useEffect(() => {
    if (!selected?.memberId || selected.memberId === 0 || isLoadingMessages || !messagesData?.data?.length) return;
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

  async function sendMessage() {
    const content = message.trim();
    if ((!content && selectedFiles.length === 0) || !selected) return;

    stopTyping();

    if (isGroup) {
      if (selectedFiles.length > 0) {
        await uploadGroupMessage.mutateAsync({ content, files: selectedFiles });
      } else if (content) {
        await sendGroupMessage.mutateAsync(content);
      }
    } else {
      if (!selected.memberId) return;
      if (selectedFiles.length > 0) {
        await uploadDirectMessage.mutateAsync({ content, files: selectedFiles });
      } else {
        await sendDirectMessage.mutateAsync(content);
      }
    }

    setMessage("");
    setSelectedFiles([]);
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
        user={user}
        onSelectConversation={selectConversation}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSearchChange={setSearch}
        onFilterChange={setActiveFilter}
        onCreateGroup={() => setShowCreateGroup(true)}
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
            attachments: item.attachments,
          }))}
          isLoadingMessages={isLoadingMessages}
          selectedFiles={selectedFiles}
          isSendingMessage={
            sendDirectMessage.isPending || uploadDirectMessage.isPending ||
            sendGroupMessage.isPending || uploadGroupMessage.isPending
          }
          isPeerTyping={selected.memberId === 0
            ? groupTypingUsers.some((entry) => entry.conversationUuid === selected.id)
            : typingUserIds.includes(selected.memberId)}
          typingNames={selected.memberId === 0
            ? groupTypingUsers
                .filter((entry) => entry.conversationUuid === selected.id)
                .map((entry) => entry.userName.split(" ")[0])
            : []}
          onMessageChange={handleMessageChange}
          onSendMessage={sendMessage}
          onFileSelect={setSelectedFiles}
          onRemoveFile={(index) =>
            setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
          }
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
