import React, { useEffect, useState } from 'react'

export const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme')
        if (saved === 'dark' || saved === 'light') return saved
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    useEffect(() => {
        const root = window.document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
    }

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
            title={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع المضيء'}
        >
            {theme === 'light' ? (
                <div className="flex items-center gap-2">
                    <span>🌙</span>
                    <span className="text-xs font-bold hidden md:inline">ليلي</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <span>☀️</span>
                    <span className="text-xs font-bold hidden md:inline">مضيء</span>
                </div>
            )}
        </button>
    )
}
