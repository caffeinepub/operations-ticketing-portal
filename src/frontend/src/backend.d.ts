import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface CreateTicketArgs {
    freshworksEmail?: string;
    issueDescription: string;
    officeName: string;
    agentName: string;
    platform: Platform;
    email: string;
    employeeId: string;
    brand: Brand;
    policyNumber?: string;
    extension?: string;
    attachments: Array<ExternalBlob>;
}
export interface Comment {
    content: string;
    author: string;
    timestamp: bigint;
}
export interface UpdateStatusArgs {
    ticketId: bigint;
    newStatus: TicketStatus;
}
export interface UpdateTicketPriorityArgs {
    ticketId: bigint;
    newPriority: TicketPriority;
}
export interface AddCommentArgs {
    content: string;
    ticketId: bigint;
    author: string;
}
export interface TicketAnalytics {
    periods: Array<[string, PeriodCounts]>;
}
export interface AnalyticsRequest {
    startTime: bigint;
    endTime: bigint;
    granularity: Granularity;
}
export interface GetTicketsArgs {
    endDate?: bigint;
    brandFilter?: Brand;
    priorityFilter?: TicketPriority;
    platformFilter?: Platform;
    statusFilter?: TicketStatus;
    startDate?: bigint;
}
export interface Ticket {
    id: bigint;
    status: TicketStatus;
    freshworksEmail?: string;
    issueDescription: string;
    displayName: string;
    officeName: string;
    agentName: string;
    platform: Platform;
    email: string;
    employeeId: string;
    submissionTime: bigint;
    brand: Brand;
    priority: TicketPriority;
    comments: Array<Comment>;
    policyNumber?: string;
    extension?: string;
    attachments: Array<ExternalBlob>;
}
export interface PeriodCounts {
    total: bigint;
    freshworks: bigint;
    observeAI: bigint;
    onespan: bigint;
}
export interface HelpTopic {
    id: bigint;
    explanation: string;
    createdTime: bigint;
    platform: Platform;
    modifiedTime: bigint;
    topicName: string;
}
export enum Brand {
    ALPA = "ALPA",
    VirtualStore = "VirtualStore",
    AMAXCA = "AMAXCA",
    AMAXTX = "AMAXTX"
}
export enum Granularity {
    day = "day",
    month = "month",
    week = "week"
}
export enum Platform {
    Freshworks = "Freshworks",
    OneSpan = "OneSpan",
    ObserveAI = "ObserveAI"
}
export enum TicketPriority {
    low = "low",
    high = "high",
    empty = "empty",
    medium = "medium"
}
export enum TicketStatus {
    Submitted = "Submitted",
    InProgress = "InProgress",
    Resolved = "Resolved"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(args: AddCommentArgs): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteHelpTopic(topicId: bigint): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    getHelpTopics(): Promise<Array<HelpTopic>>;
    getHelpTopicsDraft(): Promise<Array<HelpTopic>>;
    getTicket(ticketId: bigint): Promise<Ticket | null>;
    getTicketAnalytics(req: AnalyticsRequest): Promise<TicketAnalytics>;
    getTickets(args: GetTicketsArgs): Promise<Array<Ticket>>;
    isCallerAdmin(): Promise<boolean>;
    publishHelpContent(): Promise<void>;
    saveHelpTopic(topic: HelpTopic): Promise<bigint>;
    searchTickets(searchTerm: string): Promise<Array<Ticket>>;
    submitTicket(args: CreateTicketArgs): Promise<bigint>;
    updateTicketPriority(args: UpdateTicketPriorityArgs): Promise<void>;
    updateTicketStatus(args: UpdateStatusArgs): Promise<void>;
}
