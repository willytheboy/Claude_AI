import React, { useState } from 'react';
import { Lock, Mail, Shield, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function SettingsTab() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error).message });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Account Info */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user?.role || 'Admin'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </h3>

        {message && (
          <div className={cn(
            'p-3 rounded-lg mb-4 flex items-center gap-2',
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          )}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input w-full"
              placeholder="Enter new password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input w-full"
              placeholder="Confirm new password"
              minLength={8}
              required
            />
          </div>
          <button type="submit" disabled={isUpdating} className="btn btn-primary px-4 py-2">
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* API Configuration Info */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The following environment variables need to be configured in your Supabase project:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <code className="px-2 py-1 bg-secondary rounded">LOVABLE_API_KEY</code>
            <span className="text-muted-foreground">- AI Gateway (Gemini)</span>
          </li>
          <li className="flex items-center gap-2">
            <code className="px-2 py-1 bg-secondary rounded">ELEVENLABS_API_KEY</code>
            <span className="text-muted-foreground">- Text-to-Speech</span>
          </li>
          <li className="flex items-center gap-2">
            <code className="px-2 py-1 bg-secondary rounded">OPENWEATHER_API_KEY</code>
            <span className="text-muted-foreground">- Weather data</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
