import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { UserRole } from '../models/user.model';
import logger from '../config/logger';
import HttpError from '../utils/http-error';
import { v4 as uuidv4 } from "uuid"
import { config } from 'dotenv';
config()

export class ImageUploadService {
    private s3Client: S3Client;
    private bucketName: string;
    private folderPath: string;

    constructor() {
        this.bucketName = process.env.S3_BUCKET_NAME || 'enery-x-hosting';
        this.folderPath = process.env.IMAGE_UPLOAD_FOLDER || 'image-upload';
        this.s3Client = new S3Client({
            region: "eu-west-2",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
            }
         });
    }

    /**
     * Upload a base64 encoded image to S3
     * @param base64Image Base64 encoded image string
     * @param userRole User role (client, coach, admin)
     * @param userId User ID
     * @returns URL of the uploaded image
     */
    async uploadProfileImage(base64Image: string, userRole: UserRole, userId: string): Promise<string> {
        try {
            logger.info('Processing image upload', { userRole, userId });

            // Validate the base64 image
            if (!this.isValidBase64Image(base64Image)) {
                logger.warn('Invalid base64 image format', { userId });
                throw new HttpError(400, 'Invalid image format. Please provide a valid base64 encoded image.');
            }

            // Extract image data and content type
            const { imageBuffer, contentType, fileExtension } = this.parseBase64Image(base64Image);

            // Generate a unique filename with folder structure
            // Format: image-upload/[role]/[userId]/[uuid].[extension]
            const key = `${this.folderPath}/${userRole}/${userId}/${uuidv4()}${fileExtension}`;

            // Upload to S3
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: imageBuffer,
                ContentType: contentType,
                ACL: 'private' // Make the image publicly accessible
            });

            await this.s3Client.send(command);

            // Generate the URL for the uploaded image
            const imageUrl = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

            logger.info('Image uploaded successfully', { userId, imageUrl });

            return imageUrl;
        } catch (error) {
            if (error instanceof HttpError) throw error;

            logger.error('Error uploading image', error as Error);
            throw new HttpError(500, 'Failed to upload image');
        }
    }

    /**
     * Check if the provided string is a valid base64 encoded image
     */
    private isValidBase64Image(base64String: string): boolean {
        // Check if it's a valid base64 image format (data:image/xxx;base64,)
        const regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
        return regex.test(base64String);
    }

    /**
     * Parse base64 image string into buffer and content type
     */
    private parseBase64Image(base64String: string): {
        imageBuffer: Buffer,
        contentType: string,
        fileExtension: string
    } {
        // Extract content type and base64 data
        const matches = base64String.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            throw new HttpError(400, 'Invalid base64 image format');
        }

        const imageType = matches[1];
        const base64Data = matches[2];
        const contentType = `image/${imageType}`;

        // Get file extension based on image type
        let fileExtension = '.jpg';
        switch (imageType.toLowerCase()) {
            case 'png':
                fileExtension = '.png';
                break;
            case 'gif':
                fileExtension = '.gif';
                break;
            case 'webp':
                fileExtension = '.webp';
                break;
            case 'jpeg':
            case 'jpg':
                fileExtension = '.jpg';
                break;
        }

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        return { imageBuffer, contentType, fileExtension };
    }
}