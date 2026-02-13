import service from '@/api'
import { create } from 'zustand'
import type { GetProfileDtoOut } from '@interfaces/dto/auth'

export type UserProfile = GetProfileDtoOut & { name: string }

interface ProfileState {
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  clearProfile: () => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile: UserProfile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}))

export async function fetchAndStoreProfile() {
  try {
    const profile = await service.auth.profile()
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
    const profileWithName: UserProfile = { ...profile, name }
    useProfileStore.getState().setProfile(profileWithName)
    return profileWithName
  } catch (error) {
    console.error('Failed to fetch and store profile:', error)
    useProfileStore.getState().clearProfile()
  }
}

export function clearProfileStore() {
  useProfileStore.getState().clearProfile()
}
