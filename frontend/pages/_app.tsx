import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth-context';
import { ThemeProvider } from '../lib/theme-context';
import Nav from '../lib/nav';
import '../src/styles/globals.css';
import '../lib/firebase';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <div className="min-h-screen flex flex-col bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 transition-colors">
                    <Nav />
                    <main className="flex-grow">
                        <Component {...pageProps} />
                    </main>
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default MyApp; 