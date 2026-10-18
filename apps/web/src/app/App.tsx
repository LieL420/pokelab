import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { HomePage } from '@/routes/HomePage'

const AuthPage = lazy(() => import('@/routes/AuthPage').then((module) => ({ default: module.AuthPage })))
const MyTeamsPage = lazy(() => import('@/routes/MyTeamsPage').then((module) => ({ default: module.MyTeamsPage })))
const PokedexPage = lazy(() => import('@/routes/PokedexPage').then((module) => ({ default: module.PokedexPage })))
const PokemonDetailPage = lazy(() => import('@/routes/PokemonDetailPage').then((module) => ({ default: module.PokemonDetailPage })))
const TeamBuilderPage = lazy(() => import('@/routes/TeamBuilderPage').then((module) => ({ default: module.TeamBuilderPage })))
const PasswordRecoveryPage = lazy(() => import('@/routes/PasswordRecoveryPage').then((module) => ({ default: module.PasswordRecoveryPage })))

function RouteFallback() {
  return <div className="detail-loading"><div className="detail-loading-orb" /><p>Preparando a bancada…</p></div>
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="pokedex" element={<PokedexPage />} />
          <Route path="pokedex/:identifier" element={<PokemonDetailPage />} />
          <Route path="team-builder" element={<TeamBuilderPage />} />
          <Route path="team-builder/:teamId" element={<TeamBuilderPage />} />
          <Route path="teams" element={<MyTeamsPage />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route path="forgot-password" element={<PasswordRecoveryPage mode="request" />} />
          <Route path="reset-password" element={<PasswordRecoveryPage mode="update" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
