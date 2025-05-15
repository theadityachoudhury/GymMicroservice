import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/user.model';
import mongoose, { Mongoose } from 'mongoose';
import { LoginInput, SignupInput } from '../validators/auth.validators';
import HttpError from '../utils/http-error';
import { determineUserRole, getUserCreator } from '../utils/role';
import logger from '../config/logger';
import { getConfig } from '../config/config';

export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private readonly JWT_SECRET: string;
    private readonly JWT_REFRESH_SECRET: string;
    private readonly ACCESS_TOKEN_EXPIRES_IN: string;
    private readonly REFRESH_TOKEN_EXPIRES_IN: string;

    constructor() {
        const { JWT_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = getConfig();

        if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
            throw new Error('JWT secrets not configured');
        }

        this.JWT_SECRET = JWT_SECRET;
        this.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
        this.ACCESS_TOKEN_EXPIRES_IN = ACCESS_TOKEN_EXPIRES_IN || '1h';
        this.REFRESH_TOKEN_EXPIRES_IN = REFRESH_TOKEN_EXPIRES_IN || '7d';
    }

    /**
     * Register a new user
     */
    async signup(userData: SignupInput): Promise<{ userId: string }> {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                throw new HttpError(409, 'User with this email already exists');
            }

            // Hash password
            const hashedPassword = await this.hashPassword(userData.password);

            // Determine user role
            const role = await determineUserRole(userData.email);

            // Create user with role-specific data

            const user = await getUserCreator(role, {
                ...userData,
                password: hashedPassword,
                role,
                isEmailConfirmed: true, // Since we're not implementing email confirmation yet
                image: "https://enery-x-hosting.s3.eu-west-2.amazonaws.com/image-upload/placeholder.jpg"
            });

            logger.info(`User created successfully: ${(user._id as mongoose.ObjectId)}`);

            return {
                userId: (user._id as mongoose.ObjectId).toString(),
            };
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            logger.error('Error during signup', error);
            throw new HttpError(500, 'Failed to create user account');
        }
    }

    /**
     * Login a user
     */
    async login(loginData: LoginInput): Promise<AuthTokens & { userId: string; role: UserRole }> {
        try {
            // Find user
            const user = await User.findOne({ email: loginData.email });
            if (!user) {
                throw new HttpError(401, 'Invalid email or password');
            }


            // Verify password
            const isPasswordValid = await this.verifyPassword(loginData.password, user.password);
            if (!isPasswordValid) {
                throw new HttpError(401, 'Invalid email or password');
            }

            // Generate tokens
            const tokens = this.generateTokens((user._id as mongoose.ObjectId).toString(), user.email, user.role);

            // Save refresh token to database
            user.refreshToken = tokens.refreshToken;
            await user.save();

            return {
                ...tokens,
                userId: (user._id as mongoose.ObjectId).toString(),
                role: user.role
            };
        } catch (error) {
            if (error instanceof HttpError) {
                throw error;
            }
            logger.error('Error during login', error);
            throw new HttpError(500, 'Login failed');
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(token: string): Promise<AuthTokens> {
        try {
            // Verify refresh token
            const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;

            // Find user with this refresh token
            const user = await User.findOne({ _id: decoded.userId, refreshToken: token });
            if (!user) {
                throw new HttpError(401, 'Invalid refresh token');
            }

            // Generate new tokens
            const tokens = this.generateTokens(((user._id as mongoose.ObjectId) as mongoose.ObjectId).toString(), user.email, user.role);

            // Update refresh token in database
            user.refreshToken = tokens.refreshToken;
            await user.save();

            return tokens;
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new HttpError(401, 'Invalid or expired refresh token');
            }
            logger.error('Error during token refresh', error);
            throw new HttpError(500, 'Failed to refresh token');
        }
    }

    /**
     * Logout a user
     */
    async logout(userId: string): Promise<void> {
        try {
            // Remove refresh token from database
            await User.findByIdAndUpdate(userId, { refreshToken: null });
        } catch (error) {
            logger.error('Error during logout', error);
            throw new HttpError(500, 'Logout failed');
        }
    }

    /**
     * Hash a password
     */
    private async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Verify a password against a hash
     */
    private async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT tokens
     */
    private generateTokens(userId: string, email: string, role: UserRole): AuthTokens {
        // Create access token
        const accessToken = jwt.sign(
            { userId, email, role },
            this.JWT_SECRET,
            { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN as unknown as number }
        );

        // Create refresh token with longer lifespan
        const refreshToken = jwt.sign(
            { userId, email, role },
            this.JWT_REFRESH_SECRET,
            { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN as unknown as number }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
        } catch (error) {
            throw new HttpError(401, 'Invalid or expired token');
        }
    }
}