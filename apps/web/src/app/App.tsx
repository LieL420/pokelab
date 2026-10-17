import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { AuthPage } from '@/routes/AuthPage'
import { HomePage } from '@/routes/HomePage'
import { MyTeamsPage } from '@/routes/MyTeamsPage'
import { PokedexPage } from '@/routes/PokedexPage'
import { PokemonDetailPage } from '@/routes/PokemonDetailPage'
import { TeamBuilderPage } from '@/routes/TeamBuilderPage'
import { PasswordRecoveryPage } from '@/routes/PasswordRecoveryPage'

function App() {
  return (
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
  )
}

export default App
