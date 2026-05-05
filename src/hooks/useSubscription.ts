import { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { useDemo } from '../App';

interface SubscriptionState {
  loading: boolean;
  hasSubscription: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  planId: string | null;
  status: 'active' | 'trial' | 'inactive' | 'expiring';
}

// Features that require a subscription
export const PAID_FEATURES = [
  'sos_rescue',
  'escape_route',
  'auto_rescue',
  'mutual_aid',
  'realtime_push_alerts',
  'family_location',
  'family_sync',
] as const;

export type PaidFeature = typeof PAID_FEATURES[number];

export function useSubscription() {
  const { isDemo } = useDemo();
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    hasSubscription: false,
    isTrialActive: false,
    trialEndsAt: null,
    planId: null,
    status: 'inactive',
  });

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    // Demo mode gets full access
    if (isDemo) {
      setState({
        loading: false,
        hasSubscription: true,
        isTrialActive: true,
        trialEndsAt: null,
        planId: 'personal',
        status: 'trial',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('apple-iap', {
        body: { action: 'get-subscription-status' }
      });

      if (error) throw error;

      setState({
        loading: false,
        hasSubscription: data.hasSubscription ?? false,
        isTrialActive: data.isTrialActive ?? false,
        trialEndsAt: data.trialEndsAt ?? null,
        planId: data.planId ?? null,
        status: data.status ?? 'inactive',
      });
    } catch (e) {
      // If fetch fails, check local trial
      const demoExpires = localStorage.getItem('demo_expires');
      const isTrialActive = demoExpires ? Date.now() < Number(demoExpires) : false;

      setState({
        loading: false,
        hasSubscription: false,
        isTrialActive,
        trialEndsAt: demoExpires ? new Date(Number(demoExpires)).toISOString() : null,
        planId: null,
        status: isTrialActive ? 'trial' : 'inactive',
      });
    }
  };

  const canAccessFeature = (feature: PaidFeature): boolean => {
    if (state.loading) return true; // Don't block during loading
    if (state.hasSubscription) return true;
    if (state.isTrialActive) return true;
    return false;
  };

  const canAccessFamilyFeature = (): boolean => {
    if (state.loading) return true;
    if (state.isTrialActive) return true;
    if (state.hasSubscription && state.planId === 'family') return true;
    return false;
  };

  return {
    ...state,
    canAccessFeature,
    canAccessFamilyFeature,
    refresh: fetchSubscriptionStatus,
  };
}
