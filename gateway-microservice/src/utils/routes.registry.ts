// src/utils/routes.registry.ts
export interface RouteInfo {
    authorized: boolean;
    service: string; // Which microservice to forward to
    pathRewrite?: string; // Optional path rewriting for proxying
}

const routesRegistry: { [key: string]: RouteInfo } = {
    // Auth service routes
    'POST/api/auth/sign-up': { authorized: false, service: 'auth' },
    'POST/api/auth/sign-in': { authorized: false, service: 'auth' },
    'POST/api/auth/refresh-token': { authorized: false, service: 'auth' },
    'POST/api/auth/logout': { authorized: false, service: 'auth' },

    // Profile routes (auth service)
    'GET/api/manage/profile': { authorized: true, service: 'manage' },
    'PUT/api/manage/profile': { authorized: true, service: 'manage' },
    'PUT/api/manage/admin/profile': { authorized: true, service: 'manage' },
    'PUT/api/manage/client/profile': { authorized: true, service: 'manage' },
    'PUT/api/manage/coach/profile': { authorized: true, service: 'manage' },
    'POST/api/manage/images/profile': { authorized: true, service: 'manage' },
    'PUT/api/manage/password': { authorized: true, service: 'manage' },

    // Gym service routes
    'GET/api/gym/workouts/available': { authorized: false, service: 'gym' },
    'GET/api/gym/workouts/workout-options': { authorized: false, service: 'gym' },
    'GET/api/gym/workouts': { authorized: true, service: 'gym' },
    'POST/api/gym/workouts': { authorized: true, service: 'gym' },
    'GET/api/gym/coaches': { authorized: false, service: 'gym' },
    'GET/api/gym/coaches/:coachId': { authorized: false, service: 'gym' },
    'GET/api/gym/coaches/:coachId/time-slots': { authorized: false, service: 'gym' },

    // Booking service routes
    'POST/api/gym/workouts/book': { authorized: true, service: 'booking' },
    'GET/api/gym/workouts/bookings': { authorized: true, service: 'booking' },
    'GET/api/gym/workouts/:bookingId': { authorized: true, service: 'booking' },
    'GET/api/gym/coaches/bookings/day': { authorized: true, service: 'booking' },
    'DELETE/api/gym/workouts/:workoutId': { authorized: true, service: 'booking' },

    // Feedback service routes
    'POST/api/gym/feedback': { authorized: true, service: 'booking' },
    'GET/api/gym/feedback/coach/:coachId': { authorized: false, service: 'booking' },
};

/**
 * Check if a given route is available in the registry
 * @param method HTTP method (GET, POST, etc)
 * @param path URL path
 * @returns Route information or null if not found
 */
const isRouteAvailable = (method: string, path: string): RouteInfo | null => {
    path = path.split('?')[0];
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    const routeKey = `${method}${path}`;

    for (const key in routesRegistry) {
        const [keyMethod, ...keyPathParts] = key.split('/');
        const keyPath = '/' + keyPathParts.join('/');

        if (keyMethod !== method) continue;

        const pattern = '^' + keyPath
            .replace(/:[^/]+/g, '[^/]+')
            .replace(/\{[^/]+\}/g, '[^/]+')
            .replace(/\//g, '\\/') + '$';

        const regex = new RegExp(pattern);
        if (regex.test(path)) {
            return routesRegistry[key];
        }
    }

    return null;
};


export default isRouteAvailable;