import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Calendar,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

const DEPARTMENTS = [
  'Sales',
  'Engineering', 
  'Supply Chain',
  'Finance',
  'Fabrication',
  'Paint',
  'Production',
  'IT',
  'NTC',
  'QC',
  'FSW'
];

interface CCBRequest {
  id: number;
  projectId: number;
  title: string;
  description: string;
  justification: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending_review' | 'under_review' | 'approved' | 'rejected';
  requestedPhases: string[];
  proposedChanges: any[];
  submittedBy: string;
  submittedAt: string;
  reviewedAt?: string;
  project?: {
    projectNumber: string;
    name: string;
  };
}

export default function CCBManagementSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRequest, setSelectedRequest] = useState<CCBRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<Set<number>>(new Set());

  // Fetch CCB requests
  const { data: ccbRequests = [], isLoading } = useQuery({
    queryKey: ['/api/ccb-requests'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch departmental approvals for a specific request
  const { data: approvals = [] } = useQuery({
    queryKey: ['/api/ccb-requests', selectedRequest?.id, 'approvals'],
    enabled: !!selectedRequest?.id
  });

  // Submit departmental approval
  const approvalMutation = useMutation({
    mutationFn: async ({ requestId, department, status, comment }: {
      requestId: number;
      department: string;
      status: 'approved' | 'rejected';
      comment: string;
    }) => {
      const response = await fetch(`/api/ccb-requests/${requestId}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, status, comment })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit approval');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Approval Submitted",
        description: "Your departmental approval has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ccb-requests'] });
      setApprovalComment('');
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to submit approval.",
        variant: "destructive"
      });
    }
  });

  // Final CCB approval/rejection
  const finalDecisionMutation = useMutation({
    mutationFn: async ({ requestId, decision, comment }: {
      requestId: number;
      decision: 'approved' | 'rejected';
      comment: string;
    }) => {
      const response = await fetch(`/api/ccb-requests/${requestId}/final-decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process final decision');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.decision === 'approved' ? "CCB Request Approved" : "CCB Request Rejected",
        description: variables.decision === 'approved' 
          ? "Schedule changes have been applied and OP dates updated."
          : "The CCB request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ccb-requests'] });
      setShowDetails(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Decision Failed",
        description: error.message || "Failed to process final decision.",
        variant: "destructive"
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Under Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="secondary">Low Impact</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Medium Impact</Badge>;
      case 'high':
        return <Badge variant="outline" className="text-red-600 border-red-600">High Impact</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical Impact</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const toggleExpanded = (requestId: number) => {
    const newExpanded = new Set(expandedRequests);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRequests(newExpanded);
  };

  const calculateApprovalProgress = (request: CCBRequest) => {
    const requiredApprovals = DEPARTMENTS.length;
    const currentApprovals = approvals.filter((approval: any) => approval.status === 'approved').length;
    return { current: currentApprovals, required: requiredApprovals };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading CCB requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Change Control Board</h3>
          <p className="text-sm text-muted-foreground">
            Schedule change requests requiring departmental approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            {ccbRequests.filter((r: CCBRequest) => r.status === 'pending_review' || r.status === 'under_review').length} Active
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-600">
            {ccbRequests.filter((r: CCBRequest) => r.status === 'approved').length} Approved
          </Badge>
        </div>
      </div>

      {ccbRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No CCB Requests</h3>
            <p className="text-muted-foreground">
              No schedule change requests have been submitted yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ccbRequests.map((request: CCBRequest) => {
            const isExpanded = expandedRequests.has(request.id);
            
            return (
              <Card key={request.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{request.title}</CardTitle>
                        {getStatusBadge(request.status)}
                        {getImpactBadge(request.impactLevel)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Project:</span> {request.project?.projectNumber} - {request.project?.name}
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span> {formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })} by {request.submittedBy}
                        </div>
                        <div>
                          <span className="font-medium">Affected Phases:</span> {request.requestedPhases.join(', ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(request.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Business Justification</h4>
                        <p className="text-sm text-muted-foreground">{request.justification}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Proposed Changes ({request.proposedChanges.length})</h4>
                        <div className="space-y-2">
                          {request.proposedChanges.map((change: any, index: number) => (
                            <div key={index} className="bg-muted/50 rounded-lg p-3 text-sm">
                              <div className="font-medium">{change.phase}</div>
                              <div className="text-muted-foreground">
                                <span>Current: {change.currentDate === 'Not set' ? 'Not set' : format(new Date(change.currentDate), 'MMM dd, yyyy')}</span>
                                <span className="mx-2">→</span>
                                <span>Proposed: {format(new Date(change.proposedDate), 'MMM dd, yyyy')}</span>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                Reason: {change.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* CCB Request Review Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CCB Request Review</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Overview */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">Project:</span> {selectedRequest.project?.projectNumber}
                </div>
                <div>
                  <span className="font-medium">Impact Level:</span> {selectedRequest.impactLevel}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedRequest.status}
                </div>
                <div>
                  <span className="font-medium">Submitted:</span> {format(new Date(selectedRequest.submittedAt), 'PPp')}
                </div>
              </div>

              {/* Departmental Approvals */}
              <div>
                <h4 className="font-medium mb-4">Departmental Approvals</h4>
                <div className="grid grid-cols-3 gap-4">
                  {DEPARTMENTS.map(department => {
                    const approval = approvals.find((a: any) => a.department === department);
                    
                    return (
                      <div key={department} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{department}</span>
                          {approval ? (
                            approval.status === 'approved' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        
                        {approval ? (
                          <div className="text-xs text-muted-foreground">
                            <div>{approval.status === 'approved' ? 'Approved' : 'Rejected'}</div>
                            <div>{format(new Date(approval.reviewedAt), 'MMM dd')}</div>
                            {approval.comment && (
                              <div className="mt-1 italic">"{approval.comment}"</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add comment..."
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              className="text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="text-xs h-6 bg-green-600 hover:bg-green-700"
                                onClick={() => approvalMutation.mutate({
                                  requestId: selectedRequest.id,
                                  department,
                                  status: 'approved',
                                  comment: approvalComment
                                })}
                                disabled={approvalMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6 border-red-600 text-red-600 hover:bg-red-50"
                                onClick={() => approvalMutation.mutate({
                                  requestId: selectedRequest.id,
                                  department,
                                  status: 'rejected',
                                  comment: approvalComment
                                })}
                                disabled={approvalMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Decision Section */}
              {selectedRequest.status === 'under_review' && (
                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Final CCB Decision</h4>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add final decision comment..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-4">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => finalDecisionMutation.mutate({
                          requestId: selectedRequest.id,
                          decision: 'approved',
                          comment: approvalComment
                        })}
                        disabled={finalDecisionMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve CCB Request
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => finalDecisionMutation.mutate({
                          requestId: selectedRequest.id,
                          decision: 'rejected',
                          comment: approvalComment
                        })}
                        disabled={finalDecisionMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject CCB Request
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}