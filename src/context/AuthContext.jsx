import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({ user: null, loading: true });

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            if (currentUser) {
                // Determine the role and status from user_metadata
                currentUser.role = currentUser.user_metadata?.role || 'consulta';
                currentUser.status = currentUser.user_metadata?.status || 'pending';
                // Admin is automatically approved. Otherwise depends on status.
                currentUser.isApproved = currentUser.role === 'admin' || currentUser.status === 'approved';
            }
            setUser(currentUser);
            setLoading(false);
        });

        // Listen for changes on auth state (log in, log out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const currentUser = session?.user ?? null;
                if (currentUser) {
                    currentUser.role = currentUser.user_metadata?.role || 'consulta';
                    currentUser.status = currentUser.user_metadata?.status || 'pending';
                    currentUser.isApproved = currentUser.role === 'admin' || currentUser.status === 'approved';
                }
                setUser(currentUser);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
