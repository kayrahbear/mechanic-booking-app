import { useAuth } from '../lib/auth-context';
import { useTheme } from '../lib/theme-context';
import { useNavigation } from '../lib/navigation-context';

export default function DashboardHeader() {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { toggleSidebar, activeSection } = useNavigation();

    const getSectionTitle = (section: string) => {
        switch (section) {
            case 'scheduling': return 'Scheduling';
            case 'customers': return 'Customer Management';
            case 'analytics': return 'Analytics';
            case 'invoicing': return 'Invoicing';
            case 'workorders': return 'Work Orders';
            case 'settings': return 'Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
            <div className="flex items-center justify-between">
                {/* Left side - Hamburger + Title */}
                <div className="flex items-center gap-4">
                    {/* Hamburger menu - only visible on mobile */}
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <svg className="w-6 h-6 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Page title */}
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                            {getSectionTitle(activeSection)}
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Mechanic Dashboard
                        </p>
                    </div>
                </div>

                {/* Right side - Theme toggle + User menu */}
                <div className="flex items-center gap-3">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
                    >
                        {!isDarkMode ? (
                            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                    </button>

                    {/* User info */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                                {user?.name || user?.email}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Mechanic
                            </p>
                        </div>

                        {/* User avatar */}
                        <div className="w-8 h-8 bg-primary dark:bg-accent rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                            </span>
                        </div>

                        {/* Logout button */}
                        <button
                            onClick={logout}
                            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            title="Sign out"
                        >
                            <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}