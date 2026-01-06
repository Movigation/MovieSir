import { createContext, useContext, useState, useLayoutEffect } from 'react';
type ThemeContextType = {
    isDark: boolean;
    toggleTheme: () => void;
};
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem("theme") === "dark";
    });

    // useLayoutEffect: 브라우저 페인트 전에 동기적으로 실행 (useEffect보다 빠름)
    useLayoutEffect(() => {
        const root = document.documentElement;
        const body = document.body;

        if (isDark) {
            root.classList.add("dark");
            // body 배경색 즉시 설정
            body.style.backgroundColor = '#111827';
            body.style.color = 'white';
        } else {
            root.classList.remove("dark");
            // body 배경색 즉시 설정
            body.style.backgroundColor = '#f9fafb';
            body.style.color = 'black';
        }
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);
    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};