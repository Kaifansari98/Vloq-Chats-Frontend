import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export type Member = {
  id: number
  uuid: string
  name: string
  email: string
  isActive: boolean
  organizationId: number
}

type MembersResponse = {
  data: Member[]
  total: number
  page: number
  limit: number
}

export function useOrganizationMembers(page = 1, search = "") {
  return useQuery<MembersResponse>({
    queryKey: ["organization-members", page, search],
    queryFn: async () => {
      const { data } = await api.post<MembersResponse>("/users/members", {
        page,
        limit: 25,
        search,
      })
      return data
    },
  })
}
