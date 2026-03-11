import { useEffect, useState } from 'react';
import { Search, User, Mail, Phone,  Calendar, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatDate } from '../../lib/utils';
import type { Customer } from '../../types';

export function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCustomers(data as Customer[]);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveNotes() {
    if (!selectedCustomer) return;

    try {
      await supabase
        .from('customers')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', selectedCustomer.id);

      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomer.id ? { ...c, notes } : c))
      );
      setSelectedCustomer((prev) => (prev ? { ...prev, notes } : null));
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }

  async function handleUpdateStatus(customerId: string, status: 'guest' | 'member' | 'vip') {
    try {
      await supabase
        .from('customers')
        .update({ member_status: status, updated_at: new Date().toISOString() })
        .eq('id', customerId);

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, member_status: status } : c))
      );
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer((prev) => (prev ? { ...prev, member_status: status } : null));
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.session_id.toLowerCase().includes(query) ||
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  const statusColors = {
    guest: 'bg-gray-100 text-gray-700',
    member: 'bg-blue-100 text-blue-700',
    vip: 'bg-yellow-100 text-yellow-700',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer List */}
      <div className="lg:col-span-2 card">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, or session ID..."
              className="input w-full pl-10"
            />
          </div>
        </div>

        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No customers found</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  setSelectedCustomer(customer);
                  setNotes(customer.notes || '');
                  setEditingNotes(false);
                }}
                className={cn(
                  'w-full p-4 text-left hover:bg-secondary/50 transition-colors',
                  selectedCustomer?.id === customer.id && 'bg-secondary'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {customer.name || `Guest ${customer.session_id.slice(0, 8)}...`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <span className={cn('px-2 py-1 text-xs rounded-full capitalize', statusColors[customer.member_status])}>
                    {customer.member_status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div className="card">
        {selectedCustomer ? (
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedCustomer.name || 'Anonymous Guest'}
                </h3>
                <select
                  value={selectedCustomer.member_status}
                  onChange={(e) =>
                    handleUpdateStatus(selectedCustomer.id, e.target.value as 'guest' | 'member' | 'vip')
                  }
                  className={cn(
                    'mt-1 px-2 py-1 text-xs rounded-full border-0 cursor-pointer',
                    statusColors[selectedCustomer.member_status]
                  )}
                >
                  <option value="guest">Guest</option>
                  <option value="member">Member</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {selectedCustomer.email || 'No email provided'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {selectedCustomer.phone || 'No phone provided'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  First seen: {formatDate(selectedCustomer.created_at)}
                </span>
              </div>

              {/* Preferences */}
              {Object.keys(selectedCustomer.preferences).length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedCustomer.preferences).map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">Notes</h4>
                  {editingNotes ? (
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveNotes}
                        className="p-1 hover:bg-green-50 rounded"
                      >
                        <Save className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(false);
                          setNotes(selectedCustomer.notes || '');
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input w-full min-h-[100px]"
                    placeholder="Add notes about this customer..."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.notes || 'No notes yet. Click edit to add notes.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a customer to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
