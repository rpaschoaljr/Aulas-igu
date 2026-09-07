# Design System

Sistema de design do front-end da Rádio Comunitária. Toda estilização segue este arquivo: nenhum valor de cor, margem, fonte ou raio é hardcoded — sempre via token CSS.

## Stack de estilização

- **CSS Variables** para design tokens.
- **CSS Modules** para estilos por componente.
- **Proibido:** Tailwind e valores hardcoded nos componentes.

## Tema

Dois temas (`light` e `dark`) definidos por `data-theme` no `<html>`.

Mecanismo de seleção:
- Modos: `light`, `dark`, `system`.
- Padrão: `system` → segue `prefers-color-scheme` via `window.matchMedia`.
- Troca manual: toggle alterna entre `light` / `dark` / `system`, persistido em `localStorage`.

## Tokens de cor — "Rádio vinil"

### Light (fundo quente, não-branco)

| Token | Valor |
|---|---|
| `--bg` | `#F4EFE6` |
| `--surface` | `#FFFDF8` |
| `--surface-alt` | `#EAE3D6` |
| `--text` | `#2B2520` |
| `--text-muted` | `#6E655B` |
| `--border` | `#D9D0C0` |
| `--primary` | `#C94B4B` |
| `--primary-hover` | `#A83A3A` |
| `--accent` | `#E8A94E` |
| `--success` | `#4E8A6A` |
| `--danger` | `#C0392B` |

### Dark (vinil escuro quente)

| Token | Valor |
|---|---|
| `--bg` | `#1E1A16` |
| `--surface` | `#28231E` |
| `--surface-alt` | `#332D26` |
| `--text` | `#EDE6DA` |
| `--text-muted` | `#A79B8B` |
| `--border` | `#453C31` |
| `--primary` | `#E06A6A` |
| `--primary-hover` | `#C94B4B` |
| `--accent` | `#F0B55C` |
| `--success` | `#6FB08A` |
| `--danger` | `#E06A6A` |

## Escalas de tokens

### Espaçamento
`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-5: 24px` · `--space-6: 32px` · `--space-7: 48px` · `--space-8: 64px`

### Tipografia
`--font-base: system-ui, sans-serif` · `--text-xs: 12px` · `--text-sm: 14px` · `--text-md: 16px` · `--text-lg: 20px` · `--text-xl: 24px` · `--text-2xl: 32px`

### Raio e sombra
`--radius-sm: 4px` · `--radius-md: 8px` · `--radius-lg: 12px` · `--shadow-sm: 0 1px 2px rgba(0,0,0,0.08)` · `--shadow-md: 0 4px 12px rgba(0,0,0,0.12)`

## Estrutura de arquivos (futura)

```
src/
  styles/
    tokens.css   # variáveis light + dark
    base.css     # reset + estilos base
  components/
    ThemeToggle
    LoginForm
    RegisterForm
    PlayerBar
    QueueList
    SearchBar
    HistoryList
    MuteButton
  pages/
    Login
    Radio
```
