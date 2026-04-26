# 🎨 WorkCore Launcher — Design System Completo

## 1. Filosofia Visual

O app segue a estética **Dark Premium** — uma interface escura, profunda, com toques vibrantes de laranja que comunicam energia e ação. O objetivo é transmitir **profissionalismo, controle e modernidade**.

---

## 2. Paleta de Cores

### Cores Principais
| Token | Hex | Uso |
|-------|-----|-----|
| `--primary` | `#0F172A` | Fundo do sidebar, titlebar, cabeçalho de tabelas |
| `--primary-light` | `#1E293B` | Superfícies de cards e containers |
| `--primary-lighter` | `#334155` | Scrollbar, elementos terciários |
| `--bg` | `#0B1120` | Fundo geral da aplicação (o mais escuro) |
| `--surface` | `#1E293B` | Cards, modals, barras de filtro |
| `--surface-hover` | `#253349` | Hover sobre superfícies |

### Cor de Destaque (Accent)
| Token | Hex | Uso |
|-------|-----|-----|
| `--accent` | `#F97316` | Botões primários, ícone ativo do sidebar, badges |
| `--accent-hover` | `#FB923C` | Hover em botões accent |
| `--accent-glow` | `rgba(249,115,22,0.3)` | Sombra glow em botões e nav ativo |

### Cores Semânticas
| Token | Hex | Uso |
|-------|-----|-----|
| `--success` / `--success-bg` | `#22C55E` / `rgba(34,197,94,0.12)` | Status "aprovado", botão aprovar, sync OK |
| `--warning` / `--warning-bg` | `#EAB308` / `rgba(234,179,8,0.12)` | Status "enviado", card pendentes, sync loading |
| `--danger` / `--danger-bg` | `#EF4444` / `rgba(239,68,68,0.12)` | Status "reprovado", botão reprovar, badge count, ícone PDF |

### Texto
| Token | Hex | Uso |
|-------|-----|-----|
| `--text` | `#F8FAFC` | Texto principal (quase branco) |
| `--text-secondary` | `#94A3B8` | Texto secundário (cinza claro) |
| `--text-muted` | `#64748B` | Labels, placeholders, datas (cinza médio) |

### Bordas
| Token | Valor | Uso |
|-------|-------|-----|
| `--border` | `rgba(148,163,184,0.1)` | Bordas sutis em cards, tabelas, separadores |

> [!TIP]
> As bordas são semi-transparentes (10% opacidade), criando separação visual sutil sem "cortar" a interface.

---

## 3. Tipografia

| Propriedade | Valor |
|-------------|-------|
| **Font Family** | `'Inter', -apple-system, sans-serif` |
| **Fonte via** | Google Fonts CDN |
| **Pesos usados** | 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold), 900 (Black) |

### Hierarquia de Tamanhos
| Elemento | Tamanho | Peso | Notas |
|----------|---------|------|-------|
| Títulos de página (`h1`) | 24px | 800 | `letter-spacing: -0.5px` (tracking apertado) |
| Valores de cards (stat) | 20px | 800 | Destaque numérico |
| Títulos de modal (`h2`) | 18px | 700 | — |
| Total monetário | 18px | 800 | Cor verde (`--success`) |
| Títulos de seção (`h3`) | 14-15px | 700 | Cards de gráfico, relatórios, config |
| Corpo de tabela | 13px | — | Cor `--text-secondary` |
| Botões | 13px | 600 | — |
| Labels/subtítulos | 12-13px | 500 | Cor `--text-muted` |
| Cabeçalho de tabela (`th`) | 11px | 600 | `UPPERCASE`, `letter-spacing: 0.5px` |
| Badges/tags | 10-11px | 600-700 | — |
| Timestamps | 9-11px | — | Cor muted |

---

## 4. Espaçamento & Layout

### Layout Principal
```
┌────────────────────────────────────────────────┐
│  TITLEBAR (40px height, draggable)             │
├──────────┬─────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT                      │
│ (220px)  │  (flex: 1, padding: 24px 32px)     │
│          │                                     │
│          │                                     │
│          │                                     │
└──────────┴─────────────────────────────────────┘
```

### Border Radius
| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `8px` | Botões, inputs, badges, nav items |
| `--radius` | `12px` | Cards, tabelas, containers |
| `--radius-lg` | `16px` | Modals |

### Sombras
| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow` | `0 4px 24px rgba(0,0,0,0.3)` | Hover de cards |
| `--shadow-lg` | `0 8px 40px rgba(0,0,0,0.4)` | Modals, toasts |

---

## 5. Componentes Visuais

### Sidebar
- Fundo: `--primary` com borda direita sutil
- Items: ícone Material + label, `13px`, rounded `8px`
- **Ativo**: gradiente laranja `135deg`, com `box-shadow` glow
- Badge de contagem: bolinha vermelha no canto direito
- Footer: indicador de sync (dot animado) + toggle auto-refresh

### Stat Cards (Dashboard)
- Grid de 4 colunas
- Ícone com fundo gradiente (cada cor diferente: azul, laranja, verde, amarelo)
- Hover: `translateY(-2px)` + border laranja + shadow
- Card "Pendentes": animação `pulse-card` (shadow amarelo pulsante)

### Tabelas de Dados
- Container com border-radius e borda sutil
- Header: fundo `--primary`, texto uppercase muted
- Rows: hover com `--surface-hover`
- Checkboxes customizados: appearance none, 18x18px, accent quando checked
- Status badges: pill-shaped com dot colorido + background semitransparente

### Modals
- Overlay: fundo escuro 70% + `backdrop-filter: blur(8px)`
- Animação de entrada: `slideUp` (opacity + translateY)
- Grid 2 colunas: comprovante à esquerda, detalhes à direita
- Botões de ação no footer com separador por borda

### Botões
| Variante | Estilo |
|----------|--------|
| `btn-accent` | Fundo laranja, hover com glow |
| `btn-success` | Fundo verde |
| `btn-danger` | Fundo vermelho |
| `btn-ghost` | Fundo surface, texto muted |
| `btn-sm` | Padding menor (5px 10px) |
| `btn-lg` | Padding maior (10px 20px) |

### Toasts (Notificações)
- Posição: bottom-right fixo
- Animação: `slideIn` (vem da direita)
- Variantes: success (verde), error (vermelho), info (surface)
- Auto-dismiss em 3.5s com fade out

---

## 6. Micro-Animações

| Animação | Duração | Easing | Onde é usada |
|----------|---------|--------|-------------|
| `fadeIn` | 0.3s | ease | Troca de páginas |
| `slideUp` | 0.3s | ease | Abertura de modals |
| `slideIn` | 0.3s | ease | Aparecimento de toasts |
| `pulse-dot` | 1s | infinite | Indicador de sync "sincronizando" |
| `pulse-card` | 2s | infinite | Card de pendentes |
| `spin` | 0.8s | linear infinite | Spinner de loading |
| hover `translateY(-2px)` | 0.2s | cubic-bezier | Cards, report cards |

### Transição Global
```css
--transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```
Usada em: botões, nav items, table rows, checkboxes, toggle switches, borders.

---

## 7. Ícones

| Biblioteca | Material Icons Round |
|------------|---------------------|
| **CDN** | Google Fonts |
| **Estilo** | `material-icons-round` (cantos arredondados) |

### Ícones Principais Usados
| Ícone | Contexto |
|-------|---------|
| `dashboard` | Nav Dashboard |
| `pending_actions` | Nav Pendentes |
| `check_circle` | Nav Aprovadas |
| `cancel` | Nav Reprovadas |
| `description` | Nav Relatórios |
| `settings` | Nav Configurações |
| `today` / `calendar_month` | Cards de data |
| `domain` | Obras |
| `warning` | Pendentes |
| `visibility` | Detalhes |
| `check` / `close` | Aprovar / Reprovar |
| `done_all` | Aprovar em massa |
| `rocket_launch` | Lançar despesas |
| `picture_as_pdf` | PDF / Comprovante PDF |
| `open_in_new` | Abrir comprovante |
| `download` | Baixar comprovante |
| `refresh` | Atualizar dados |

---

## 8. Scrollbar Customizado

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
```
Fino (6px), transparente no track, thumb discreto que fica mais visível no hover.

---

## 9. Responsividade

Breakpoint único: `max-width: 1100px`

| Componente | Desktop | Mobile |
|------------|---------|--------|
| Cards grid | 4 colunas | 2 colunas |
| Charts grid | 2 colunas | 1 coluna |
| Report options | 3 colunas | 1 coluna |
| Modal grid | 2 colunas | 1 coluna |

---

## 10. Gráficos (Chart.js)

| Propriedade | Valor |
|-------------|-------|
| Cor do texto | `#94A3B8` (text-secondary) |
| Cor de grid | `rgba(148,163,184,0.1)` |
| Fonte | Inter |
| **Gráfico Barras** | Cor laranja `rgba(249,115,22,0.7)`, border `#F97316`, `borderRadius: 6` |
| **Gráfico Linha** | Cor laranja com `fill: true`, `tension: 0.4` (curva suave), pontos laranja |

---

## 11. PDF Gerado

| Elemento | Estilo |
|----------|--------|
| Header bar | Fundo `#0F172A` (35px), com barra laranja `#F97316` (2px) |
| Título | Branco, 18px, bold |
| Tabela | Header azul escuro com texto branco, linhas alternadas cinza claro |
| Footer | Texto cinza 8px com copyright e paginação |
