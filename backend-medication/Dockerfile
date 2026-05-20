FROM gradle:8.14.3-jdk21
WORKDIR /app
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY . .

RUN chmod +x gradlew
EXPOSE 8081
CMD ["bash", "./gradlew", "bootRun", "--no-daemon"]