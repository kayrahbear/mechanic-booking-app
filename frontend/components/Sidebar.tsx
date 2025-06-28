import { useNavigation, NavigationSection } from '../lib/navigation-context';

interface NavigationItem {
    id: NavigationSection;
    label: string;
    icon: string;
    description: string;
    available: boolean;
}

const navigationItems: NavigationItem[] = [
    {
        id: 'scheduling',
        label: 'Scheduling',
        icon: '📅',
        description: 'Manage appointments and availability',
        available: true
    },
    {
        id: 'customers',
        label: 'Customers',
        icon: '👥',
        description: 'Customer profiles and vehicles',
        available: true
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: '📊',
        description: 'Business insights and reports',
        available: true
    },
    {
        id: 'invoicing',
        label: 'Invoicing',
        icon: '📄',
        description: 'Create and manage invoices',
        available: false
    },
    {
        id: 'workorders',
        label: 'Work Orders',
        icon: '🔧',
        description: 'Service appointment details',
        available: true
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: '⚙️',
        description: 'Dashboard preferences',
        available: false
    }
];

export default function Sidebar() {
    const { activeSection, setActiveSection, isSidebarOpen, setSidebarOpen } = useNavigation();

    const handleSectionClick = (sectionId: NavigationSection, available: boolean) => {
        if (available) {
            setActiveSection(sectionId);
            // Close sidebar on mobile after selection
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            }
        }
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`
                fixed top-0 left-0 h-full w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-50 transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:z-auto
            `}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        Dashboard
                    </h2>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <svg className="w-6 h-6 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4">
                    <ul className="space-y-2">
                        {navigationItems.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleSectionClick(item.id, item.available)}
                                    disabled={!item.available}
                                    className={`
                                        w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                                        ${activeSection === item.id && item.available
                                            ? 'bg-primary dark:bg-accent text-white'
                                            : item.available
                                                ? 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                                : 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                                        }
                                    `}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.label}</span>
                                            {!item.available && (
                                                <span className="text-xs bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded">
                                                    Soon
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs opacity-75 mt-0.5">
                                            {item.description}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                
            </div>
        </>
    );
}