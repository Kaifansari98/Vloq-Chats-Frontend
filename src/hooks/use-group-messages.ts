import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { DirectMessage } from "./use-direct-messages"

type GroupMessagesResponse = {
  data: DirectMessage[]
}

type SendGroupMessageResponse = {
  message: string
  data: DirectMessage
}

export function useGroupMessages(conversationUuid?: string) {
  return useQuery<GroupMessagesResponse>({
    queryKey: ["group-messages", conversationUuid],
    enabled: typeof conversationUuid === "string" && conversationUuid.length > 0,
    queryFn: async () => {
      const { data } = await api.get<GroupMessagesResponse>(
        `/chats/group/${conversationUuid}/messages`,
      )
      return data
    },
  })
}

export function useSendGroupMessage(conversationUuid?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      content,
      mentions,
      replyToMessageUuid,
    }: {
      content: string
      mentions?: Array<{ mentionedUserId: number; offset: number; length: number }>
      replyToMessageUuid?: string
    }) => {
      const { data } = await api.post<SendGroupMessageResponse>(
        `/chats/group/${conversationUuid}/messages`,
        { content, mentions, ...(replyToMessageUuid && { replyToMessageUuid }) },
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-messages"] })
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] })
    },
  })
}

export function useUploadGroupMessage(conversationUuid?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      content,
      files,
      mentions,
      replyToMessageUuid,
      onUploadProgress,
    }: {
      content: string
      files: File[]
      mentions?: Array<{ mentionedUserId: number; offset: number; length: number }>
      replyToMessageUuid?: string
      onUploadProgress?: (pct: number) => void
    }) => {
      const formData = new FormData()
      if (content.trim()) formData.append("content", content.trim())
      if (mentions && mentions.length > 0) {
        formData.append("mentions", JSON.stringify(mentions))
      }
      if (replyToMessageUuid) formData.append("replyToMessageUuid", replyToMessageUuid)
      for (const file of files) formData.append("files", file)

      const { data } = await api.post<SendGroupMessageResponse>(
        `/chats/group/${conversationUuid}/messages/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (event.lengthComputable && event.total) {
              onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
            }
          },
        },
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-messages"] })
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] })
    },
  })
}
