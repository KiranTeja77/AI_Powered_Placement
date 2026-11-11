# Build context is ./apps (see docker-compose.yml): the catalogue seed reads
# ai-service/data/*.json, which Maven copies onto the classpath from ../ai-service/data.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build/api
COPY api/.mvn .mvn
COPY api/mvnw api/pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY ai-service/data /build/ai-service/data
COPY api/src src
RUN ./mvnw -B -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/api/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Duser.timezone=UTC", "-jar", "app.jar"]
