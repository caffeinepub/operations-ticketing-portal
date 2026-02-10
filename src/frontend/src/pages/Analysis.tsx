import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TrendingUp, Loader2, PieChart as PieChartIcon } from 'lucide-react';
import { useGetTickets } from '@/hooks/useQueries';
import { Platform, Brand } from '@/backend';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip, PieChart, Pie, Cell } from 'recharts';

type TimeGranularity = 'day' | 'week' | 'month';
type BrandFilter = 'all' | Brand;
type PlatformFilter = 'all' | Platform;

interface AnalysisProps {
  isActive: boolean;
  isAdminAuthenticated: boolean;
}

// Platform colors matching Help Center scheme
const PLATFORM_COLORS = {
  OneSpan: 'oklch(0.65 0.15 180)', // Greenish-blue
  ObserveAI: 'oklch(0.75 0.15 85)', // Yellow
  Freshworks: 'oklch(0.65 0.15 50)', // Orange
};

// Format timestamp to YYYY-M-D
function formatDateKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000); // Convert nanoseconds to milliseconds
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-indexed
  const day = date.getDate();
  return `${year}-${month}-${day}`;
}

// Format date for week aggregation (start of week)
function getWeekKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek; // Get Sunday of the week
  const weekStart = new Date(date.setDate(diff));
  const year = weekStart.getFullYear();
  const month = weekStart.getMonth() + 1;
  const day = weekStart.getDate();
  return `${year}-${month}-${day}`;
}

// Format date for month aggregation
function getMonthKey(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${month}-1`;
}

// Parse date string for sorting
function parseDateForSorting(dateStr: string): number {
  const parts = dateStr.split('-').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  }
  return 0;
}

// Format brand for display
function formatBrandLabel(brand: Brand): string {
  switch (brand) {
    case Brand.AMAXTX:
      return 'A-MAX TX';
    case Brand.ALPA:
      return 'ALPA';
    case Brand.AMAXCA:
      return 'A-MAX CA';
    case Brand.VirtualStore:
      return 'Virtual Store';
  }
}

// Format platform for display
function formatPlatformLabel(platform: Platform): string {
  switch (platform) {
    case Platform.OneSpan:
      return 'OneSpan (Nuvola)';
    case Platform.ObserveAI:
      return 'Observe.ai';
    case Platform.Freshworks:
      return 'Freshworks';
  }
}

export default function Analysis({ isActive, isAdminAuthenticated }: AnalysisProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch all tickets (no filters) - only when admin authenticated and tab is active
  const { data: tickets, isFetching } = useGetTickets(null, null, null, null, null, null, isAdminAuthenticated && isActive);

  // Convert date string to timestamp in nanoseconds
  const getTimestampFromDate = (dateStr: string): bigint | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return BigInt(date.getTime() * 1_000_000);
  };

  const startTimestamp = getTimestampFromDate(startDate);
  const endTimestamp = getTimestampFromDate(endDate);

  // Filter tickets by date range
  const filterTicketsByDateRange = (ticketList: typeof tickets) => {
    if (!ticketList) return [];
    
    let filtered = ticketList;
    
    if (startTimestamp !== null) {
      filtered = filtered.filter(ticket => ticket.submissionTime >= startTimestamp);
    }
    
    if (endTimestamp !== null) {
      // Add 24 hours to include the entire end date
      const endOfDay = endTimestamp + BigInt(24 * 60 * 60 * 1_000_000_000);
      filtered = filtered.filter(ticket => ticket.submissionTime < endOfDay);
    }
    
    return filtered;
  };

  // Aggregate tickets by date based on granularity, brand filter, platform filter, and date range for first chart
  const chartData = (() => {
    if (!tickets || tickets.length === 0) {
      return [];
    }

    // Filter tickets by date range first
    let filteredTickets = filterTicketsByDateRange(tickets);
    
    // Filter tickets by brand and platform
    if (brandFilter !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.brand === brandFilter);
    }
    
    if (platformFilter !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.platform === platformFilter);
    }

    // Count tickets per date per platform
    const dateCounts = new Map<string, { onespan: number; observeai: number; freshworks: number }>();

    filteredTickets.forEach(ticket => {
      let dateKey: string;
      
      switch (granularity) {
        case 'day':
          dateKey = formatDateKey(ticket.submissionTime);
          break;
        case 'week':
          dateKey = getWeekKey(ticket.submissionTime);
          break;
        case 'month':
          dateKey = getMonthKey(ticket.submissionTime);
          break;
      }

      const current = dateCounts.get(dateKey) || { onespan: 0, observeai: 0, freshworks: 0 };
      
      if (ticket.platform === Platform.OneSpan) {
        current.onespan += 1;
      } else if (ticket.platform === Platform.ObserveAI) {
        current.observeai += 1;
      } else if (ticket.platform === Platform.Freshworks) {
        current.freshworks += 1;
      }

      dateCounts.set(dateKey, current);
    });

    // Convert to array and sort by date
    return Array.from(dateCounts.entries())
      .map(([period, counts]) => ({
        period,
        sortKey: parseDateForSorting(period),
        OneSpan: counts.onespan,
        'Observe.ai': counts.observeai,
        Freshworks: counts.freshworks,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  })();

  // Aggregate tickets for pie chart (platform distribution)
  const pieChartData = (() => {
    if (!tickets || tickets.length === 0) {
      return [];
    }

    // Filter tickets by date range first
    let filteredTickets = filterTicketsByDateRange(tickets);
    
    // Filter tickets by brand
    if (brandFilter !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.brand === brandFilter);
    }

    // Count tickets per platform
    const platformCounts = {
      onespan: 0,
      observeai: 0,
      freshworks: 0,
    };

    filteredTickets.forEach(ticket => {
      if (ticket.platform === Platform.OneSpan) {
        platformCounts.onespan += 1;
      } else if (ticket.platform === Platform.ObserveAI) {
        platformCounts.observeai += 1;
      } else if (ticket.platform === Platform.Freshworks) {
        platformCounts.freshworks += 1;
      }
    });

    const total = platformCounts.onespan + platformCounts.observeai + platformCounts.freshworks;

    if (total === 0) return [];

    return [
      {
        name: 'OneSpan',
        value: platformCounts.onespan,
        percentage: ((platformCounts.onespan / total) * 100).toFixed(1),
        color: PLATFORM_COLORS.OneSpan,
      },
      {
        name: 'Observe.ai',
        value: platformCounts.observeai,
        percentage: ((platformCounts.observeai / total) * 100).toFixed(1),
        color: PLATFORM_COLORS.ObserveAI,
      },
      {
        name: 'Freshworks',
        value: platformCounts.freshworks,
        percentage: ((platformCounts.freshworks / total) * 100).toFixed(1),
        color: PLATFORM_COLORS.Freshworks,
      },
    ].filter(item => item.value > 0);
  })();

  // Aggregate tickets by date for third chart (total counts only, no platform filter)
  const totalChartData = (() => {
    if (!tickets || tickets.length === 0) {
      return [];
    }

    // Filter tickets by date range first
    let filteredTickets = filterTicketsByDateRange(tickets);
    
    // Filter tickets by brand only (no platform filter for totals)
    if (brandFilter !== 'all') {
      filteredTickets = filteredTickets.filter(ticket => ticket.brand === brandFilter);
    }

    // Count total tickets per date
    const dateCounts = new Map<string, number>();

    filteredTickets.forEach(ticket => {
      let dateKey: string;
      
      switch (granularity) {
        case 'day':
          dateKey = formatDateKey(ticket.submissionTime);
          break;
        case 'week':
          dateKey = getWeekKey(ticket.submissionTime);
          break;
        case 'month':
          dateKey = getMonthKey(ticket.submissionTime);
          break;
      }

      const current = dateCounts.get(dateKey) || 0;
      dateCounts.set(dateKey, current + 1);
    });

    // Convert to array and sort by date
    return Array.from(dateCounts.entries())
      .map(([period, count]) => ({
        period,
        sortKey: parseDateForSorting(period),
        Total: count,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  })();

  const hasData = chartData.length > 0;
  const hasPieData = pieChartData.length > 0;
  const hasTotalData = totalChartData.length > 0;

  // Determine which bars to show based on platform filter (first chart only)
  const showOneSpan = platformFilter === 'all' || platformFilter === Platform.OneSpan;
  const showObserveAI = platformFilter === 'all' || platformFilter === Platform.ObserveAI;
  const showFreshworks = platformFilter === 'all' || platformFilter === Platform.Freshworks;

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter - Applies to all charts */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Select a date range to filter all charts below</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="start-date" className="text-sm font-medium whitespace-nowrap">
                Start Date:
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="end-date" className="text-sm font-medium whitespace-nowrap">
                End Date:
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* First Chart - Platform-Specific Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ticket Submission Analytics by Platform
              </CardTitle>
              <CardDescription>Track ticket submissions over time by platform</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="platform-filter" className="text-sm font-medium whitespace-nowrap">
                  Platform:
                </Label>
                <Select
                  value={platformFilter}
                  onValueChange={(value) => setPlatformFilter(value as PlatformFilter)}
                  disabled={isFetching}
                >
                  <SelectTrigger id="platform-filter" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={Platform.OneSpan}>{formatPlatformLabel(Platform.OneSpan)}</SelectItem>
                    <SelectItem value={Platform.ObserveAI}>{formatPlatformLabel(Platform.ObserveAI)}</SelectItem>
                    <SelectItem value={Platform.Freshworks}>{formatPlatformLabel(Platform.Freshworks)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="brand-filter" className="text-sm font-medium whitespace-nowrap">
                  Brand:
                </Label>
                <Select
                  value={brandFilter}
                  onValueChange={(value) => setBrandFilter(value as BrandFilter)}
                  disabled={isFetching}
                >
                  <SelectTrigger id="brand-filter" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={Brand.AMAXTX}>{formatBrandLabel(Brand.AMAXTX)}</SelectItem>
                    <SelectItem value={Brand.ALPA}>{formatBrandLabel(Brand.ALPA)}</SelectItem>
                    <SelectItem value={Brand.AMAXCA}>{formatBrandLabel(Brand.AMAXCA)}</SelectItem>
                    <SelectItem value={Brand.VirtualStore}>{formatBrandLabel(Brand.VirtualStore)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={granularity === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('day')}
                  disabled={isFetching}
                >
                  Days
                </Button>
                <Button
                  variant={granularity === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('week')}
                  disabled={isFetching}
                >
                  Weeks
                </Button>
                <Button
                  variant={granularity === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('month')}
                  disabled={isFetching}
                >
                  Months
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={hasData ? chartData : [{ period: 'No Data', OneSpan: 0, 'Observe.ai': 0, Freshworks: 0 }]} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  style={{ fontSize: '12px' }}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  label={{ 
                    value: 'Ticket Count', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--foreground))' }
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                {showOneSpan && (
                  <Bar 
                    dataKey="OneSpan" 
                    fill={PLATFORM_COLORS.OneSpan}
                    name="OneSpan"
                  />
                )}
                {showObserveAI && (
                  <Bar 
                    dataKey="Observe.ai" 
                    fill={PLATFORM_COLORS.ObserveAI}
                    name="Observe.ai"
                  />
                )}
                {showFreshworks && (
                  <Bar 
                    dataKey="Freshworks" 
                    fill={PLATFORM_COLORS.Freshworks}
                    name="Freshworks"
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
            {isFetching && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasData && !isFetching && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground text-sm font-medium bg-background/80 px-4 py-2 rounded-md">
                  No ticket data available for this time period
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Second Chart - Pie Chart for Platform Distribution */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Platform Distribution
              </CardTitle>
              <CardDescription>Ticket distribution across platforms</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="brand-filter-pie" className="text-sm font-medium whitespace-nowrap">
                  Brand:
                </Label>
                <Select
                  value={brandFilter}
                  onValueChange={(value) => setBrandFilter(value as BrandFilter)}
                  disabled={isFetching}
                >
                  <SelectTrigger id="brand-filter-pie" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={Brand.AMAXTX}>{formatBrandLabel(Brand.AMAXTX)}</SelectItem>
                    <SelectItem value={Brand.ALPA}>{formatBrandLabel(Brand.ALPA)}</SelectItem>
                    <SelectItem value={Brand.AMAXCA}>{formatBrandLabel(Brand.AMAXCA)}</SelectItem>
                    <SelectItem value={Brand.VirtualStore}>{formatBrandLabel(Brand.VirtualStore)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hasPieData ? pieChartData : [{ name: 'No Data', value: 1, color: 'hsl(var(--muted))' }]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage, value }) => 
                    hasPieData ? `${name}: ${value} (${percentage}%)` : 'No Data'
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {hasPieData ? (
                    pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  ) : (
                    <Cell fill="hsl(var(--muted))" />
                  )}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (!hasPieData) return [value, name];
                    const percentage = props.payload.percentage;
                    return [`${value} tickets (${percentage}%)`, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value, entry: any) => {
                    if (!hasPieData) return value;
                    const item = pieChartData.find(d => d.name === value);
                    return item ? `${value} (${item.percentage}%)` : value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {isFetching && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasPieData && !isFetching && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground text-sm font-medium bg-background/80 px-4 py-2 rounded-md">
                  No ticket data available for this time period
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Third Chart - Total Counts Only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Total Ticket Submissions
              </CardTitle>
              <CardDescription>Track total ticket submissions over time (all platforms combined)</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="brand-filter-total" className="text-sm font-medium whitespace-nowrap">
                  Brand:
                </Label>
                <Select
                  value={brandFilter}
                  onValueChange={(value) => setBrandFilter(value as BrandFilter)}
                  disabled={isFetching}
                >
                  <SelectTrigger id="brand-filter-total" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value={Brand.AMAXTX}>{formatBrandLabel(Brand.AMAXTX)}</SelectItem>
                    <SelectItem value={Brand.ALPA}>{formatBrandLabel(Brand.ALPA)}</SelectItem>
                    <SelectItem value={Brand.AMAXCA}>{formatBrandLabel(Brand.AMAXCA)}</SelectItem>
                    <SelectItem value={Brand.VirtualStore}>{formatBrandLabel(Brand.VirtualStore)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={granularity === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('day')}
                  disabled={isFetching}
                >
                  Days
                </Button>
                <Button
                  variant={granularity === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('week')}
                  disabled={isFetching}
                >
                  Weeks
                </Button>
                <Button
                  variant={granularity === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGranularity('month')}
                  disabled={isFetching}
                >
                  Months
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={hasTotalData ? totalChartData : [{ period: 'No Data', Total: 0 }]} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="period" 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  style={{ fontSize: '12px' }}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  label={{ 
                    value: 'Ticket Count', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'hsl(var(--foreground))' }
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar 
                  dataKey="Total" 
                  fill="hsl(221, 83%, 53%)" 
                  name="Total"
                />
              </BarChart>
            </ResponsiveContainer>
            {isFetching && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasTotalData && !isFetching && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground text-sm font-medium bg-background/80 px-4 py-2 rounded-md">
                  No ticket data available for this time period
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
