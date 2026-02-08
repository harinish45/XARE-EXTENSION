/**
 * Base Connector Class
 * Abstract base for all external service connectors
 */

export abstract class BaseConnector {
    protected isAuthenticated: boolean = false;
    protected serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    /**
     * Check if connector is authenticated
     * @returns True if authenticated
     */
    isConnected(): boolean {
        return this.isAuthenticated;
    }

    /**
     * Get service name
     * @returns Service name
     */
    getServiceName(): string {
        return this.serviceName;
    }

    /**
     * Disconnect from service
     */
    async disconnect(): Promise<void> {
        this.isAuthenticated = false;
    }
}
