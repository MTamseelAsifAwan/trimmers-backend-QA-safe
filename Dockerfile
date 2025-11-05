# Use official Node.js LTS image as base
FROM node:18-alpine

# Install necessary tools
RUN apk add --no-cache bash

# Install nodemon globally
RUN npm install -g nodemon

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Set environment to development
ENV NODE_ENV=development

# Use nodemon for hot reloading
CMD ["npm", "run", "dev"]