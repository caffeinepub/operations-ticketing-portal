import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Platform, TicketStatus, Brand, TicketPriority, ExternalBlob } from '@/backend';
import type { Ticket, GetTicketsArgs, CreateTicketArgs, AddCommentArgs, UpdateStatusArgs, UpdateTicketPriorityArgs, HelpTopic } from '@/backend';

export function useGetTickets(
  platformFilter: Platform | null,
  statusFilter: TicketStatus | null,
  brandFilter: Brand | null,
  priorityFilter: TicketPriority | null,
  startDate: bigint | null,
  endDate: bigint | null,
  enabled: boolean = true
) {
  const { actor, isFetching } = useActor();

  return useQuery<Ticket[]>({
    queryKey: ['tickets', platformFilter, statusFilter, brandFilter, priorityFilter, startDate?.toString(), endDate?.toString()],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      
      const args: GetTicketsArgs = {
        platformFilter: platformFilter ?? undefined,
        statusFilter: statusFilter ?? undefined,
        brandFilter: brandFilter ?? undefined,
        priorityFilter: priorityFilter ?? undefined,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      };
      
      const tickets = await actor.getTickets(args);
      return tickets;
    },
    enabled: !!actor && !isFetching && enabled,
    retry: 3,
    retryDelay: 1000,
  });
}

export function useSearchTickets(searchTerm: string, enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<Ticket[]>({
    queryKey: ['searchTickets', searchTerm],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      
      const tickets = await actor.searchTickets(searchTerm);
      return tickets;
    },
    enabled: !!actor && !isFetching && searchTerm.trim().length > 0 && enabled,
    retry: 3,
    retryDelay: 1000,
  });
}

export function useGetTicket(ticketId: bigint | null, enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<Ticket | null>({
    queryKey: ['ticket', ticketId?.toString()],
    queryFn: async () => {
      if (!actor || ticketId === null) {
        return null;
      }
      
      const ticket = await actor.getTicket(ticketId);
      return ticket;
    },
    enabled: !!actor && !isFetching && ticketId !== null && enabled,
    retry: 3,
    retryDelay: 1000,
  });
}

interface FileMetadata {
  name: string;
  type: string;
  size: number;
}

export function useSubmitTicket() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      brand,
      subject,
      issueDescription,
      officeName,
      agentName,
      employeeId,
      email,
      freshworksEmail,
      extension,
      policyNumber,
      attachments,
      fileMetadata,
    }: {
      platform: Platform;
      brand: Brand;
      subject: string;
      issueDescription: string;
      officeName: string;
      agentName: string;
      employeeId: string;
      email: string;
      freshworksEmail: string | null;
      extension: string | null;
      policyNumber: string | null;
      attachments: ExternalBlob[];
      fileMetadata?: FileMetadata[];
    }) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      
      const args: CreateTicketArgs = {
        platform,
        issueDescription,
        officeName,
        agentName,
        employeeId,
        email,
        freshworksEmail: freshworksEmail ?? undefined,
        extension: extension ?? undefined,
        brand,
        policyNumber: policyNumber ?? undefined,
        attachments,
      };
      
      const ticketId = await actor.submitTicket(args);
      
      // Store file metadata and subject in localStorage
      if (fileMetadata && fileMetadata.length > 0) {
        localStorage.setItem(`ticket-${ticketId}-metadata`, JSON.stringify(fileMetadata));
      }
      
      localStorage.setItem(`ticket-${ticketId}-subject`, subject);
      
      return ticketId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['searchTickets'] });
    },
    onError: (error: any) => {
      console.error('[useSubmitTicket] Error submitting ticket:', error);
      throw error;
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      author,
      content,
    }: {
      ticketId: bigint;
      author: string;
      content: string;
    }) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      const args: AddCommentArgs = {
        ticketId,
        author,
        content,
      };
      return actor.addComment(args);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['searchTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId.toString()] });
    },
    onError: (error: any) => {
      console.error('Error adding comment:', error);
      throw error;
    },
  });
}

export function useUpdateTicketStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      newStatus,
    }: {
      ticketId: bigint;
      newStatus: TicketStatus;
    }) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      const args: UpdateStatusArgs = {
        ticketId,
        newStatus,
      };
      return actor.updateTicketStatus(args);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['searchTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId.toString()] });
    },
    onError: (error: any) => {
      console.error('Error updating ticket status:', error);
      throw error;
    },
  });
}

export function useUpdateTicketPriority() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      newPriority,
    }: {
      ticketId: bigint;
      newPriority: TicketPriority;
    }) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      const args: UpdateTicketPriorityArgs = {
        ticketId,
        newPriority,
      };
      return actor.updateTicketPriority(args);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['searchTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId.toString()] });
    },
    onError: (error: any) => {
      console.error('Error updating ticket priority:', error);
      throw error;
    },
  });
}

// Help Center Queries
export function useGetHelpTopics() {
  const { actor, isFetching } = useActor();

  return useQuery<HelpTopic[]>({
    queryKey: ['helpTopics'],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      return actor.getHelpTopics();
    },
    enabled: !!actor && !isFetching,
    retry: 3,
    retryDelay: 1000,
  });
}

export function useGetHelpTopicsDraft(enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<HelpTopic[]>({
    queryKey: ['helpTopicsDraft'],
    queryFn: async () => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      return actor.getHelpTopicsDraft();
    },
    enabled: !!actor && !isFetching && enabled,
    retry: 3,
    retryDelay: 1000,
  });
}

export function useSaveHelpTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topic: HelpTopic) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      
      const topicToSave: HelpTopic = {
        id: topic.id,
        topicName: topic.topicName.trim(),
        platform: topic.platform,
        explanation: topic.explanation.trim(),
        createdTime: topic.createdTime,
        modifiedTime: topic.modifiedTime,
      };
      
      const newTopicId = await actor.saveHelpTopic(topicToSave);
      return newTopicId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpTopicsDraft'] });
    },
    onError: (error: any) => {
      console.error('Error saving help topic:', error);
      throw error;
    },
  });
}

export function useDeleteHelpTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (topicId: bigint) => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      return actor.deleteHelpTopic(topicId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpTopicsDraft'] });
    },
    onError: (error: any) => {
      console.error('Error deleting help topic:', error);
      throw error;
    },
  });
}

export function usePublishHelpContent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) {
        throw new Error('Actor not initialized');
      }
      return actor.publishHelpContent();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpTopics'] });
      queryClient.invalidateQueries({ queryKey: ['helpTopicsDraft'] });
    },
    onError: (error: any) => {
      console.error('Error publishing help content:', error);
      throw error;
    },
  });
}
