import React, { useState, useCallback } from 'react';
import { useDebugger } from '../../contexts/DebuggerContext';
import { Plus, Trash2, Eye } from 'lucide-react';

export interface WatchExpression {
  id: string;
  expression: string;
  value?: string;
  error?: string;
}

export const WatchExpressions: React.FC = () => {
  const [expressions, setExpressions] = useState<WatchExpression[]>([]);
  const { evaluateExpression, isDebugging, isPaused } = useDebugger();

  const addExpression = useCallback(() => {
    setExpressions(prev => [
      ...prev,
      { id: Date.now().toString(), expression: '' }
    ]);
  }, []);

  const updateExpression = useCallback((id: string, expression: string) => {
    setExpressions(prev =>
      prev.map(exp =>
        exp.id === id ? { ...exp, expression } : exp
      )
    );
  }, []);

  const removeExpression = useCallback((id: string) => {
    setExpressions(prev => prev.filter(exp => exp.id !== id));
  }, []);

  const evaluateAll = useCallback(async () => {
    if (!isDebugging || !isPaused) return;

    const updatedExpressions = await Promise.all(
      expressions.map(async exp => {
        try {
          const result = await evaluateExpression(exp.expression);
          return {
            ...exp,
            value: result?.result || 'undefined',
            error: undefined
          };
        } catch (error) {
          return {
            ...exp,
            value: undefined,
            error: error instanceof Error ? error.message : 'Evaluation failed'
          };
        }
      })
    );

    setExpressions(updatedExpressions);
  }, [expressions, isDebugging, isPaused, evaluateExpression]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Watch</h3>
        <div className="flex space-x-2">
          <button
            onClick={evaluateAll}
            disabled={!isDebugging || !isPaused}
            className="inline-flex items-center justify-center rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full justify-start"
          >
            <Eye className="h-4 w-4 mr-2" />
            Evaluate
          </button>
          <button
            onClick={addExpression}
            disabled={!isDebugging}
            className="inline-flex items-center justify-center rounded-md border border-input bg-transparent px-3 py-1.5 text-sm font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expression
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {expressions.map(exp => (
          <div key={exp.id} className="flex items-center space-x-2">
            <input
              value={exp.expression}
              onChange={e => updateExpression(exp.id, e.target.value)}
              placeholder="Enter expression..."
              className="flex-1"
            />
            <button
              onClick={() => removeExpression(exp.id)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        
        {expressions.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No watch expressions. Click + to add one.
          </div>
        )}
        
        {expressions.some(exp => exp.error || exp.value) && (
          <div className="mt-4 space-y-2">
            {expressions.map(exp => (
              (exp.error || exp.value) && (
                <div key={`${exp.id}-result`} className="text-sm p-2 bg-muted rounded">
                  <div className="font-mono">
                    {exp.expression} = {exp.error ? 
                      <span className="text-red-500">{exp.error}</span> : 
                      <span className="text-green-500">{exp.value}</span>
                    }
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
