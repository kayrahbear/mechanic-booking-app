import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth-context';
import Nav from '../lib/nav';
import '../src/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <AuthProvider>
            <div className="min-h-screen flex flex-col">
                <Nav />
                <main className="flex-grow">
                    <Component {...pageProps} />
                </main>
            </div>
        </AuthProvider>
    );
}

export default MyApp; 