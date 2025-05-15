import { Request } from "express";
import { RouteInfo } from "../utils/routes.registry";

export interface UserData {
    id: string;
    role: string;
    email: string;
}

export interface customRequest extends Request {
    requestId: string;
    user?: UserData;
    routeInfo?: RouteInfo;
};