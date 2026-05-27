interface PasswordCredentialData {
  email: string
  password: string
}

interface PasswordCredentialInit {
  id: string
  password: string
  name: string
}

interface StoredPasswordCredential extends Credential {
  id: string
  password: string
}

interface PasswordCredentialConstructor {
  new (data: PasswordCredentialInit): StoredPasswordCredential
}

interface PasswordCredentialRequestOptions extends CredentialRequestOptions {
  password?: boolean
}

function isPasswordCredentialSupported(): boolean {
  return import.meta.client
    && 'credentials' in navigator
    && 'PasswordCredential' in window
}

export function useBrowserCredentials() {
  async function storeLogin(email: string, password: string): Promise<void> {
    if (!isPasswordCredentialSupported()) {
      return
    }

    try {
      const PasswordCredentialCtor = (window as unknown as {
        PasswordCredential: PasswordCredentialConstructor
      }).PasswordCredential

      const credential = new PasswordCredentialCtor({
        id: email,
        password,
        name: email,
      })

      await navigator.credentials.store(credential)
    } catch {
      // Пользователь отклонил или браузер не сохранил
    }
  }

  async function loadLogin(): Promise<PasswordCredentialData | null> {
    if (!isPasswordCredentialSupported()) {
      return null
    }

    try {
      const credential = await navigator.credentials.get({
        password: true,
        mediation: 'optional',
      } as PasswordCredentialRequestOptions) as StoredPasswordCredential | null

      if (!credential?.id || !credential.password) {
        return null
      }

      return {
        email: credential.id,
        password: credential.password,
      }
    } catch {
      return null
    }
  }

  return {
    storeLogin,
    loadLogin,
    isSupported: isPasswordCredentialSupported,
  }
}
