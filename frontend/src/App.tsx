import { WalletProvider } from './context/WalletContext'
import { AccessControlDemo } from './components/AccessControlDemo'
import { Toaster } from 'sonner'

function App() {
  return (
    <WalletProvider>
      <AccessControlDemo />
      <Toaster position="top-right" richColors />
    </WalletProvider>
  )
}

export default App
