export APP = deces-backend
export APP_PATH := $(shell pwd)
export APP_VERSION	:= $(shell git describe --tags )
export USE_TTY := $(shell test -t 1 && USE_TTY="-t")

# docker compose
export DC := /usr/local/bin/docker-compose
export DC_DIR=${APP_PATH}
export DC_FILE=${DC_DIR}/docker-compose
export DC_PREFIX := $(shell echo ${APP} | tr '[:upper:]' '[:lower:]' | tr '_' '-')
export DC_NETWORK := $(shell echo ${APP} | tr '[:upper:]' '[:lower:]')

# elasticsearch defaut configuration
export ES_HOST = elasticsearch
export ES_PORT = 9200
export ES_TIMEOUT = 60
export ES_INDEX = deces
export ES_DATA = ${APP_PATH}/esdata
export ES_NODES = 1
export ES_MEM = 1024m
export ES_VERSION = 7.5.0
export API_PATH = deces
export ES_PROXY_PATH = /${API_PATH}/api/v0/search

export NPM_REGISTRY = $(shell echo $$NPM_REGISTRY )
export NPM_VERBOSE = 1

# BACKEND dir
export PORT=8084
export BACKEND=${APP_PATH}/backend
export BACKEND_PORT=8080
export BACKEND_HOST=backend
export BACKEND_PROXY_PATH=/${API_PATH}/api/v1
export FILE_BACKEND_DIST_APP_VERSION = $(APP)-$(APP_VERSION)-backend-dist.tar.gz

# nginx
export NGINX = ${APP_PATH}/nginx
export NGINX_TIMEOUT = 30
export API_USER_LIMIT_RATE=1r/s
export API_USER_BURST=20 nodelay
export API_USER_SCOPE=http_x_forwarded_for
export API_GLOBAL_LIMIT_RATE=20r/s
export API_GLOBAL_BURST=200 nodelay

# Backupdir
export BACKUP_DIR = ${APP_PATH}/backup

export DOCKER_USERNAME=matchid
export DOCKER_PASSWORD
export DC_IMAGE_NAME=${DC_PREFIX}
export GIT_BRANCH ?= $(shell git branch | grep '*' | awk '{print $$2}')
export GIT_BRANCH_MASTER=master

dummy		    := $(shell touch artifacts)
include ./artifacts

vm_max_count            := $(shell cat /etc/sysctl.conf | egrep vm.max_map_count\s*=\s*262144 && echo true)

vm_max:
ifeq ("$(vm_max_count)", "")
	@echo updating vm.max_map_count $(vm_max_count) to 262144
	sudo sysctl -w vm.max_map_count=262144
endif

#############
#  Network  #
#############

network-stop:
	docker network rm ${DC_NETWORK}

network:
	@docker network create ${DC_NETWORK} 2> /dev/null; true

###################
#  Elasticsearch  #
###################

elasticsearch: network vm_max
	@echo docker-compose up elasticsearch with ${ES_NODES} nodes
	@cat ${DC_FILE}-elasticsearch.yml | sed "s/%M/${ES_MEM}/g" > ${DC_FILE}-elasticsearch-huge.yml
	@(if [ ! -d ${ES_DATA}/node1 ]; then sudo mkdir -p ${ES_DATA}/node1 ; sudo chmod g+rw ${ES_DATA}/node1/.; sudo chgrp 1000 ${ES_DATA}/node1/.; fi)
	@(i=$(ES_NODES); while [ $${i} -gt 1 ]; \
		do \
			if [ ! -d ${ES_DATA}/node$$i ]; then (echo ${ES_DATA}/node$$i && sudo mkdir -p ${ES_DATA}/node$$i && sudo chmod g+rw ${ES_DATA}/node$$i/. && sudo chgrp 1000 ${ES_DATA}/node$$i/.); fi; \
		cat ${DC_FILE}-elasticsearch-node.yml | sed "s/%N/$$i/g;s/%MM/${ES_MEM}/g;s/%M/${ES_MEM}/g" >> ${DC_FILE}-elasticsearch-huge.yml; \
		i=`expr $$i - 1`; \
	done;\
	true)
	${DC} -f ${DC_FILE}-elasticsearch-huge.yml up -d
	#@timeout=${ES_TIMEOUT} ; ret=1 ; until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do (docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch curl -s --fail -XGET localhost:9200/_cat/indices > /dev/null) ; ret=$$? ; if [ "$$ret" -ne "0" ] ; then echo "waiting for elasticsearch to start $$timeout" ; fi ; ((timeout--)); sleep 1 ; done ; exit $$ret

elasticsearch-stop:
	@echo docker-compose down matchID elasticsearch
	@if [ -f "${DC_FILE}-elasticsearch-huge.yml" ]; then ${DC} -f ${DC_FILE}-elasticsearch-huge.yml down;fi

elasticsearch-restore: elasticsearch-stop
	@if [ -d "$(ES_DATA)" ] ; then (echo purging ${ES_DATA} && sudo rm -rf ${ES_DATA} && echo purge done) ; fi
	@\
		ESBACKUPFILE=esdata_20200212.tar;\
		if [ ! -f "${BACKUP_DIR}/$$ESBACKUPFILE" ];then\
		(echo no such archive "${BACKUP_DIR}/$$ESBACKUPFILE" && exit 1);\
		else\
		echo restoring from ${BACKUP_DIR}/$$ESBACKUPFILE to ${ES_DATA} && \
		sudo tar xf ${BACKUP_DIR}/$$ESBACKUPFILE -C $$(dirname ${ES_DATA}) && \
		echo backup restored;\
		fi;

elasticsearch-clean: elasticsearch-stop
	@sudo rm -rf ${ES_DATA} > /dev/null 2>&1 || true


# DOCKER

docker-tag:
	echo ${APP_VERSION} 
	echo ${DOCKER_USERNAME} 
	echo ${DC_IMAGE_NAME} 
	echo ${GIT_BRANCH}
	echo ${GIT_BRANCH_MASTER} 
	echo ${DOCKER_USERNAME}
	echo ${DC_IMAGE_NAME} 
	@if [ "${GIT_BRANCH}" = "${GIT_BRANCH_MASTER}" ]; then \
		docker tag ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION} ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:latest; \
	else \
		docker tag ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION} ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${GIT_BRANCH}; \
	fi

docker-login:
	@echo docker login for ${DOCKER_USERNAME}
	@echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin

docker-push: docker-login docker-tag
	@docker push ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION}
	@if [ "${GIT_BRANCH}" == "${GIT_BRANCH_MASTER}" ];then\
		docker push ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:latest;\
	else\
		docker push ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${GIT_BRANCH};\
	fi

#############
#  Backend  #
#############

# build
backend-dist:
	export EXEC_ENV=development; ${DC} -f $(DC_FILE)-dev-backend.yml run -T --no-deps --rm backend npm run build  && tar czvf ${BACKEND}/${FILE_BACKEND_DIST_APP_VERSION} -C ${BACKEND} dist

backend-build-image: ${BACKEND}/${FILE_BACKEND_DIST_APP_VERSION}
	export EXEC_ENV=production; ${DC} -f $(DC_FILE).yml build backend

backend-build-all: network backend-dist backend-build-image

# production mode
backend-start:
	@echo docker-compose up backend for production ${VERSION}
	@export EXEC_ENV=production; ${DC} -f ${DC_FILE}.yml up -d backend 2>&1 | grep -v orphan

backend-stop:
	@echo docker-compose down backend for production ${VERSION}
	@export EXEC_ENV=production; ${DC} -f ${DC_FILE}.yml down  --remove-orphan

backend-test:
	@echo Testing API parameters
	@docker exec -i ${USE_TTY} ${APP} bash /deces-backend/tests/test_query_params.sh

# development mode
backend-dev:
	@echo docker-compose up backend for dev
	@export EXEC_ENV=development;\
		${DC} -f ${DC_FILE}-dev-backend.yml up --build -d --force-recreate backend 2>&1 | grep -v orphan

backend-dev-stop:
	@export EXEC_ENV=development; ${DC} -f ${DC_FILE}-dev-backend.yml down

backend-dev-test:
	@echo Testing API parameters
	@docker exec -i ${USE_TTY} ${APP}-development bash /deces-backend/tests/test_query_params.sh

dev: network backend-dev-stop backend-dev

###########
#  Start  #
###########

start: elasticsearch backend-start
	@sleep 2 && docker-compose logs
