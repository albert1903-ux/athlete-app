import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useCalendarShares() {
  const { user } = useAuth();
  const [myShares, setMyShares] = useState([]); // Calendars I shared with others
  const [sharedWithMe, setSharedWithMe] = useState([]); // Calendars others shared with me
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShares = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Get shares where I am the owner
      const { data: mySharesData, error: mySharesError } = await supabase.rpc('get_my_calendar_shares');

      if (mySharesError) throw mySharesError;
      setMyShares(mySharesData || []);

      // Get shares where I am the recipient
      const { data: sharedWithMeData, error: sharedWithMeError } = await supabase.rpc('get_shared_with_me');

      if (sharedWithMeError) throw sharedWithMeError;
      setSharedWithMe(sharedWithMeData || []);

    } catch (err) {
      console.error('Error fetching calendar shares:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const requestShare = async (email) => {
    try {
      const { data, error } = await supabase.rpc('share_calendar_by_email', {
        target_email: email
      });

      if (error) throw error;
      await fetchShares();
      return data;
    } catch (err) {
      console.error('Error requesting calendar share:', err);
      throw err;
    }
  };

  const acceptShare = async (shareId) => {
    try {
      const { data, error } = await supabase.rpc('accept_calendar_share', {
        share_id: shareId
      });

      if (error) throw error;
      await fetchShares();
      return data;
    } catch (err) {
      console.error('Error accepting calendar share:', err);
      throw err;
    }
  };

  const rejectShare = async (shareId) => {
    try {
      const { data, error } = await supabase.rpc('reject_calendar_share', {
        share_id: shareId
      });

      if (error) throw error;
      await fetchShares();
      return data;
    } catch (err) {
      console.error('Error rejecting calendar share:', err);
      throw err;
    }
  };
  
  const revokeShare = async (shareId) => {
    try {
      const { error } = await supabase
        .from('calendar_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      await fetchShares();
    } catch (err) {
       console.error('Error revoking calendar share:', err);
       throw err;
    }
  }

  return {
    myShares,
    sharedWithMe,
    loading,
    error,
    refreshShares: fetchShares,
    requestShare,
    acceptShare,
    rejectShare,
    revokeShare
  };
}
