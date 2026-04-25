import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type DirectMessage = {
  uuid: string
  conversationUuid: string
  senderId: number
  senderUuid: string
  senderName: string
  content: string | null
  type: string
  createdAt: string
  updatedAt: string
  isOwnMessage: boolean
  status: "sent" | "read"
}

type DirectMessagesResponse = {
  data: DirectMessage[]
}

type SendDirectMessageResponse = {
  message: string
  data: DirectMessage
}

export function useDirectMessages(participantUserId?: number) {
  return useQuery<DirectMessagesResponse>({
    queryKey: ["direct-messages", participantUserId],
    enabled: typeof participantUserId === "number",
    queryFn: async () => {
      const { data } = await api.get<DirectMessagesResponse>("/chats/direct/messages", {
        params: { participantUserId },
      })
      return data
    },
  })
}

export function useSendDirectMessage(participantUserId?: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<SendDirectMessageResponse>("/chats/direct/messages", {
        participantUserId,
        content,
      })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["direct-messages", participantUserId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["direct-chats"],
      })
    },
  })
}

export function useMarkDirectChatRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (participantUserId: number) => {
      const { data } = await api.post<{ message: string }>("/chats/direct/messages/read", {
        participantUserId,
      })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["direct-chats"],
      })
    },
  })
}
