import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Edit2, Trash2, Upload, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetHelpTopicsDraft,
  useSaveHelpTopic,
  useDeleteHelpTopic,
  usePublishHelpContent,
} from '@/hooks/useQueries';
import { Platform } from '@/backend';
import type { HelpTopic } from '@/backend';

interface EditHelpCenterProps {
  isAdminAuthenticated: boolean;
}

export default function EditHelpCenter({ isAdminAuthenticated }: EditHelpCenterProps) {
  const [editingTopic, setEditingTopic] = useState<HelpTopic | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicPlatform, setTopicPlatform] = useState<Platform>(Platform.OneSpan);
  const [explanation, setExplanation] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: draftTopics, isLoading } = useGetHelpTopicsDraft(isAdminAuthenticated);
  const saveTopicMutation = useSaveHelpTopic();
  const deleteTopicMutation = useDeleteHelpTopic();
  const publishMutation = usePublishHelpContent();

  const handleNewTopic = () => {
    setEditingTopic(null);
    setTopicName('');
    setTopicPlatform(Platform.OneSpan);
    setExplanation('');
  };

  const handleEditTopic = (topic: HelpTopic) => {
    setEditingTopic(topic);
    setTopicName(topic.topicName);
    setTopicPlatform(topic.platform);
    setExplanation(topic.explanation);
  };

  const handleInsertHyperlink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = explanation.substring(start, end);

    if (!selectedText) {
      toast.error('Please select text to convert into a hyperlink');
      return;
    }

    const url = prompt('Enter the URL for the hyperlink:');
    if (!url) return;

    // Validate URL format
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    const hyperlinkTag = `<a href="${validUrl}">${selectedText}</a>`;
    const newExplanation = explanation.substring(0, start) + hyperlinkTag + explanation.substring(end);
    
    setExplanation(newExplanation);
    toast.success('Hyperlink inserted successfully');

    // Restore focus to textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + hyperlinkTag.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSaveTopic = async () => {
    if (!topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }

    if (!explanation.trim()) {
      toast.error('Explanation text is required');
      return;
    }

    // Create topic object with proper structure
    // For new topics, use id: 0n which the backend will recognize as a new topic
    // For existing topics, use the existing id
    const topic: HelpTopic = {
      id: editingTopic?.id ?? 0n,
      topicName: topicName.trim(),
      platform: topicPlatform,
      explanation: explanation.trim(),
      createdTime: editingTopic?.createdTime ?? 0n,
      modifiedTime: 0n,
    };

    try {
      const newTopicId = await saveTopicMutation.mutateAsync(topic);
      toast.success(editingTopic ? 'Topic updated successfully' : 'Topic created successfully');
      handleNewTopic();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to save topic';
      toast.error(errorMessage);
      console.error('Save topic error:', error);
    }
  };

  const handleDeleteTopic = async (topicId: bigint) => {
    if (!confirm('Are you sure you want to delete this topic?')) return;

    try {
      await deleteTopicMutation.mutateAsync(topicId);
      toast.success('Topic deleted successfully');
      if (editingTopic && editingTopic.id === topicId) {
        handleNewTopic();
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to delete topic';
      toast.error(errorMessage);
      console.error('Delete topic error:', error);
    }
  };

  const handlePublish = async () => {
    if (!draftTopics || draftTopics.length === 0) {
      toast.error('No topics to publish');
      return;
    }

    if (!confirm('Publish all changes to the public Help Center?')) return;

    try {
      await publishMutation.mutateAsync();
      toast.success('Help content published successfully');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to publish help content';
      toast.error(errorMessage);
      console.error('Publish error:', error);
    }
  };

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
          className="text-primary underline hover:text-primary/80"
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

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Help Center</CardTitle>
              <CardDescription>Manage help topics and publish changes</CardDescription>
            </div>
            <Button onClick={handlePublish} disabled={publishMutation.isPending || !draftTopics || draftTopics.length === 0}>
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Publish Changes
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Topic Editor */}
        <Card>
          <CardHeader>
            <CardTitle>{editingTopic ? 'Edit Topic' : 'Create New Topic'}</CardTitle>
            <CardDescription>
              {editingTopic ? 'Update topic details' : 'Add a new help topic'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topicName">Topic Title</Label>
              <Input
                id="topicName"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Enter topic title"
              />
            </div>

            <div className="space-y-2">
              <Label>Platform Category</Label>
              <Select value={topicPlatform} onValueChange={(value) => setTopicPlatform(value as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Platform.OneSpan}>OneSpan (Nuvola)</SelectItem>
                  <SelectItem value={Platform.ObserveAI}>Observe.ai</SelectItem>
                  <SelectItem value={Platform.Freshworks}>Freshworks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="explanation">Explanation / Solution</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInsertHyperlink}
                  className="h-8"
                >
                  <LinkIcon className="mr-2 h-3 w-3" />
                  Add Link
                </Button>
              </div>
              <Textarea
                ref={textareaRef}
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Enter detailed explanation or solution for this topic..."
                rows={8}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Select text and click "Add Link" to create a hyperlink. Provide a detailed explanation or solution that will be displayed when users expand this topic.
              </p>
            </div>

            {explanation && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-lg border bg-muted/50 p-4 text-sm whitespace-pre-wrap">
                  {renderExplanationWithLinks(explanation)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveTopic} disabled={saveTopicMutation.isPending} className="flex-1">
                {saveTopicMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingTopic ? 'Update Topic' : 'Create Topic'}
              </Button>
              {editingTopic && (
                <Button variant="outline" onClick={handleNewTopic}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Topics List */}
        <Card>
          <CardHeader>
            <CardTitle>Draft Topics</CardTitle>
            <CardDescription>Manage existing help topics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : draftTopics && draftTopics.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {draftTopics.map((topic) => (
                  <AccordionItem key={topic.id.toString()} value={topic.id.toString()}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{topic.topicName}</span>
                        <Badge variant="outline">{getPlatformLabel(topic.platform)}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-4">
                        <div className="text-sm">
                          <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                            {renderExplanationWithLinks(topic.explanation || 'No explanation provided')}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTopic(topic)}
                          >
                            <Edit2 className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTopic(topic.id)}
                            disabled={deleteTopicMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                No draft topics yet. Create your first topic!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
