import type { AuthUser } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  const accessToken = useCookie<string | null>('access_token')

  if (!accessToken.value) {
    return navigateTo('/auth/login')
  }

  const user = useState<AuthUser | null>('auth_user', () => null)
  if (user.value) {
    return
  }

  const auth = useAuth()
  const fetched = await auth.fetchUser()
  if (!fetched) {
    return navigateTo('/auth/login')
  }
})