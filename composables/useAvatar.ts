// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: composables/useAvatar.ts
// DESCRIPTION: Shared avatar utilities with consistent validation,
//              error handling, and caching
// ============================================================

import type { Profile } from './useAdminAuth'

// Cache for avatar validation results
const avatarValidationCache = new Map<string, boolean>()
const avatarPreloadCache = new Map<string, Promise<boolean>>()

// Default avatar generation using UI Avatars API
export function generateDefaultAvatar(
  name: string | null = 'Ustadz',
  size: number = 160,
  background: string = '259869',
  color: string = 'ffffff'
): string {
  const encodedName = encodeURIComponent(name.trim() || 'Ustadz')
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${background}&color=${color}&size=${size}&bold=true&length=1`
}

// Consistent avatar URL validation (used across both pages)
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  
  // Consistent with existing validation: minimum length check
  if (url.length <= 15) return false
  
  // Check cache first
  const cacheKey = `valid:${url}`
  if (avatarValidationCache.has(cacheKey)) {
    return avatarValidationCache.get(cacheKey)!
  }
  
  // Basic URL validation
  let isValid = false
  try {
    const parsed = new URL(url)
    isValid = ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    isValid = false
  }
  
  // Cache the result
  avatarValidationCache.set(cacheKey, isValid)
  return isValid
}

// Preload avatar image with caching
export async function preloadAvatar(url: string): Promise<boolean> {
  if (!isValidAvatarUrl(url)) return false
  
  // Check preload cache
  if (avatarPreloadCache.has(url)) {
    return avatarPreloadCache.get(url)!
  }
  
  // Create preload promise
  const preloadPromise = (async () => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'force-cache'
      })
      return response.ok
    } catch (error) {
      console.warn('[useAvatar] Failed to preload avatar:', error)
      return false
    }
  })()
  
  // Cache the promise
  avatarPreloadCache.set(url, preloadPromise)
  
  return preloadPromise
}

// Get user initial from profile
export function getUserInitial(profile: Profile | null | undefined): string {
  return profile?.full_name?.charAt(0).toUpperCase() ?? 'U'
}

// Check if user should show avatar based on role
export function shouldShowAvatar(profile: Profile | null | undefined): boolean {
  const role = profile?.role?.toLowerCase()
  return role === 'admin_it' || role === 'ustadz'
}

// Get display avatar URL with validation
export function getDisplayAvatarUrl(
  profile: Profile | null | undefined,
  checkBroken: boolean = false
): string | null {
  const avatarUrl = profile?.avatar_url
  if (!isValidAvatarUrl(avatarUrl)) return null
  
  // If checking broken state, we'd need additional logic
  // For now, just return valid URLs
  return avatarUrl
}

// Main composable
export function useAvatar() {
  // Track broken avatars per URL
  const brokenAvatars = ref<Set<string>>(new Set())
  
  // Avatar error handler for template use
  function handleAvatarError(event: Event, avatarUrl?: string) {
    const img = event.target as HTMLImageElement
    
    // Hide the broken image
    img.style.display = 'none'
    
    // Mark as broken if URL provided
    if (avatarUrl) {
      brokenAvatars.value.add(avatarUrl)
    }
  }
  
  // Check if avatar is broken
  function isAvatarBroken(avatarUrl: string): boolean {
    return brokenAvatars.value.has(avatarUrl)
  }
  
  // Reset broken state for an avatar
  function resetAvatarBroken(avatarUrl: string) {
    brokenAvatars.value.delete(avatarUrl)
  }
  
  // Clear all broken states
  function clearBrokenAvatars() {
    brokenAvatars.value.clear()
  }
  
  // Get computed avatar display state
  function getAvatarDisplayState(profile: Profile | null | undefined) {
    const showAvatar = shouldShowAvatar(profile)
    const avatarUrl = getDisplayAvatarUrl(profile)
    const isBroken = avatarUrl ? isAvatarBroken(avatarUrl) : false
    const showImage = showAvatar && avatarUrl && !isBroken
    const initial = getUserInitial(profile)
    
    return {
      showAvatar,
      avatarUrl,
      isBroken,
      showImage,
      initial,
      defaultAvatar: generateDefaultAvatar(profile?.full_name)
    }
  }
  
  return {
    // Core utilities
    generateDefaultAvatar,
    isValidAvatarUrl,
    preloadAvatar,
    getUserInitial,
    shouldShowAvatar,
    getDisplayAvatarUrl,
    
    // State management
    handleAvatarError,
    isAvatarBroken,
    resetAvatarBroken,
    clearBrokenAvatars,
    
    // Convenience function
    getAvatarDisplayState,
    
    // Reactive state
    brokenAvatars: readonly(brokenAvatars)
  }
}