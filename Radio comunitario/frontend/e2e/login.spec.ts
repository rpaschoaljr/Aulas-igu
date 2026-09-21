import { expect, test, type APIRequestContext } from '@playwright/test'

const MAILPIT_API = 'http://localhost:8025'

function uniqueSuffix(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 7)}`
}

interface MailpitMessage {
  ID: string
  To: { Address: string }[]
}

async function waitForVerificationToken(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const list = (await (
      await request.get(`${MAILPIT_API}/api/v1/messages`)
    ).json()) as { messages: MailpitMessage[] }
    const found = list.messages.find((m) =>
      m.To.some((recipient) => recipient.Address === email),
    )
    if (found) {
      const message = (await (
        await request.get(`${MAILPIT_API}/api/v1/message/${found.ID}`)
      ).json()) as { Text: string }
      const match = message.Text.match(
        /http:\/\/localhost:\d+\/verify\?token=\S+/,
      )
      if (match) {
        return match[0]
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('token de verificação não encontrado no Mailpit')
}

test('página de login renderiza', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Rádio Comunitária',
  )
  await expect(page.getByLabel('Apelido ou e-mail')).toBeVisible()
  await expect(page.getByLabel('Senha')).toBeVisible()
})

test('cadastro mostra mensagem de verificação', async ({ page }) => {
  const suffix = uniqueSuffix()
  await page.goto('/register')
  await page.getByLabel('Apelido').fill(`user${suffix}`)
  await page.getByLabel('E-mail').fill(`user${suffix}@example.com`)
  await page.getByLabel('Senha').fill('Senha1@forte')
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByText(/verificação/i)).toBeVisible()
})

test('fluxo completo: cadastro, verificação e login', async ({ page, request }) => {
  const suffix = uniqueSuffix()
  const nickname = `user${suffix}`
  const email = `${nickname}@example.com`
  const password = 'Senha1@forte'

  await page.goto('/register')
  await page.getByLabel('Apelido').fill(nickname)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Cadastrar' }).click()
  await expect(page.getByText(/verificação/i)).toBeVisible()

  const verifyUrl = await waitForVerificationToken(request, email)
  await page.goto(verifyUrl)
  await expect(page.getByText(/verificado/i)).toBeVisible()

  await page.goto('/login')
  await page.getByLabel('Apelido ou e-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})
