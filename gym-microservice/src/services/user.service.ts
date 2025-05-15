//make a service to get user data from auth microservice using axios
import axios from 'axios';
import serviceRegistry from '../utils/service.registry';

export class UserService {
    private static instance: UserService;
    private constructor() { }

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    public async getCoachData(id: string): Promise<any> {
        try {
            const response = await axios.get(`${serviceRegistry.auth}/api/user/find/coach/${id}`);

            return response.data;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    public async getUserData(id: string): Promise<any> {
        try {
            const response = await axios.get(`${serviceRegistry.auth}/api/user/find/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    public async getAllCoaches(): Promise<any> {
        try {
            const response = await axios.get(`${serviceRegistry.auth}/api/user/find/all/coaches`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }
}