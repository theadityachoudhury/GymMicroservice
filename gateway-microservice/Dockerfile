FROM node:22.14.0-alpine3.21

WORKDIR /app

COPY dist ./dist
COPY node_modules ./node_modules
COPY package*.json ./

# expose the port the app runs on 8080
EXPOSE 8080

CMD ["npm", "run", "start"]