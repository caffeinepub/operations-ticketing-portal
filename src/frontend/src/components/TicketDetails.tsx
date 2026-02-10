import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Send, FileText, Image as ImageIcon } from 'lucide-react';
import { useAddComment, useUpdateTicketStatus, useUpdateTicketPriority, useGetTicket } from '@/hooks/useQueries';
import type { Ticket } from '@/backend';
import { TicketStatus, TicketPriority } from '@/backend';
import { toast } from 'sonner';
import { safeTicket, safeFormatDateTime } from '@/utils/ticketSafeAccess';

interface TicketDetailsProps {
  ticket: Ticket;
  onClose: () => void;
}

interface FileMetadata {
  name: string;
  type: string;
  size: number;
}

export default function TicketDetails({ ticket: initialTicket, onClose }: TicketDetailsProps) {
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [newStatus, setNewStatus] = useState<TicketStatus>(initialTicket.status);
  const [newPriority, setNewPriority] = useState<TicketPriority>(initialTicket.priority);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata[]>([]);
  const [ticketSubject, setTicketSubject] = useState<string | null>(null);

  // Fetch the latest ticket data
  const { data: latestTicket, isLoading: isLoadingTicket } = useGetTicket(initialTicket.id);
  const rawTicket = latestTicket || initialTicket;
  
  // Apply safe normalization to prevent crashes on missing fields
  const ticket = safeTicket(rawTicket);

  const addCommentMutation = useAddComment();
  const updateStatusMutation = useUpdateTicketStatus();
  const updatePriorityMutation = useUpdateTicketPriority();

  // Update newStatus and newPriority when ticket changes
  useEffect(() => {
    if (ticket) {
      setNewStatus(ticket.status);
      setNewPriority(ticket.priority);
    }
  }, [ticket?.status, ticket?.priority]);

  // Load file metadata and subject from localStorage
  useEffect(() => {
    if (!ticket) return;
    
    const storedMetadata = localStorage.getItem(`ticket-${ticket.id}-metadata`);
    if (storedMetadata) {
      try {
        const metadata = JSON.parse(storedMetadata);
        setFileMetadata(metadata);
      } catch (error) {
        console.error('Failed to parse file metadata:', error);
      }
    }
    
    const storedSubject = localStorage.getItem(`ticket-${ticket.id}-subject`);
    setTicketSubject(storedSubject);
  }, [ticket?.id]);

  const handleAddComment = async () => {
    if (!ticket) return;
    
    if (!commentAuthor.trim() || !commentContent.trim()) {
      toast.error('Please enter both name and comment');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        ticketId: ticket.id,
        author: commentAuthor.trim(),
        content: commentContent.trim(),
      });

      // Clear form fields after successful submission
      setCommentAuthor('');
      setCommentContent('');
      toast.success('Comment added successfully');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error?.message || 'Failed to add comment');
    }
  };

  const handleUpdateStatus = async () => {
    if (!ticket || newStatus === ticket.status) return;

    try {
      await updateStatusMutation.mutateAsync({
        ticketId: ticket.id,
        newStatus,
      });

      toast.success('Status updated successfully');
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const handleUpdatePriority = async () => {
    if (!ticket || newPriority === ticket.priority) return;

    try {
      await updatePriorityMutation.mutateAsync({
        ticketId: ticket.id,
        newPriority,
      });

      toast.success('Priority updated successfully');
    } catch (error: any) {
      console.error('Failed to update priority:', error);
      toast.error(error?.message || 'Failed to update priority');
    }
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'svg': 'image/svg+xml',
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const handleDownload = async (blob: any, index: number) => {
    if (!ticket) return;
    
    try {
      const bytes = await blob.getBytes();
      
      // Get metadata for this file
      const metadata = fileMetadata[index];
      const filename = metadata?.name || `ticket-${ticket.id}-attachment-${index + 1}`;
      const mimeType = metadata?.type || getMimeType(filename);
      
      // Create blob with correct MIME type
      const blobObj = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blobObj);
      
      // Create download link with original filename
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download attachment');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const isImageFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
  };

  const getBrandLabel = (brand: string): string => {
    const brandLabels: { [key: string]: string } = {
      'AMAXTX': 'A-MAX TX',
      'ALPA': 'ALPA',
      'AMAXCA': 'A-MAX CA',
      'VirtualStore': 'Virtual Store',
    };
    return brandLabels[brand] || brand;
  };

  const getPriorityColor = (priority: TicketPriority): string => {
    switch (priority) {
      case TicketPriority.high:
        return 'bg-red-500 text-white';
      case TicketPriority.medium:
        return 'bg-orange-500 text-white';
      case TicketPriority.low:
        return 'bg-yellow-500 text-white';
      case TicketPriority.empty:
        return 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority: TicketPriority): string => {
    switch (priority) {
      case TicketPriority.high:
        return 'Priority 1';
      case TicketPriority.medium:
        return 'Priority 2';
      case TicketPriority.low:
        return 'Priority 3';
      case TicketPriority.empty:
        return 'No Priority';
      default:
        return 'No Priority';
    }
  };

  const getStatusBadgeClassName = (status: TicketStatus): string => {
    switch (status) {
      case TicketStatus.Submitted:
        return 'bg-red-500 text-white hover:bg-red-600';
      case TicketStatus.InProgress:
        return 'bg-green-500 text-white hover:bg-green-600';
      case TicketStatus.Resolved:
        return '';
      default:
        return '';
    }
  };

  const renderTextWithLinks = (text: string) => {
    // Parse both HTML anchor tags and plain URLs
    const parts: (string | React.ReactElement)[] = [];
    
    // First, handle HTML anchor tags
    const htmlLinkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    // Then handle plain URLs
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    
    let processedText = text;
    const linkMatches: Array<{ start: number; end: number; element: React.ReactElement }> = [];
    
    // Find all HTML anchor tags
    let match;
    while ((match = htmlLinkRegex.exec(text)) !== null) {
      linkMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        element: (
          <a
            key={`html-${match.index}`}
            href={match[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {match[2]}
          </a>
        ),
      });
    }
    
    // Find all plain URLs that are not inside HTML tags
    let urlMatch;
    const urlMatches: Array<{ start: number; end: number; url: string }> = [];
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      // Check if this URL is inside an HTML anchor tag
      const isInsideHtmlTag = linkMatches.some(
        (link) => urlMatch.index >= link.start && urlMatch.index < link.end
      );
      if (!isInsideHtmlTag) {
        urlMatches.push({
          start: urlMatch.index,
          end: urlMatch.index + urlMatch[0].length,
          url: urlMatch[1],
        });
      }
    }
    
    // Combine and sort all matches
    const allMatches = [
      ...linkMatches.map((m) => ({ ...m, type: 'html' as const })),
      ...urlMatches.map((m) => ({
        ...m,
        type: 'url' as const,
        element: (
          <a
            key={`url-${m.start}`}
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            {m.url}
          </a>
        ),
      })),
    ].sort((a, b) => a.start - b.start);
    
    // Build the final output
    let lastIndex = 0;
    for (const match of allMatches) {
      // Add text before the match
      if (match.start > lastIndex) {
        parts.push(text.substring(lastIndex, match.start));
      }
      // Add the link element
      parts.push(match.element);
      lastIndex = match.end;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  if (isLoadingTicket) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-lg font-bold px-3 py-1">
            {ticket.displayName}
          </Badge>
          <Badge 
            variant={ticket.status === TicketStatus.Resolved ? 'default' : 'secondary'}
            className={getStatusBadgeClassName(ticket.status)}
          >
            {ticket.status}
          </Badge>
          <Badge variant="outline">{ticket.platform}</Badge>
          <Badge variant="secondary">{getBrandLabel(ticket.brand)}</Badge>
          <Badge className={getPriorityColor(ticket.priority)}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
          {ticketSubject && (
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
              {ticketSubject}
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Office Name</Label>
            <p className="font-medium">{ticket.officeName || 'Not provided'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Agent Name</Label>
            <p className="font-medium">{ticket.agentName || 'Not provided'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Employee ID</Label>
            <p className="font-medium">{ticket.employeeId || 'Not provided'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium">{ticket.email || 'Not provided'}</p>
          </div>
          {ticket.freshworksEmail && (
            <div>
              <Label className="text-muted-foreground">Freshworks Email</Label>
              <p className="font-medium">{ticket.freshworksEmail}</p>
            </div>
          )}
          {ticket.extension && (
            <div>
              <Label className="text-muted-foreground">Phone Extension</Label>
              <p className="font-medium">{ticket.extension}</p>
            </div>
          )}
          {ticket.policyNumber && (
            <div>
              <Label className="text-muted-foreground">Policy Number</Label>
              <p className="font-medium">{ticket.policyNumber}</p>
            </div>
          )}
          <div className={!ticket.freshworksEmail && !ticket.extension && !ticket.policyNumber ? 'md:col-span-2' : ''}>
            <Label className="text-muted-foreground">Submitted</Label>
            <p className="font-medium">
              {safeFormatDateTime(ticket.submissionTime)}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-muted-foreground">Issue Description</Label>
          <p className="mt-2 rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap">
            {ticket.issueDescription || 'No description provided'}
          </p>
        </div>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <div>
            <Label className="text-muted-foreground">Attachments ({ticket.attachments.length})</Label>
            <div className="mt-2 space-y-2">
              {ticket.attachments.map((attachment, index) => {
                const url = attachment.getDirectURL();
                const metadata = fileMetadata[index];
                const filename = metadata?.name || `attachment-${index + 1}`;
                const isImage = isImageFile(filename);

                return (
                  <div key={index} className="space-y-2">
                    {isImage ? (
                      <div className="rounded-lg border overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={filename}
                          className="w-full h-auto max-h-96 object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
                        {getFileIcon(filename)}
                        <span className="text-sm flex-1 truncate">{filename}</span>
                        {metadata?.size && (
                          <span className="text-xs text-muted-foreground">
                            ({(metadata.size / 1024).toFixed(1)} KB)
                          </span>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(attachment, index)}
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download {filename}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Update Status</Label>
        </div>
        <div className="flex gap-2">
          <Select
            value={newStatus}
            onValueChange={(value) => setNewStatus(value as TicketStatus)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketStatus.Submitted}>Submitted</SelectItem>
              <SelectItem value={TicketStatus.InProgress}>In Progress</SelectItem>
              <SelectItem value={TicketStatus.Resolved}>Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleUpdateStatus}
            disabled={updateStatusMutation.isPending || newStatus === ticket.status}
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Update Priority</Label>
        </div>
        <div className="flex gap-2">
          <Select
            value={newPriority}
            onValueChange={(value) => setNewPriority(value as TicketPriority)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketPriority.empty}>No Priority</SelectItem>
              <SelectItem value={TicketPriority.high}>Priority 1 (Red)</SelectItem>
              <SelectItem value={TicketPriority.medium}>Priority 2 (Orange)</SelectItem>
              <SelectItem value={TicketPriority.low}>Priority 3 (Yellow)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleUpdatePriority}
            disabled={updatePriorityMutation.isPending || newPriority === ticket.priority}
          >
            {updatePriorityMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Comments ({ticket.comments?.length || 0})</Label>
        {ticket.comments && ticket.comments.length > 0 ? (
          <ScrollArea className="h-64 rounded-lg border p-4">
            <div className="space-y-4">
              {ticket.comments.map((comment, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{comment.author || 'Anonymous'}</span>
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDateTime(comment.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {renderTextWithLinks(comment.content || '')}
                  </div>
                  {index < ticket.comments.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
            No comments yet
          </p>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="author">Your Name</Label>
            <Input
              id="author"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              placeholder="Enter your name"
              disabled={addCommentMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Add Comment</Label>
            <Textarea
              id="comment"
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              disabled={addCommentMutation.isPending}
            />
          </div>
          <Button
            onClick={handleAddComment}
            disabled={addCommentMutation.isPending || !commentAuthor.trim() || !commentContent.trim()}
            className="w-full"
          >
            {addCommentMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Add Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
