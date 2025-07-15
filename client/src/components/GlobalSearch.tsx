import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, CheckSquare, DollarSign, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: 'project' | 'task' | 'milestone';
  id: number;
  title: string;
  subtitle: string;
  status?: string;
  route: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  // Use backend search endpoint
  const { data: searchData } = useQuery<{ results: SearchResult[] }>({
    queryKey: ["/api/search", searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const results = searchData?.results || [];

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.route);
    setIsOpen(false);
    setSearchQuery("");
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'project':
        return <FileText className="h-4 w-4" />;
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'milestone':
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div ref={searchRef} className="relative">
      <div 
        className="flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <Search className="text-muted-foreground mr-2 h-4 w-4" />
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Search projects, tasks, milestones..." 
          className="bg-transparent border-none outline-none text-sm w-56 text-foreground placeholder:text-muted-foreground"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {isOpen && (
        <Card className="absolute top-full mt-2 w-[500px] max-h-[400px] overflow-hidden shadow-lg">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {searchQuery.length < 2 
                ? "Type to search..." 
                : results.length === 0 
                  ? "No results found" 
                  : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
            </h3>
            <button 
              onClick={() => {
                setIsOpen(false);
                setSearchQuery("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {results.length > 0 && (
            <div className="max-h-[340px] overflow-y-auto">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded",
                      result.type === 'project' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
                      result.type === 'task' && "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
                      result.type === 'milestone' && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    )}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    {result.status && (
                      <Badge className={cn("text-xs", getStatusColor(result.status))}>
                        {result.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}