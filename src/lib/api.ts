import axios from "axios";

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
