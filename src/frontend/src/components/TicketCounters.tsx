import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Platform, TicketStatus } from '@/backend';
import type { Ticket } from '@/backend';
import { BarChart3, CheckCircle2, Clock, PlayCircle } from 'lucide-react';

interface TicketCountersProps {
  tickets: Ticket[];
  onPlatformClick?: (platform: Platform | null) => void;
  activePlatform?: Platform | null;
}

interface CounterData {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
}

export default function TicketCounters({ tickets, onPlatformClick, activePlatform }: TicketCountersProps) {
  const calculateCounts = (platform?: Platform): CounterData => {
    const filteredTickets = platform
      ? tickets.filter((t) => t.platform === platform)
      : tickets;

    return {
      total: filteredTickets.length,
      submitted: filteredTickets.filter((t) => t.status === TicketStatus.Submitted).length,
      inProgress: filteredTickets.filter((t) => t.status === TicketStatus.InProgress).length,
      resolved: filteredTickets.filter((t) => t.status === TicketStatus.Resolved).length,
    };
  };

  const oneSpanCounts = calculateCounts(Platform.OneSpan);
  const observeAICounts = calculateCounts(Platform.ObserveAI);
  const freshworksCounts = calculateCounts(Platform.Freshworks);
  const allPlatformsCounts = calculateCounts();

  const CounterCard = ({
    title,
    counts,
    variant = 'default',
    platform,
  }: {
    title: string;
    counts: CounterData;
    variant?: 'default' | 'primary';
    platform: Platform | null;
  }) => {
    const isActive = activePlatform === platform;
    const isClickable = !!onPlatformClick;

    return (
      <Card
        className={`transition-all duration-200 ${
          variant === 'primary' ? 'border-primary bg-primary/5' : ''
        } ${isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : ''} ${
          isActive ? 'ring-2 ring-primary shadow-md' : ''
        } focus-ring`}
        onClick={() => onPlatformClick?.(platform)}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onPlatformClick?.(platform);
          }
        }}
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <BarChart3 className="icon-sm" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <span className="text-3xl font-bold">{counts.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Clock className="icon-sm" />
              <span className="text-sm font-medium">Submitted</span>
            </div>
            <span className="text-lg font-semibold text-status-submitted">
              {counts.submitted}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <PlayCircle className="icon-sm" />
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <span className="text-lg font-semibold text-status-inprogress">
              {counts.inProgress}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <CheckCircle2 className="icon-sm" />
              <span className="text-sm font-medium">Resolved</span>
            </div>
            <span className="text-lg font-semibold text-status-resolved">
              {counts.resolved}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <CounterCard title="OneSpan (Nuvola)" counts={oneSpanCounts} platform={Platform.OneSpan} />
      <CounterCard title="Observe.ai" counts={observeAICounts} platform={Platform.ObserveAI} />
      <CounterCard title="Freshworks" counts={freshworksCounts} platform={Platform.Freshworks} />
      <CounterCard title="All Platforms" counts={allPlatformsCounts} variant="primary" platform={null} />
    </div>
  );
}
