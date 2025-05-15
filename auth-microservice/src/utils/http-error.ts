export class HttpError extends Error {
    statusCode: number;
    errors?: any;

    constructor(statusCode: number, message: string, errors?: any) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default HttpError;