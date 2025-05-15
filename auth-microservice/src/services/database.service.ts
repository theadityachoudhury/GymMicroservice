import { getConfig } from "../config/config";
import logger from "../config/logger";
import mongoose from "mongoose";

export class DatabaseService {
    private static instance: DatabaseService;
    private isConnected = false;
    private connectionRetries = 0;
    private readonly maxRetries = 5;
    private readonly retryInterval = 5000; // 5 seconds
    private healthCheckInterval: NodeJS.Timeout | null = null;

    private constructor() { }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Connect to MongoDB with retry mechanism
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        try {
            const { MONGODB_URI } = getConfig();

            if (!MONGODB_URI) {
                throw new Error('MONGODB_URI environment variable is not defined');
            }

            logger.info(`Connecting to MongoDB: ${this.maskConnectionString(MONGODB_URI)}`);

            // Configure mongoose
            mongoose.set('strictQuery', false);

            // Connection options with pooling
            const options: mongoose.ConnectOptions = {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                // These are the recommended settings for microservices
                maxPoolSize: 10,
                minPoolSize: 2
            };

            await mongoose.connect(MONGODB_URI, options);

            this.isConnected = true;
            this.connectionRetries = 0;
            logger.info('Successfully connected to MongoDB');

            // Set up connection monitoring
            mongoose.connection.on('error', (error) => {
                logger.error('MongoDB connection error', { error: error.message });
                this.isConnected = false;
                this.attemptReconnect();
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
                this.isConnected = false;
                this.attemptReconnect();
            });

            // Start health checks
            this.startHealthChecks();

        } catch (error) {
            logger.error('Failed to connect to MongoDB', {
                error: error instanceof Error ? error.message : String(error)
            });

            if (this.connectionRetries < this.maxRetries) {
                this.connectionRetries++;
                logger.info(`Retrying connection`, {
                    attempt: `${this.connectionRetries}/${this.maxRetries}`,
                    nextRetryInSeconds: this.retryInterval / 1000
                });

                setTimeout(() => {
                    void this.connect();
                }, this.retryInterval);
            } else {
                logger.error(`Failed to connect to MongoDB after ${this.maxRetries} attempts`);
                throw error;
            }
        }
    }

    /**
     * Gracefully disconnect from MongoDB
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            this.stopHealthChecks();
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('Disconnected from MongoDB');
        } catch (error) {
            logger.error('Failed to disconnect from MongoDB', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Check the database connection status
     */
    async checkHealth(): Promise<{ status: string; latency?: number }> {
        try {
            if (!this.isConnected ||
                mongoose.connection.readyState !== 1 ||
                !mongoose.connection.db) {
                return { status: 'disconnected' };
            }

            // Simple ping to check connection speed
            const start = Date.now();
            await mongoose.connection.db.admin().ping();
            const latency = Date.now() - start;

            return {
                status: 'connected',
                latency
            };
        } catch (error) {
            logger.error('Database health check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return { status: 'error' };
        }
    }

    /**
     * Attempt to reconnect to the database
     */
    private attemptReconnect(): void {
        if (this.connectionRetries < this.maxRetries) {
            this.connectionRetries++;
            logger.info(`Attempting to reconnect`, {
                attempt: `${this.connectionRetries}/${this.maxRetries}`
            });
            void this.connect();
        } else {
            logger.error(`Failed to reconnect to MongoDB after ${this.maxRetries} attempts`);
        }
    }

    /**
     * Start periodic health checks
     */
    private startHealthChecks(): void {
        this.stopHealthChecks();

        // Check database health every 30 seconds
        this.healthCheckInterval = setInterval(async () => {
            const health = await this.checkHealth();
            if (health.status !== 'connected') {
                logger.warn('Database health check failed, connection appears to be down');
                this.isConnected = false;
                this.attemptReconnect();
            } else if (health.latency && health.latency > 1000) {
                logger.warn(`Database latency is high: ${health.latency}ms`);
            }
        }, 30000);
    }

    /**
     * Stop periodic health checks
     */
    private stopHealthChecks(): void {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Mask connection string for logging
     */
    private maskConnectionString(uri: string): string {
        try {
            const parsedUrl = new URL(uri);
            if (parsedUrl.password) {
                parsedUrl.password = '****';
            }
            return parsedUrl.toString();
        } catch {
            // If parsing fails, return a generic string
            return 'mongodb://[credentials-hidden]';
        }
    }
}