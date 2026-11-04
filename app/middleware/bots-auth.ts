import type { AuthUser } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware(async () => {
  const appPath = useAppPath()
  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')

  if (!accessToken.value && !refreshToken.value) {
    return navigateTo(appPath('/bots/overview'))
  }

  const auth = useAuth()

  if (!(await auth.ensureSession())) {
    return navigateTo(appPath('/bots/overview'))
  }

  const user = useState<AuthUser | null>('auth_user', () => null)
  if (user.value) {
    return
  }

  const fetched = await auth.fetchUser()
  if (!fetched) {
    return navigateTo(appPath('/bots/overview'))
  }
})
