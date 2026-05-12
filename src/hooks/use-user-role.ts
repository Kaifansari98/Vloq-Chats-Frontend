"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type UserRoleResponse = {
  userTypeCode: string;
};

export function useUserRole(initialRoleCode?: string | null) {
  const [userTypeCode, setUserTypeCode] = useState(initialRoleCode ?? "");

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const response = await api.get<UserRoleResponse>("/users/role");

        if (isMounted) {
          setUserTypeCode(response.data.userTypeCode);
        }
      } catch {
        if (isMounted) {
          setUserTypeCode(initialRoleCode ?? "");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialRoleCode]);

  return {
    userTypeCode,
    isAdmin: userTypeCode === "ADMIN",
  };
}
