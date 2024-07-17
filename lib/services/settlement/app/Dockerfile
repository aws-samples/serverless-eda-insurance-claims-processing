FROM public.ecr.aws/docker/library/maven:3-amazoncorretto-21-al2023 AS builder

COPY ./pom.xml ./pom.xml
RUN mvn dependency:go-offline -f ./pom.xml

COPY src ./src/
RUN mvn -Dmaven.test.skip=true clean package
RUN rm -rf ~/.m2/repository

FROM public.ecr.aws/docker/library/amazoncorretto:21-al2023
RUN yum install -y shadow-utils

COPY --from=builder target/settlement-0.0.1-SNAPSHOT.jar settlement.jar

RUN groupadd --system spring -g 1000
RUN adduser spring -u 1000 -g 1000

USER 1000:1000

EXPOSE 8080
CMD ["java","-jar", "-Dspring.profiles.active=prod","/settlement.jar"]
