import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type AllowedIp = {
  id: number
  uuid: string
  ipAddress: string
  label: string | null
  createdAt: string
}

type OrgSettingsResponse = {
  data: { isIpRestrictionEnabled: boolean }
}

type AllowedIpsResponse = {
  data: AllowedIp[]
}

export function useMyIp(enabled: boolean) {
  return useQuery<{ ip: string }>({
    queryKey: ["my-ip"],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ ip: string }>("/organization/my-ip")
      return data
    },
  })
}

export function useOrgSettings() {
  return useQuery<OrgSettingsResponse>({
    queryKey: ["org-settings"],
    queryFn: async () => {
      const { data } = await api.get<OrgSettingsResponse>("/organization/settings")
      return data
    },
  })
}

export function useUpdateIpRestriction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.patch("/organization/settings", { isIpRestrictionEnabled: enabled })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-settings"] })
    },
  })
}

export function useAllowedIps(enabled: boolean) {
  return useQuery<AllowedIpsResponse>({
    queryKey: ["org-ip-restrictions"],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<AllowedIpsResponse>("/organization/ip-restrictions")
      return data
    },
  })
}

export function useAddAllowedIp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { ipAddress: string; label?: string }) => {
      const { data } = await api.post<{ data: AllowedIp }>("/organization/ip-restrictions", payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-ip-restrictions"] })
    },
  })
}

export function useRemoveAllowedIp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (uuid: string) => {
      await api.delete(`/organization/ip-restrictions/${uuid}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-ip-restrictions"] })
    },
  })
}
