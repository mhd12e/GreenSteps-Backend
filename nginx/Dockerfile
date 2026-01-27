FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
# Install envsubst (it is usually available in alpine nginx but let's be sure)
# COPY --from=builder /app/dist /usr/share/nginx/html
# We will use a template for the nginx config
COPY nginx/default.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# The official Nginx image supports environment variables in templates out of the box
# It will look for files in /etc/nginx/templates/*.template and output them to /etc/nginx/conf.d/*.conf
# Replacing ${VARS} with their values.