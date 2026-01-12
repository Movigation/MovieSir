import { AuthProvider } from "@/app/providers/AuthContext";
import { ThemeProvider } from "@/app/providers/ThemeContext";
import AppRoutes from '@/router/AppRoutes';
import Toast from "@/components/ui/Toast";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <Toast />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
