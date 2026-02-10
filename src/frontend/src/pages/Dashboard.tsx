import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Filter, X, Search } from 'lucide-react';
import { useGetTickets, useSearchTickets } from '@/hooks/useQueries';
import { Platform, TicketStatus, Brand, TicketPriority } from '@/backend';
import TicketDetails from '@/components/TicketDetails';
import TicketCounters from '@/components/TicketCounters';
import type { Ticket } from '@/backend';
import { safeTickets, safeFormatDate } from '@/utils/ticketSafeAccess';

interface DashboardProps {
  isAdminAuthenticated: boolean;
}

export default function Dashboard({ isAdminAuthenticated }: DashboardProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  const [platformFilter, setPlatformFilter] = useState<Platform | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | null>(null);
  const [brandFilter, setBrandFilter] = useState<Brand | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: tickets, isLoading, error } = useGetTickets(
    platformFilter,
    statusFilter,
    brandFilter,
    priorityFilter,
    startDate ? BigInt(new Date(startDate).getTime() * 1_000_000) : null,
    endDate ? BigInt(new Date(endDate).getTime() * 1_000_000) : null,
    isAdminAuthenticated
  );

  const { data: searchResults, isLoading: isSearching } = useSearchTickets(searchTerm, isAdminAuthenticated);
  const { data: allTickets } = useGetTickets(null, null, null, null, null, null, isAdminAuthenticated);

  const unresolvedCount = (allTickets || []).filter(
    ticket => ticket.status === TicketStatus.Submitted || ticket.status === TicketStatus.InProgress
  ).length;

  const handlePlatformClick = (platform: Platform | null) => {
    setPlatformFilter(platform);
    setSearchTerm('');
  };

  const clearFilters = () => {
    setPlatformFilter(null);
    setStatusFilter(null);
    setBrandFilter(null);
    setPriorityFilter(null);
    setSubjectFilter(null);
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setUnresolvedOnly(false);
  };

  const hasActiveFilters = platformFilter || statusFilter || brandFilter || priorityFilter || subjectFilter || startDate || endDate || searchTerm || unresolvedOnly;

  const rawDisplayTickets = searchTerm.trim() ? searchResults : tickets;
  const safeDisplayTickets = safeTickets(rawDisplayTickets);
  
  let displayTickets = safeDisplayTickets;
  if (subjectFilter) {
    displayTickets = safeDisplayTickets.filter(ticket => {
      const ticketSubject = localStorage.getItem(`ticket-${ticket.id}-subject`);
      return ticketSubject === subjectFilter;
    });
  }

  if (unresolvedOnly) {
    displayTickets = displayTickets.filter(
      ticket => ticket.status === TicketStatus.Submitted || ticket.status === TicketStatus.InProgress
    );
  }
  
  const displayLoading = searchTerm.trim() ? isSearching : isLoading;

  const getPriorityColor = (priority: TicketPriority): string => {
    switch (priority) {
      case TicketPriority.high:
        return 'bg-priority-high text-white';
      case TicketPriority.medium:
        return 'bg-priority-medium text-white';
      case TicketPriority.low:
        return 'bg-priority-low text-white';
      case TicketPriority.empty:
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
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

  const getStatusClassName = (status: TicketStatus): string => {
    switch (status) {
      case TicketStatus.Submitted:
        return 'bg-status-submitted text-white hover:opacity-90';
      case TicketStatus.InProgress:
        return 'bg-status-inprogress text-white hover:opacity-90';
      case TicketStatus.Resolved:
        return 'bg-status-resolved text-white hover:opacity-90';
      default:
        return '';
    }
  };

  const getTicketSubject = (ticketId: bigint): string | null => {
    return localStorage.getItem(`ticket-${ticketId}-subject`);
  };

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8">
      <TicketCounters 
        tickets={allTickets || []} 
        onPlatformClick={handlePlatformClick}
        activePlatform={platformFilter}
      />

      <Card className="shadow-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-card-title">Ticket Dashboard</CardTitle>
              <CardDescription className="text-card-description">View and manage all submitted tickets</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant={unresolvedOnly ? "default" : "outline"}
                onClick={() => setUnresolvedOnly(!unresolvedOnly)}
                className="interactive-button focus-ring relative"
              >
                Unresolved Tickets
                <Badge 
                  variant="secondary" 
                  className="ml-2.5 bg-background text-foreground border"
                >
                  {unresolvedCount}
                </Badge>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="interactive-button focus-ring"
              >
                <Filter className="mr-2 icon-sm" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="search" className="text-label">Search Tickets</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 icon-sm -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Search by ticket name, issue, comments, commenter names, office, agent, employee ID, email, or Freshworks email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus-ring"
              />
            </div>
            <p className="text-helper">
              Search across ticket names (e.g., OAI-1), issue descriptions, comments, commenter names, office name, agent name, employee ID, email, and Freshworks email
            </p>
          </div>

          {showFilters && (
            <div className="border-t pt-6 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2.5">
                  <Label className="text-label">Platform</Label>
                  <Select
                    value={platformFilter ?? 'all'}
                    onValueChange={(value) => {
                      setPlatformFilter(value === 'all' ? null : value as Platform);
                      setSearchTerm('');
                    }}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value={Platform.OneSpan}>OneSpan (Nuvola)</SelectItem>
                      <SelectItem value={Platform.ObserveAI}>Observe.ai</SelectItem>
                      <SelectItem value={Platform.Freshworks}>Freshworks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">Status</Label>
                  <Select
                    value={statusFilter ?? 'all'}
                    onValueChange={(value) => setStatusFilter(value === 'all' ? null : value as TicketStatus)}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value={TicketStatus.Submitted}>Submitted</SelectItem>
                      <SelectItem value={TicketStatus.InProgress}>In Progress</SelectItem>
                      <SelectItem value={TicketStatus.Resolved}>Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">Brand</Label>
                  <Select
                    value={brandFilter ?? 'all'}
                    onValueChange={(value) => setBrandFilter(value === 'all' ? null : value as Brand)}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      <SelectItem value={Brand.AMAXTX}>A-MAX TX</SelectItem>
                      <SelectItem value={Brand.ALPA}>ALPA</SelectItem>
                      <SelectItem value={Brand.AMAXCA}>A-MAX CA</SelectItem>
                      <SelectItem value={Brand.VirtualStore}>Virtual Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">Priority</Label>
                  <Select
                    value={priorityFilter ?? 'all'}
                    onValueChange={(value) => setPriorityFilter(value === 'all' ? null : value as TicketPriority)}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value={TicketPriority.empty}>No Priority</SelectItem>
                      <SelectItem value={TicketPriority.high}>Priority 1</SelectItem>
                      <SelectItem value={TicketPriority.medium}>Priority 2</SelectItem>
                      <SelectItem value={TicketPriority.low}>Priority 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">Subject</Label>
                  <Select
                    value={subjectFilter ?? 'all'}
                    onValueChange={(value) => setSubjectFilter(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="focus-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      <SelectItem value="Login or Password Reset">Login or Password Reset</SelectItem>
                      <SelectItem value="Receiving Error">Receiving Error</SelectItem>
                      <SelectItem value="Other Issue">Other Issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="focus-ring"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-label">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="focus-ring"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="interactive-button focus-ring"
                >
                  <X className="mr-2 icon-sm" />
                  Clear All Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {displayLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-destructive font-medium">Failed to load tickets. Please try again.</p>
          </CardContent>
        </Card>
      ) : displayTickets && displayTickets.length > 0 ? (
        <div className="grid gap-5">
          {displayTickets.map((ticket) => {
            const ticketSubject = getTicketSubject(ticket.id);
            return (
              <Card key={ticket.id.toString()} className="interactive-card shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-base font-semibold px-3 py-1">
                          {ticket.displayName || 'Unknown'}
                        </Badge>
                        <Badge 
                          className={getStatusClassName(ticket.status)}
                        >
                          {ticket.status}
                        </Badge>
                        <Badge variant="outline">{ticket.platform}</Badge>
                        <Badge variant="secondary">{ticket.brand}</Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                        {ticketSubject && (
                          <Badge variant="outline" className="bg-accent/50">
                            {ticketSubject}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{ticket.officeName || 'No office name'}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.issueDescription || 'No description'}
                      </p>
                      <div className="flex items-center gap-5 text-xs text-muted-foreground">
                        <span>
                          Submitted: {safeFormatDate(ticket.submissionTime)}
                        </span>
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <span>{ticket.attachments.length} attachment(s)</span>
                        )}
                        {ticket.comments && ticket.comments.length > 0 && (
                          <span>{ticket.comments.length} comment(s)</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(tickets?.find(t => t.id === ticket.id) || null)}
                      className="interactive-button focus-ring flex-shrink-0"
                    >
                      <Eye className="mr-2 icon-sm" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">
              {hasActiveFilters ? 'No tickets match the selected filters or search term' : 'No tickets submitted yet'}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-section-title">Ticket Details</DialogTitle>
            <DialogDescription className="text-card-description">
              View and manage ticket information
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && <TicketDetails ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
