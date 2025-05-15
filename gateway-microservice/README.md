# Node.js Application

This is a Node.js application built with Express.js. It includes MongoDB integration and follows best practices for API development.

## Features

- **Express.js**: Web framework for building RESTful APIs.
- **MongoDB**: Database integration for data storage.
- **Error Handling**: Centralized error handling middleware.
- **Environment Variables**: Managed using `dotenv`.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/)
- Docker (optional, for containerization)

### MongoDB Connection Configuration

This application expects MongoDB credentials to be provided via a Kubernetes Secret.


    # -- This section configures credentials for connecting to the MongoDB instance
    # The secret field must be in the following format:
    # <protocol (e.g., mongodb+srv)>://<login>:<password>@<host>/<databaseName>
    mongoConnection:
    existingSecret:
        # -- The name of the secret that contains the connection string
        name: mongoauth-test-admin
        # -- The key in the secret that contains the connection string
        key: connectionString.standardSrv


Example command to create the Kubernetes Secret:


    # The secret must be created in the same namespace as the application
    kubectl create secret generic mongoauth-test-admin \
    --namespace=<target_namespace_with_application> \
    --from-literal=connectionString.standardSrv='<protocol>://<login>:<password>@<host>/<databaseName>'


## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Rolika4/node-backend
   cd node-backend

2. Install dependencies:
     ```bash
    npm install

3. Create a .env file in the root directory and add the following variables:
    PORT=5000
    MONGO_URI=<your-mongodb-connection-string>

4. Start the application
    ```bash
    npm run dev


