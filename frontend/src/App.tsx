import { AuthProvider } from "@/app/providers/AuthContext";
import { ThemeProvider } from "@/app/providers/ThemeContext";
import AppRoutes from '@/router/AppRoutes';
import Toast from "@/components/ui/Toast";
import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toast />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

export default App
