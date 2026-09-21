import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { Login } from './pages/Login'
import { Radio } from './pages/Radio'
import { Register } from './pages/Register'
import { Verify } from './pages/Verify'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Radio />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
    </Routes>
  )
}

export default App
