import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import type { AdminInstruction, QAOverride } from '../../types';

export function AITrainingTab() {
  const [instructions, setInstructions] = useState<AdminInstruction[]>([]);
  const [qaOverrides, setQaOverrides] = useState<QAOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInstruction, setEditingInstruction] = useState<string | null>(null);
  const [newInstruction, setNewInstruction] = useState('');
  const [newQA, setNewQA] = useState({ question: '', answer: '', keywords: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [instrRes, qaRes] = await Promise.all([
        supabase.from('admin_instructions').select('*').order('priority', { ascending: false }),
        supabase.from('qa_overrides').select('*').order('created_at', { ascending: false }),
      ]);

      if (instrRes.data) setInstructions(instrRes.data as AdminInstruction[]);
      if (qaRes.data) setQaOverrides(qaRes.data as QAOverride[]);
    } catch (error) {
      console.error('Error loading AI training data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddInstruction() {
    if (!newInstruction.trim()) return;

    try {
      const { data, error } = await supabase
        .from('admin_instructions')
        .insert({ content: newInstruction.trim(), priority: 0 })
        .select()
        .single();

      if (error) throw error;
      setInstructions((prev) => [...prev, data as AdminInstruction]);
      setNewInstruction('');
    } catch (error) {
      console.error('Error adding instruction:', error);
    }
  }

  async function handleUpdateInstruction(id: string, content: string) {
    try {
      await supabase
        .from('admin_instructions')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);

      setInstructions((prev) =>
        prev.map((i) => (i.id === id ? { ...i, content } : i))
      );
      setEditingInstruction(null);
    } catch (error) {
      console.error('Error updating instruction:', error);
    }
  }

  async function handleDeleteInstruction(id: string) {
    if (!confirm('Are you sure you want to delete this instruction?')) return;

    try {
      await supabase.from('admin_instructions').delete().eq('id', id);
      setInstructions((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Error deleting instruction:', error);
    }
  }

  async function handleAddQA() {
    if (!newQA.question.trim() || !newQA.answer.trim()) return;

    try {
      const keywords = newQA.keywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const { data, error } = await supabase
        .from('qa_overrides')
        .insert({
          question: newQA.question.trim(),
          answer: newQA.answer.trim(),
          keywords,
        })
        .select()
        .single();

      if (error) throw error;
      setQaOverrides((prev) => [data as QAOverride, ...prev]);
      setNewQA({ question: '', answer: '', keywords: '' });
    } catch (error) {
      console.error('Error adding Q&A:', error);
    }
  }

  async function handleDeleteQA(id: string) {
    if (!confirm('Are you sure you want to delete this Q&A override?')) return;

    try {
      await supabase.from('qa_overrides').delete().eq('id', id);
      setQaOverrides((prev) => prev.filter((q) => q.id !== id));
    } catch (error) {
      console.error('Error deleting Q&A:', error);
    }
  }

  async function handleToggleQA(id: string, isActive: boolean) {
    try {
      await supabase
        .from('qa_overrides')
        .update({ is_active: isActive })
        .eq('id', id);

      setQaOverrides((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: isActive } : q))
      );
    } catch (error) {
      console.error('Error toggling Q&A:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* System Instructions */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">System Instructions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          These instructions guide the AI's behavior and personality. Higher priority instructions take precedence.
        </p>

        <div className="space-y-3 mb-4">
          {instructions.map((instruction) => (
            <div
              key={instruction.id}
              className={cn(
                'p-4 rounded-lg border',
                instruction.is_active ? 'bg-white border-border' : 'bg-gray-50 border-gray-200 opacity-60'
              )}
            >
              {editingInstruction === instruction.id ? (
                <div className="space-y-3">
                  <textarea
                    defaultValue={instruction.content}
                    className="input w-full min-h-[100px]"
                    id={`instruction-${instruction.id}`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const textarea = document.getElementById(`instruction-${instruction.id}`) as HTMLTextAreaElement;
                        handleUpdateInstruction(instruction.id, textarea.value);
                      }}
                      className="btn btn-primary px-3 py-1.5"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingInstruction(null)}
                      className="btn btn-secondary px-3 py-1.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                    {instruction.content}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingInstruction(instruction.id)}
                      className="p-1.5 hover:bg-secondary rounded"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteInstruction(instruction.id)}
                      className="p-1.5 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new instruction */}
        <div className="space-y-3">
          <textarea
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            placeholder="Add a new instruction for the AI..."
            className="input w-full min-h-[80px]"
          />
          <button
            onClick={handleAddInstruction}
            disabled={!newInstruction.trim()}
            className="btn btn-primary px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Instruction
          </button>
        </div>
      </section>

      {/* Q&A Overrides */}
      <section className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Q&A Overrides</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define specific questions and answers. When a user asks a matching question, the AI will use this exact answer.
        </p>

        {/* Add new Q&A */}
        <div className="p-4 bg-secondary/30 rounded-lg mb-6">
          <h4 className="font-medium text-foreground mb-3">Add New Q&A Override</h4>
          <div className="space-y-3">
            <input
              type="text"
              value={newQA.question}
              onChange={(e) => setNewQA({ ...newQA, question: e.target.value })}
              placeholder="Question (e.g., 'What are the pool hours?')"
              className="input w-full"
            />
            <textarea
              value={newQA.answer}
              onChange={(e) => setNewQA({ ...newQA, answer: e.target.value })}
              placeholder="Answer..."
              className="input w-full min-h-[80px]"
            />
            <input
              type="text"
              value={newQA.keywords}
              onChange={(e) => setNewQA({ ...newQA, keywords: e.target.value })}
              placeholder="Keywords (comma-separated, e.g., 'pool, hours, opening')"
              className="input w-full"
            />
            <button
              onClick={handleAddQA}
              disabled={!newQA.question.trim() || !newQA.answer.trim()}
              className="btn btn-primary px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Q&A Override
            </button>
          </div>
        </div>

        {/* Q&A List */}
        <div className="space-y-3">
          {qaOverrides.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No Q&A overrides yet. Add one above.
            </p>
          ) : (
            qaOverrides.map((qa) => (
              <div
                key={qa.id}
                className={cn(
                  'p-4 rounded-lg border',
                  qa.is_active ? 'bg-white border-border' : 'bg-gray-50 border-gray-200 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{qa.question}</p>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {qa.answer}
                    </p>
                    {qa.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {qa.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleQA(qa.id, !qa.is_active)}
                      className={cn(
                        'px-2 py-1 text-xs rounded',
                        qa.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {qa.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeleteQA(qa.id)}
                      className="p-1.5 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
