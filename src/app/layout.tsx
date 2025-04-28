import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

// Configuração da fonte Inter
const inter = Inter({ subsets: ['latin'] })

// Metadados da aplicação
export const metadata: Metadata = {
  title: 'Quiz Generator',
  description: 'Gerador de quizzes com IA',
}

// Layout principal
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                }
              },
              error: {
                duration: 4000,
                theme: {
                  primary: '#ff4b4b',
                }
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}