import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Search, BookOpen, Info, ChevronDown } from 'lucide-react';
import { useGetHelpTopics } from '@/hooks/useQueries';
import { Platform, HelpTopic } from '@/backend';
import { useScrollCues } from '@/hooks/useScrollCues';

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'All'>('All');
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { canScrollUp, canScrollDown, hasScrolled } = useScrollCues(scrollContainerRef);

  const { data: topics, isLoading, error } = useGetHelpTopics();

  const filteredTopics = useMemo(() => {
    if (!topics) return [];

    let filtered = topics;

    // Filter by platform
    if (platformFilter !== 'All') {
      filtered = filtered.filter((topic) => topic.platform === platformFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((topic) =>
        topic.topicName.toLowerCase().includes(searchLower) ||
        topic.explanation.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [topics, platformFilter, searchTerm]);

  const getPlatformLabel = (platform: Platform): string => {
    switch (platform) {
      case Platform.OneSpan:
        return 'OneSpan (Nuvola)';
      case Platform.ObserveAI:
        return 'Observe.ai';
      case Platform.Freshworks:
        return 'Freshworks';
      default:
        return platform;
    }
  };

  const getPlatformLogo = (platform: Platform): string => {
    switch (platform) {
      case Platform.OneSpan:
        return '/assets/onespanlogo.jpg';
      case Platform.ObserveAI:
        return '/assets/observeailogo.jpg';
      case Platform.Freshworks:
        return '/assets/FWlogo.jpg';
      default:
        return '';
    }
  };

  const getPlatformButtonClass = (platform: Platform): string => {
    const isActive = platformFilter === platform;
    
    switch (platform) {
      case Platform.OneSpan:
        return isActive 
          ? 'bg-[oklch(0.65_0.15_180)] hover:bg-[oklch(0.60_0.15_180)] text-white border-[oklch(0.65_0.15_180)]'
          : 'border-[oklch(0.65_0.15_180)] text-[oklch(0.65_0.15_180)] hover:bg-[oklch(0.65_0.15_180)]/10';
      case Platform.ObserveAI:
        return isActive
          ? 'bg-[oklch(0.75_0.15_85)] hover:bg-[oklch(0.70_0.15_85)] text-gray-900 border-[oklch(0.75_0.15_85)]'
          : 'border-[oklch(0.75_0.15_85)] text-[oklch(0.75_0.15_85)] hover:bg-[oklch(0.75_0.15_85)]/10';
      case Platform.Freshworks:
        return isActive
          ? 'bg-[oklch(0.65_0.15_50)] hover:bg-[oklch(0.60_0.15_50)] text-white border-[oklch(0.65_0.15_50)]'
          : 'border-[oklch(0.65_0.15_50)] text-[oklch(0.65_0.15_50)] hover:bg-[oklch(0.65_0.15_50)]/10';
      default:
        return '';
    }
  };

  const getPlatformBorderClass = (platform: Platform): string => {
    switch (platform) {
      case Platform.OneSpan:
        return 'border-[oklch(0.65_0.15_180)]';
      case Platform.ObserveAI:
        return 'border-[oklch(0.75_0.15_85)]';
      case Platform.Freshworks:
        return 'border-[oklch(0.65_0.15_50)]';
      default:
        return '';
    }
  };

  const getPlatformTextColor = (platform: Platform): string => {
    switch (platform) {
      case Platform.OneSpan:
        return 'text-[oklch(0.65_0.15_180)]';
      case Platform.ObserveAI:
        return 'text-[oklch(0.75_0.15_85)]';
      case Platform.Freshworks:
        return 'text-[oklch(0.65_0.15_50)]';
      default:
        return '';
    }
  };

  const handlePlatformClick = (platform: Platform) => {
    // Toggle: if clicking the active button, reset to show all
    if (platformFilter === platform) {
      setPlatformFilter('All');
    } else {
      setPlatformFilter(platform);
    }
  };

  const handleTopicClick = (topic: HelpTopic) => {
    setSelectedTopic(topic);
  };

  const renderExplanationWithLinks = (text: string) => {
    // Parse HTML and render links as clickable
    const parts: (string | React.ReactElement)[] = [];
    const linkRegex = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the clickable link
      parts.push(
        <a
          key={match.index}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 font-medium"
        >
          {match[2]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Sticky Search and Filter Section */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Help Center</CardTitle>
                <CardDescription>Find answers to common questions and issues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Guidance */}
            <div className="flex items-start gap-2 rounded-lg border border-muted bg-muted/30 p-3">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Click a topic below to view the solution
              </p>
            </div>

            {/* Search Bar */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Topics</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search help topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Platform Filter Buttons */}
            <div className="space-y-2">
              <Label>Filter by Platform</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePlatformClick(Platform.OneSpan)}
                  className={`transition-all ${getPlatformButtonClass(Platform.OneSpan)}`}
                >
                  OneSpan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePlatformClick(Platform.ObserveAI)}
                  className={`transition-all ${getPlatformButtonClass(Platform.ObserveAI)}`}
                >
                  Observe.ai
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePlatformClick(Platform.Freshworks)}
                  className={`transition-all ${getPlatformButtonClass(Platform.Freshworks)}`}
                >
                  Freshworks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics Grid with Scroll Cues */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load help topics. Please try again.</p>
          </CardContent>
        </Card>
      ) : filteredTopics.length > 0 ? (
        <div className="relative">
          {/* Top gradient fade */}
          <div 
            className={`scroll-fade-top ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          
          {/* Top scroll shadow */}
          <div 
            className={`scroll-shadow-top ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          
          {/* Scrollable container */}
          <div 
            ref={scrollContainerRef}
            className="max-h-[600px] overflow-y-auto scroll-smooth px-1"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => (
                <Card 
                  key={topic.id.toString()} 
                  className={`flex flex-col h-[120px] border-2 ${getPlatformBorderClass(topic.platform)} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => handleTopicClick(topic)}
                  title={topic.topicName}
                >
                  <CardContent className="py-4 flex-1 overflow-hidden flex items-center">
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="flex items-center justify-center flex-shrink-0">
                        <img 
                          src={getPlatformLogo(topic.platform)} 
                          alt={getPlatformLabel(topic.platform)}
                          className="h-16 w-auto object-contain"
                        />
                      </div>
                      <span className="text-lg font-bold truncate flex-1 min-w-0">
                        {topic.topicName}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Bottom scroll shadow */}
          <div 
            className={`scroll-shadow-bottom ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          
          {/* Bottom gradient fade */}
          <div 
            className={`scroll-fade-bottom ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          
          {/* Scroll hint */}
          <div 
            className={`scroll-hint ${!hasScrolled && canScrollDown ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">Scroll to view more</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || platformFilter !== 'All'
                ? 'No help topics match your search or filter'
                : 'No help topics available yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Topic Detail Modal */}
      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTopic && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <img 
                    src={getPlatformLogo(selectedTopic.platform)} 
                    alt={getPlatformLabel(selectedTopic.platform)}
                    className="h-6 w-auto object-contain"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {getPlatformLabel(selectedTopic.platform)}
                  </span>
                </div>
                <DialogTitle className="text-2xl">{selectedTopic.topicName}</DialogTitle>
                <DialogDescription className="sr-only">
                  Help topic explanation for {selectedTopic.topicName}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                {selectedTopic.explanation && selectedTopic.explanation.trim() ? (
                  <div className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {renderExplanationWithLinks(selectedTopic.explanation)}
                  </div>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    No explanation available
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
