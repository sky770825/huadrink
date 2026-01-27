import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check admin status
          const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          setIsAdmin(!!adminData);
        } else {
          setIsAdmin(false);
        }
        
        setIsLoading(false);
      }
    );

    // Then check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from('admins')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data: adminData }) => {
            setIsAdmin(!!adminData);
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return { user, isAdmin, isLoading, signOut };
}

export function useRequireAdmin() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  return { user, isAdmin, isLoading };
}
