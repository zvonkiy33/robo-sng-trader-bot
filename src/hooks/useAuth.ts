import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  useEffect(() => {
    // Automatically sign in anonymously if not authenticated
    const signInAnonymously = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Error signing in anonymously:', error);
        }
      }
    };

    signInAnonymously();
  }, []);

  return {};
}