/**
 * Google Calendar Connector
 * Integrates with Google Calendar API
 */

import { BaseConnector } from './BaseConnector';

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
    reminders?: Array<{
        method: 'email' | 'popup';
        minutes: number;
    }>;
    recurrence?: string[];
}

export interface CreateEventOptions {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
    reminders?: Array<{
        method: 'email' | 'popup';
        minutes: number;
    }>;
    recurrence?: string[];
}

export class GoogleCalendarConnector extends BaseConnector {
    private accessToken: string | null = null;
    private readonly apiBase = 'https://www.googleapis.com/calendar/v3';

    constructor() {
        super('google-calendar');
    }

    /**
     * Authenticate with Google Calendar using OAuth 2.0
     * @param accessToken - OAuth access token
     */
    async authenticate(accessToken: string): Promise<void> {
        this.accessToken = accessToken;
        this.isAuthenticated = true;
    }

    /**
     * Create a calendar event
     * @param options - Event options
     * @param calendarId - Calendar ID (default: primary)
     * @returns Created event
     */
    async createEvent(options: CreateEventOptions, calendarId: string = 'primary'): Promise<CalendarEvent> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const event = {
            summary: options.summary,
            description: options.description,
            location: options.location,
            start: {
                dateTime: options.start.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: options.end.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            attendees: options.attendees?.map(email => ({ email })),
            reminders: options.reminders ? {
                useDefault: false,
                overrides: options.reminders
            } : undefined,
            recurrence: options.recurrence
        };

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            throw new Error(`Failed to create event: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseEvent(data);
    }

    /**
     * Get events from calendar
     * @param timeMin - Minimum time (default: now)
     * @param timeMax - Maximum time (default: 1 week from now)
     * @param calendarId - Calendar ID (default: primary)
     * @returns Array of events
     */
    async getEvents(
        timeMin: Date = new Date(),
        timeMax: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        calendarId: string = 'primary'
    ): Promise<CalendarEvent[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const params = new URLSearchParams({
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get events: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => this.parseEvent(item));
    }

    /**
     * Get a specific event
     * @param eventId - Event ID
     * @param calendarId - Calendar ID (default: primary)
     * @returns Event details
     */
    async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent | null> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return this.parseEvent(data);
    }

    /**
     * Update an event
     * @param eventId - Event ID
     * @param updates - Event updates
     * @param calendarId - Calendar ID (default: primary)
     * @returns Updated event
     */
    async updateEvent(
        eventId: string,
        updates: Partial<CreateEventOptions>,
        calendarId: string = 'primary'
    ): Promise<CalendarEvent> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const event: any = {};

        if (updates.summary) event.summary = updates.summary;
        if (updates.description) event.description = updates.description;
        if (updates.location) event.location = updates.location;
        if (updates.start) {
            event.start = {
                dateTime: updates.start.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        }
        if (updates.end) {
            event.end = {
                dateTime: updates.end.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        }
        if (updates.attendees) {
            event.attendees = updates.attendees.map(email => ({ email }));
        }
        if (updates.reminders) {
            event.reminders = {
                useDefault: false,
                overrides: updates.reminders
            };
        }
        if (updates.recurrence) {
            event.recurrence = updates.recurrence;
        }

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events/${eventId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            throw new Error(`Failed to update event: ${response.statusText}`);
        }

        const data = await response.json();
        return this.parseEvent(data);
    }

    /**
     * Delete an event
     * @param eventId - Event ID
     * @param calendarId - Calendar ID (default: primary)
     * @returns True if deleted
     */
    async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        return response.ok;
    }

    /**
     * Search events
     * @param query - Search query
     * @param calendarId - Calendar ID (default: primary)
     * @returns Array of matching events
     */
    async searchEvents(query: string, calendarId: string = 'primary'): Promise<CalendarEvent[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const params = new URLSearchParams({
            q: query,
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to search events: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => this.parseEvent(item));
    }

    /**
     * Get upcoming events
     * @param count - Number of events to retrieve
     * @param calendarId - Calendar ID (default: primary)
     * @returns Array of upcoming events
     */
    async getUpcomingEvents(count: number = 10, calendarId: string = 'primary'): Promise<CalendarEvent[]> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const params = new URLSearchParams({
            timeMin: new Date().toISOString(),
            maxResults: count.toString(),
            singleEvents: 'true',
            orderBy: 'startTime'
        });

        const response = await fetch(`${this.apiBase}/calendars/${calendarId}/events?${params}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get upcoming events: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => this.parseEvent(item));
    }

    /**
     * List all calendars
     * @returns Array of calendars
     */
    async listCalendars(): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
        if (!this.isAuthenticated || !this.accessToken) {
            throw new Error('Not authenticated with Google Calendar');
        }

        const response = await fetch(`${this.apiBase}/users/me/calendarList`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to list calendars: ${response.statusText}`);
        }

        const data = await response.json();
        return (data.items || []).map((item: any) => ({
            id: item.id,
            summary: item.summary,
            primary: item.primary
        }));
    }

    /**
     * Parse Google Calendar API event to CalendarEvent
     * @param data - Raw event data from API
     * @returns Parsed event
     */
    private parseEvent(data: any): CalendarEvent {
        return {
            id: data.id,
            summary: data.summary,
            description: data.description,
            start: new Date(data.start.dateTime || data.start.date),
            end: new Date(data.end.dateTime || data.end.date),
            location: data.location,
            attendees: data.attendees?.map((a: any) => a.email),
            reminders: data.reminders?.overrides,
            recurrence: data.recurrence
        };
    }
}
