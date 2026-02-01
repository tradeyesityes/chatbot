# Build stage
FROM node:18-alpine as build-stage

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .

# Environment variables for build stage (required for Vite)
ARG VITE_OPENAI_API_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_API_KEY

ENV VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_KEY=$VITE_SUPABASE_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_API_KEY=$VITE_GOOGLE_API_KEY

RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
