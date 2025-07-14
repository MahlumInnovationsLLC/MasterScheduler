import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  User, 
  Edit, 
  Plus, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Download, 
  Upload,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDistanceToNow, format } from 'date-fns';
import { safeFilter, ensureArray } from '@/lib/array-utils';

interface ProjectForensicsRecord {
  id: number;
  projectId: number;
  entityType: string;
  entityId: number;
  action: string;
  userId?: string;
  username?: string;
  changedFields?: string[];
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changeDescription?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  affectedEntities?: any[];
  cascadeChanges?: boolean;
  timestamp: string;
}

interface ProjectForensicsWidgetProps {
  projectId: number;
  className?: string;
}

const actionIcons = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  archive: Archive,
  restore: RotateCcw,
  import: Upload,
  export: Download,
  bulk_update: Edit,
};

const actionColors = {
  create: 'bg-green-100 text-green-800 border-green-200',
  update: 'bg-blue-100 text-blue-800 border-blue-200',
  delete: 'bg-red-100 text-red-800 border-red-200',
  archive: 'bg-orange-100 text-orange-800 border-orange-200',
  restore: 'bg-purple-100 text-purple-800 border-purple-200',
  import: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  export: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  bulk_update: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const entityDisplayNames = {
  project: 'Project',
  task: 'Task',
  billing_milestone: 'Billing Milestone',
  manufacturing_schedule: 'Manufacturing Schedule',
  manufacturing_bay: 'Manufacturing Bay',
  project_cost: 'Project Cost',
  delivery_tracking: 'Delivery Tracking',
  sales_deal: 'Sales Deal',
  supply_chain_benchmark: 'Supply Chain Benchmark',
  project_supply_chain_benchmark: 'Project Supply Chain Benchmark',
};

export function ProjectForensicsWidget({ projectId, className = '' }: ProjectForensicsWidgetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { data: forensicsData, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/projects/${projectId}/forensics`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const forensicsRecords: ProjectForensicsRecord[] = forensicsData || [];

  // Filter records based on search and filters
  const safeRecords = ensureArray(forensicsRecords, [], 'ProjectForensicsWidget.forensicsRecords');
  const filteredRecords = safeFilter(safeRecords, record => {
    const matchesSearch = !searchTerm || 
      record.changeDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.changedFields?.some(field => field.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || record.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || record.entityType === entityFilter;
    
    return matchesSearch && matchesAction && matchesEntity;
  }, 'ProjectForensicsWidget.filteredRecords');

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
    return String(value);
  };

  const renderFieldChanges = (record: ProjectForensicsRecord) => {
    if (!record.changedFields || record.changedFields.length === 0) return null;

    return (
      <div className="space-y-2">
        {record.changedFields.map(field => {
          const previousValue = record.previousValues?.[field];
          const newValue = record.newValues?.[field];
          
          return (
            <div key={field} className="border rounded-lg p-3 bg-gray-50">
              <div className="font-medium text-sm text-gray-700 mb-2">
                {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-gray-500 text-xs mb-1">Previous:</div>
                  <div className="bg-red-50 border border-red-200 rounded px-2 py-1 font-mono text-xs break-all text-red-900">
                    {formatFieldValue(previousValue)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">New:</div>
                  <div className="bg-green-50 border border-green-200 rounded px-2 py-1 font-mono text-xs break-all text-green-900">
                    {formatFieldValue(newValue)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Project Forensics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            Failed to load forensics data. Please try again.
            <Button variant="outline" onClick={() => refetch()} className="ml-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-600" />
            <span className="text-white font-semibold">Project Forensics</span>
            <Badge variant="outline" className="ml-2">
              {filteredRecords.length} changes
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </CardTitle>
        
        {showFilters && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search changes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="archive">Archive</SelectItem>
                  <SelectItem value="restore">Restore</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {Object.entries(entityDisplayNames).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {forensicsRecords.length === 0 
              ? "No changes recorded for this project yet."
              : "No changes match your current filters."
            }
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="divide-y">
              {filteredRecords.map((record, index) => {
                const ActionIcon = actionIcons[record.action as keyof typeof actionIcons] || Edit;
                const isExpanded = expandedItems.has(record.id);
                
                return (
                  <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(record.id)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-start gap-3 text-left">
                          <div className="flex-shrink-0 mt-0.5">
                            <ActionIcon className="h-4 w-4 text-gray-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${actionColors[record.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}`}
                              >
                                {record.action.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {entityDisplayNames[record.entityType as keyof typeof entityDisplayNames] || record.entityType}
                              </Badge>
                              {record.cascadeChanges && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                  Cascade
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {record.changeDescription || `${record.action} ${record.entityType}`}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {record.username || 'System'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                              </div>
                              {record.source && record.source !== 'manual' && (
                                <div className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {record.source}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="mt-3 ml-7 space-y-3">
                          <Separator />
                          
                          {record.changedFields && record.changedFields.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Field Changes ({record.changedFields.length})
                              </h4>
                              {renderFieldChanges(record)}
                            </div>
                          )}
                          
                          {record.affectedEntities && record.affectedEntities.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Affected Entities
                              </h4>
                              <div className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                <pre className="whitespace-pre-wrap font-mono">
                                  {JSON.stringify(record.affectedEntities, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Timestamp: {format(new Date(record.timestamp), 'PPpp')}</div>
                            {record.ipAddress && <div>IP Address: {record.ipAddress}</div>}
                            {record.userAgent && (
                              <div>User Agent: {record.userAgent.length > 100 
                                ? record.userAgent.substring(0, 100) + '...' 
                                : record.userAgent}
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}