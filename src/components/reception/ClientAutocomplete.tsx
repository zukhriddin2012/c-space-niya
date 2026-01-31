'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Building2, User, Plus, X, Loader2 } from 'lucide-react';

export interface ClientOption {
  id?: string;
  name: string;
  type?: 'company' | 'individual';
  phone?: string;
  companyName?: string;
  industry?: string;
}

interface ClientAutocompleteProps {
  value: ClientOption | null;
  onChange: (client: ClientOption | null) => void;
  branchId?: string;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function ClientAutocomplete({
  value,
  onChange,
  branchId,
  onCreateNew,
  placeholder = 'Search clients...',
  error,
  required,
}: ClientAutocompleteProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<ClientOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search clients with debounce
  const searchClients = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        branchId: branchId || '',
        limit: '10',
      });
      const response = await fetch(`/api/reception/clients/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.clients || []);
      }
    } catch (error) {
      console.error('Client search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && !value?.id) {
        searchClients(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchClients, value?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selection
  const handleSelect = (client: ClientOption) => {
    onChange(client);
    setQuery(client.name);
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  // Handle create new
  const handleCreateNew = () => {
    if (onCreateNew && query.trim()) {
      onCreateNew(query.trim());
      setIsOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    const totalItems = results.length + (onCreateNew && query.trim() ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          handleSelect(results[highlightIndex]);
        } else if (highlightIndex === results.length && onCreateNew) {
          handleCreateNew();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsOpen(true);
    setHighlightIndex(-1);

    // If clearing or changing, reset the selected value
    if (value?.id && newQuery !== value.name) {
      onChange({ name: newQuery });
    }
  };

  // Clear selection
  const handleClear = () => {
    setQuery('');
    onChange(null);
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            error ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Selected client indicator */}
      {value?.id && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
          {value.type === 'company' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
          <span>Selected: {value.name}</span>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (results.length > 0 || (onCreateNew && query.trim().length >= 2)) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto">
          {results.map((client, index) => (
            <button
              key={client.id}
              type="button"
              onClick={() => handleSelect(client)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                index === highlightIndex ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              {client.type === 'company' ? (
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{client.name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded ${
                    client.type === 'company' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {client.type === 'company' ? 'Company' : 'Individual'}
                  </span>
                  {client.phone && <span>{client.phone}</span>}
                </div>
              </div>
            </button>
          ))}

          {/* Create new option */}
          {onCreateNew && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={handleCreateNew}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left border-t border-gray-100 transition-colors ${
                highlightIndex === results.length ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-purple-700">
                Create &quot;{query.trim()}&quot; as new client
              </span>
            </button>
          )}
        </div>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && !onCreateNew && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 px-3 py-4 text-center text-gray-500 text-sm">
          No clients found
        </div>
      )}
    </div>
  );
}
