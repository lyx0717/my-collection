import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadProfile, saveProfile, type Profile } from '../lib/profile'

interface ProfileContextValue {
  profile: Profile
  updateProfile: (patch: Partial<Profile>) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile())

  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }))
  }, [])

  const value = useMemo(() => ({ profile, updateProfile }), [profile, updateProfile])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile 必须在 ProfileProvider 内使用')
  return ctx
}
