import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type DirectChat = {
  uuid: string
  type: "DIRECT"
  createdAt: string
  updatedAt: string
  unreadCount: number
  otherParticipant: {
    id: number
    uuid: string
    name: string
    email: string
  }
  lastMessage: {
    uuid: string
    content: string | null
    type: string
    createdAt: string
  } | null
}

export type ChatListFilter = "ALL" | "UNREAD" | "GROUPS"

type DirectChatsResponse = {
  data: DirectChat[]
  total: number
  page: number
  limit: number
}

export function useDirectChats(page = 1, search = "", filter: ChatListFilter = "ALL") {
  return useQuery<DirectChatsResponse>({
    queryKey: ["direct-chats", page, search, filter],
    queryFn: async () => {
      const { data } = await api.get<DirectChatsResponse>("/chats/direct", {
        params: {
          page,
          limit: 50,
          search,
          filter,
        },
      })
      return data
    },
  })
}
