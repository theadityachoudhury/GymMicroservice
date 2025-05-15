// src/config/cors.ts
import cors from 'cors';
import { config } from 'dotenv';

config()

console.log(process.env.CORS_ORIGINS)
const whitelist = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];
const corsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
console.log(whitelist);


export default cors(corsOptions);