import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ContractSignPage } from './pages/ContractSignPage'
import { InvalidSigningLinkPage } from './components/SigningStatusPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/sign/:token" element={<ContractSignPage />} />
        <Route path="*" element={<InvalidSigningLinkPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
