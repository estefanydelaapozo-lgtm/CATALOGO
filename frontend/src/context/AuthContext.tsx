// src/context/AuthContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null; // <-- estado para el correo
  token: string | null; // <-- token que devuelve la API en POST /api/login
  login: (email: string, token: string) => void; // <-- ahora recibe el correo y el token de la API
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null); // <-- Estado local
  const [token, setToken] = useState<string | null>(null);

  const login = (email: string, token: string) => {
    setIsAuthenticated(true);
    setUserEmail(email); // Guardamos el correo
    setToken(token); // Guardamos el token recibido del backend
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserEmail(null); // Limpiamos el correo al salir
    setToken(null); // Y el token
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
