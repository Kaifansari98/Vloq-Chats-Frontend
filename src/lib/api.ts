import axios from "axios";
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/lib/auth";

const API_URLS_BY_ENVIRONMENT: Record<string, string> = {
  LOCAL: "http://localhost:4000/",
  PRODUCTION: "https://api-chat.nexyn.com/",
};

const environment =
  process.env.NEXT_PUBLIC_ENVIRONMENT?.toUpperCase() ?? "LOCAL";

export const API_BASE_URL =
  API_URLS_BY_ENVIRONMENT[environment] ?? API_URLS_BY_ENVIRONMENT.LOCAL;

export const api = axios.create({
  baseURL: API_BASE_URL,
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

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

function clearAuthAndRedirect() {
  if (typeof document === "undefined") return;

  const past = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

  document.cookie = `${AUTH_TOKEN_COOKIE}=; ${past}`;
  document.cookie = `${AUTH_USER_COOKIE}=; ${past}`;

  window.location.href = "/login";
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      clearAuthAndRedirect();
    }

    return Promise.reject(error);
  },
);