import type { Ticket, Comment } from '@/backend';
import { TicketStatus, TicketPriority, Platform, Brand } from '@/backend';

/**
 * HARDENING NOTE (Option 1 - Schema Safety):
 * 
 * This utility provides safe, non-crashing access to ticket fields that may be
 * missing, null, or undefined on older tickets stored before schema changes.
 * 
 * UNSAFE FIELDS IDENTIFIED:
 * - displayName: may be missing on very old tickets
 * - platform: may be missing or have unexpected values
 * - brand: may be missing or have unexpected values
 * - status: may be missing or have unexpected values
 * - priority: may be missing or have unexpected values
 * - officeName: may be empty or missing
 * - issueDescription: may be empty or missing
 * - attachments: may be undefined instead of empty array
 * - comments: may be undefined instead of empty array
 * - submissionTime: may be missing or zero
 * - freshworksEmail: optional field, may be undefined or null
 * - extension: optional field, may be undefined or null
 * - policyNumber: optional field, may be undefined or null
 * 
 * APPROACH:
 * - Apply defensive defaults for all fields
 * - Never crash on missing data
 * - Preserve existing UI behavior where possible
 * - Treat backend response as source of truth
 */

export interface SafeTicket {
  id: bigint;
  displayName: string;
  platform: Platform;
  brand: Brand;
  status: TicketStatus;
  priority: TicketPriority;
  officeName: string;
  issueDescription: string;
  agentName: string;
  employeeId: string;
  email: string;
  freshworksEmail: string | null;
  extension: string | null;
  policyNumber: string | null;
  attachments: any[];
  comments: Comment[];
  submissionTime: bigint;
}

/**
 * Safely normalize a ticket object, applying defaults for any missing fields.
 * This prevents UI crashes when rendering tickets with incomplete data.
 */
export function safeTicket(ticket: Ticket | null | undefined): SafeTicket | null {
  if (!ticket) return null;

  return {
    id: ticket.id ?? 0n,
    displayName: ticket.displayName ?? 'Unknown',
    platform: ticket.platform ?? Platform.OneSpan,
    brand: ticket.brand ?? Brand.AMAXTX,
    status: ticket.status ?? TicketStatus.Submitted,
    priority: ticket.priority ?? TicketPriority.empty,
    officeName: ticket.officeName ?? '',
    issueDescription: ticket.issueDescription ?? '',
    agentName: ticket.agentName ?? '',
    employeeId: ticket.employeeId ?? '',
    email: ticket.email ?? '',
    freshworksEmail: ticket.freshworksEmail ?? null,
    extension: ticket.extension ?? null,
    policyNumber: ticket.policyNumber ?? null,
    attachments: Array.isArray(ticket.attachments) ? ticket.attachments : [],
    comments: Array.isArray(ticket.comments) ? ticket.comments : [],
    submissionTime: ticket.submissionTime ?? 0n,
  };
}

/**
 * Safely normalize an array of tickets.
 */
export function safeTickets(tickets: Ticket[] | null | undefined): SafeTicket[] {
  if (!tickets || !Array.isArray(tickets)) return [];
  return tickets.map(t => safeTicket(t)).filter((t): t is SafeTicket => t !== null);
}

/**
 * Safe date formatting that handles missing or invalid timestamps.
 */
export function safeFormatDate(timestamp: bigint | null | undefined): string {
  if (!timestamp || timestamp === 0n) return 'Unknown date';
  try {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Safe datetime formatting that handles missing or invalid timestamps.
 */
export function safeFormatDateTime(timestamp: bigint | null | undefined): string {
  if (!timestamp || timestamp === 0n) return 'Unknown date';
  try {
    return new Date(Number(timestamp) / 1_000_000).toLocaleString();
  } catch {
    return 'Invalid date';
  }
}
