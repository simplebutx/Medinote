FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --include=optional \
 && arch="$(dpkg --print-architecture)" \
 && if [ "$arch" = "amd64" ]; then npm install --no-save @rolldown/binding-linux-x64-gnu; \
    elif [ "$arch" = "arm64" ]; then npm install --no-save @rolldown/binding-linux-arm64-gnu; \
    fi

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
