import axios from "axios";
import { AUTH_TOKEN_COOKIE } from "@/lib/auth";

const API_URLS_BY_ENVIRONMENT: Record<string, string> = {
  LOCAL: "http://localhost:4000/",
};

const environment = process.env.NEXT_PUBLIC_ENVIRONMENT?.toUpperCase() ?? "LOCAL";

export const api = axios.create({
  baseURL: API_URLS_BY_ENVIRONMENT[environment] ?? API_URLS_BY_ENVIRONMENT.LOCAL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${AUTH_TOKEN_COOKIE}=([^;]*)`)
    );
    const token = match?.[1];
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
