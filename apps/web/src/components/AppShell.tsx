import { NavLink, Outlet } from 'react-router-dom'
import { GitBranch, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/use-auth'

const navItems: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/pokedex', label: 'Pokédex' },
  { to: '/team-builder', label: 'Team Builder' },
  { to: '/teams', label: 'Meus times' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <NavLink className="group flex items-center gap-3" to="/">
            <span className="brand-mark transition-transform group-hover:-rotate-6">
              <img src="/pokelab-icon.png" alt="" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-lg font-extrabold tracking-tight">PokéLab</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.24em] text-slate-500">field notes / 001</span>
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="mobile-menu-button md:hidden" aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMobileOpen((open) => !open)} type="button">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
            {user ? <><span className="hidden max-w-40 truncate text-xs text-slate-500 sm:inline">{user.email}</span><Button variant="outline" size="sm" onClick={() => void signOut()}><LogOut size={15} /> Sair</Button></> : <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex"><NavLink to="/login"><Sparkles size={15} /> Entrar</NavLink></Button>}
          </div>
        </div>
        {mobileOpen && <nav className="mobile-nav md:hidden" aria-label="Navegação móvel">{navItems.map((item) => <NavLink key={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} onClick={() => setMobileOpen(false)} to={item.to}>{item.label}</NavLink>)}{!user && <NavLink className="nav-link" onClick={() => setMobileOpen(false)} to="/login">Entrar</NavLink>}</nav>}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <Outlet />
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>PokéLab / uma base limpa para pensar melhor seus times.</p>
        <span className="inline-flex items-center gap-2"><GitBranch size={14} /> Dados: PokéAPI · imagens oficiais</span>
      </footer>
    </div>
  )
}
