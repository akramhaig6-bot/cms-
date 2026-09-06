import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import AdminApp from './admin/AdminApp'
import ClientArea from './ClientArea'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/client/*" element={<ClientArea />} />
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
