"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function useApi() {
  const { getToken } = useAuth();

  const api = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
          const data = await response.json();
          if (data.message) {
            message = Array.isArray(data.message)
              ? data.message.join(", ")
              : data.message;
          }
        } catch {}
        throw new ApiError(response.status, message);
      }

      return response.json();
    },
    [getToken],
  );

  return { api };
}
