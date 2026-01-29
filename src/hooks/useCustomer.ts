import { useState, useEffect, useCallback } from 'react';
import { supabase, getOrCreateSessionId } from '../lib/supabase';
import type { Customer } from '../types';

interface UseCustomerReturn {
  customer: Customer | null;
  sessionId: string;
  isLoading: boolean;
  error: Error | null;
  updateCustomer: (updates: Partial<Customer>) => Promise<void>;
  updatePreferences: (preferences: Record<string, unknown>) => Promise<void>;
}

export function useCustomer(): UseCustomerReturn {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sessionId] = useState<string>(() => getOrCreateSessionId());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load or create customer on mount
  useEffect(() => {
    async function loadCustomer() {
      try {
        // Try to get existing customer
        const { data: existingCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for new users
          throw fetchError;
        }

        if (existingCustomer) {
          setCustomer(existingCustomer as Customer);
        } else {
          // Create new customer
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({ session_id: sessionId })
            .select()
            .single();

          if (createError) throw createError;
          setCustomer(newCustomer as Customer);
        }
      } catch (err) {
        console.error('Error loading customer:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomer();
  }, [sessionId]);

  const updateCustomer = useCallback(async (updates: Partial<Customer>) => {
    if (!customer) return;

    try {
      const { data, error: updateError } = await supabase
        .from('customers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setCustomer(data as Customer);
    } catch (err) {
      console.error('Error updating customer:', err);
      throw err;
    }
  }, [customer]);

  const updatePreferences = useCallback(async (preferences: Record<string, unknown>) => {
    if (!customer) return;

    const newPreferences = {
      ...customer.preferences,
      ...preferences,
    };

    await updateCustomer({ preferences: newPreferences });
  }, [customer, updateCustomer]);

  return {
    customer,
    sessionId,
    isLoading,
    error,
    updateCustomer,
    updatePreferences,
  };
}
