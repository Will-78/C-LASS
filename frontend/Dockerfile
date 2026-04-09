FROM node:22.20.0-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# To run tests inside the running container, use:
# docker exec -it frontend npm run test
# Or to run them in a new container: docker-compose run --rm frontend npm run test

EXPOSE 3000
CMD ["npm", "run", "dev"]