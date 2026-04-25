"use client"

import { io, type Socket } from "socket.io-client"
import { API_BASE_URL } from "@/lib/api"

export function createChatSocket(token: string) {
  return io(API_BASE_URL, {
    transports: ["websocket"],
    auth: {
      token,
    },
  })
}

export type ChatSocket = Socket
