# Use Node.js LTS
FROM node:20-alpine

# Install git (required for lessons)
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and lessons
COPY dist ./dist
COPY lessons ./lessons

# Configure git for container
RUN git config --global user.email "tutor@example.com" && \
    git config --global user.name "Terminal Tutor"

# Set entrypoint
ENTRYPOINT ["node", "dist/cli.js"]

# Default command
CMD ["--help"]
