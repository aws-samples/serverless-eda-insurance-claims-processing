DOCKER_IMAGE_NAME ?= settlement-insurance-claims
TAG ?= latest
SETTLEMENT_IMAGE ?= ${DOCKER_USERNAME}/${DOCKER_IMAGE_NAME}:${TAG}

build:
	cd lib/services/settlement/app && docker build -f src/main/docker/Dockerfile -t "${SETTLEMENT_IMAGE}" .

push:
	cd lib/services/settlement/app && docker push "${SETTLEMENT_IMAGE}"

settlement: build push

deploy: settlement
	cdk deploy --outputs-file react-claims/src/cdk-outputs.json --parameters imagename=${SETTLEMENT_IMAGE} --all
