FROM public.ecr.aws/lts/ubuntu:22.04 AS builder
LABEL maintainer="Sascha Möllering <smoell@amazon.de>"

RUN apt-get update --fix-missing && apt-get install zip curl -y

RUN \
    curl -s "https://get.sdkman.io" | bash; \
    bash -c "source $HOME/.sdkman/bin/sdkman-init.sh; \
    sdk install maven; \
    sdk install java 17.0.8-amzn;"

COPY ./pom.xml ./pom.xml
COPY src ./src/

SHELL ["/bin/bash", "-c"]

RUN . $HOME/.sdkman/bin/sdkman-init.sh && mvn -Dmaven.test.skip=true clean package

FROM public.ecr.aws/amazoncorretto/amazoncorretto:17.0.7-al2023-headless

COPY --from=builder target/settlement-0.0.1-SNAPSHOT.jar settlement.jar

RUN yum install -y shadow-utils

RUN groupadd --system spring
RUN adduser spring -g spring

USER spring:spring

EXPOSE 8080
HEALTHCHECK CMD curl --fail http://localhost:8080/actuator/health || exit 1
CMD ["java","-jar", "-Dspring.profiles.active=prod","/settlement.jar"]
