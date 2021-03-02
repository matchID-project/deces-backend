SHELL := /bin/bash

export APP = deces-backend
export APP_PATH := $(shell pwd)
export APP_VERSION	:= $(shell git describe --tags )
export USE_TTY := $(shell test -t 1 && USE_TTY="-t")

# make options
export MAKEBIN = $(shell which make)
export MAKE = ${MAKEBIN} --no-print-directory -s

# docker compose
export DC := /usr/local/bin/docker-compose
export DC_DIR=${APP_PATH}
export DC_FILE=${DC_DIR}/docker-compose
export DC_BACKEND=${DC} -f $(DC_FILE).yml
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
export ES_VERSION = 7.10.1
export ES_BACKUP_BASENAME := esdata
export API_PATH = deces
export ES_PROXY_PATH = /${API_PATH}/api/v0/search

# BACKEND dir
export PORT=8084
export BACKEND=${APP_PATH}/backend
export BACKEND_PORT=8080
export BACKEND_HOST=backend
export API_URL?=localhost:${PORT}
export API_EMAIL?=matchid.project@gmail.com
export API_SSL?=1
export BACKEND_PROXY_PATH=/${API_PATH}/api/v1
export FILE_BACKEND_DIST_APP_VERSION = $(APP)-$(APP_VERSION)-backend-dist.tar.gz
export NPM_REGISTRY = $(shell echo $$NPM_REGISTRY )
export NPM_VERBOSE ?= 1
export REDIS_DATA=${APP_PATH}/redisdata
export BULK_TIMEOUT = 600
export BACKEND_TIMEOUT = 30
export BACKEND_JOB_CONCURRENCY = 2
export BACKEND_CHUNK_CONCURRENCY = 4

# Backupdir
export BACKUP_DIR = ${APP_PATH}/backup
export DATAPREP_VERSION_FILE = ${APP_PATH}/.dataprep.sha1
export DATA_VERSION_FILE = ${APP_PATH}/.data.sha1
export FILES_TO_PROCESS?=deces-([0-9]{4}|2020-m[0-9]{2}).txt.gz

export DC_IMAGE_NAME=${DC_PREFIX}
export GIT_BRANCH ?= $(shell git branch | grep '*' | awk '{print $$2}')
export GIT_BRANCH_MASTER=master
export GIT_ROOT = https://github.com/matchid-project
export GIT_TOOLS = tools
export GIT_DATAPREP = deces-dataprep
export DOCKER_USERNAME=matchid
export DOCKER_PASSWORD
export STORAGE_ACCESS_KEY
export STORAGE_SECRET_KEY
export DATASET=fichier-des-personnes-decedees
export STORAGE_BUCKET=${DATASET}
export AWS=${APP_PATH}/aws


export DATAGOUV_CATALOG_URL = https://www.data.gouv.fr/api/1/datasets/${DATASET}/
export DATAGOUV_RESOURCES_URL = https://static.data.gouv.fr/resources/${DATASET}
export DATAGOUV_PROXY_PATH = /${API_PATH}/api/v0/getDataGouvFile

export WIKIDATA_SRC= ${BACKEND}/tests/wikidata_dead_french.csv
export WIKIDATA_LINKS=${BACKEND}/data/wikidata.json

# test artillery
export PERF=${BACKEND}/tests/performance
export PERF_SCENARIO_V1=${PERF}/scenarios/test-backend-v1.yml
export PERF_REPORTS=${PERF}/reports/
export PERF_NAMES=${BACKEND}/tests/clients_test.csv

dummy		    := $(shell touch artifacts)
include ./artifacts

vm_max_count            := $(shell cat /etc/sysctl.conf | egrep vm.max_map_count\s*=\s*262144 && echo true)

vm_max:
ifeq ("$(vm_max_count)", "")
	@echo updating vm.max_map_count $(vm_max_count) to 262144
	sudo sysctl -w vm.max_map_count=262144
endif

config:
	# this proc relies on matchid/tools and works both local and remote
	@sudo apt-get install make
	@if [ -z "${TOOLS_PATH}" ];then\
		git clone ${GIT_ROOT}/${GIT_TOOLS};\
		make -C ${APP_PATH}/${GIT_TOOLS} config;\
	else\
		ln -s ${TOOLS_PATH} ${APP_PATH}/${GIT_TOOLS};\
	fi
	cp artifacts ${APP_PATH}/${GIT_TOOLS}/
	@ln -s ${APP_PATH}/${GIT_TOOLS}/aws ${APP_PATH}/aws
	@touch config

clean-data: elasticsearch-clean backup-dir-clean
	@sudo rm -rf ${GIT_DATAPREP} ${DATA_VERSION_FILE} ${DATAPREP_VERSION_FILE}\
		${DATA_VERSION_FILE}.list > /dev/null 2>&1 || true

clean-remote:
	@make -C ${APP_PATH}/${GIT_TOOLS} remote-clean > /dev/null 2>&1 || true

clean-config:
	@rm -rf ${APP_PATH}/${GIT_TOOLS} ${APP_PATH}/aws config > /dev/null 2>&1 || true

clean-local: clean-data clean-config

clean: clean-remote clean-local

${GIT_DATAPREP}:
	@cd ${APP_PATH};\
	git clone ${GIT_ROOT}/${GIT_DATAPREP}

${DATAPREP_VERSION_FILE}: ${GIT_DATAPREP}
	@cat \
		${GIT_DATAPREP}/projects/deces-dataprep/recipes/deces_dataprep.yml\
		${GIT_DATAPREP}/projects/deces-dataprep/datasets/deces_index.yml\
	| sha1sum | awk '{print $1}' | cut -c-8 > ${DATAPREP_VERSION_FILE}

${DATA_VERSION_FILE}:
	@${MAKE} -C ${APP_PATH}/${GIT_TOOLS} catalog-tag CATALOG_TAG=${DATA_VERSION_FILE}\
		DATAGOUV_DATASET=${DATASET} STORAGE_BUCKET=${STORAGE_BUCKET}\
		STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY} STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY}\
		FILES_PATTERN='${FILES_TO_PROCESS}'

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

backup-dir:
	@if [ ! -d "$(BACKUP_DIR)" ] ; then mkdir -p $(BACKUP_DIR) ; fi

backup-dir-clean:
	@if [ -d "$(BACKUP_DIR)" ] ; then (rm -rf $(BACKUP_DIR) > /dev/null 2>&1 || true) ; fi

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
	@timeout=${ES_TIMEOUT} ; ret=1 ; until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do (docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch curl -s --fail -XGET localhost:9200/_cat/indices > /dev/null) ; ret=$$? ; if [ "$$ret" -ne "0" ] ; then echo "waiting for elasticsearch to start $$timeout" ; fi ; timeout=$$((timeout-1)); sleep 1 ; done ; exit $$ret


elasticsearch-storage-pull: backup-dir ${DATAPREP_VERSION_FILE} ${DATA_VERSION_FILE}
	@\
	DATAPREP_VERSION=$$(cat ${DATAPREP_VERSION_FILE});\
	DATA_VERSION=$$(cat ${DATA_VERSION_FILE});\
	ES_BACKUP_FILE=${ES_BACKUP_BASENAME}_$${DATAPREP_VERSION}_$${DATA_VERSION}.tar;\
	if [ ! -f "${BACKUP_DIR}/$$ES_BACKUP_FILE" ];then\
		echo pulling ${STORAGE_BUCKET}/$$ES_BACKUP_FILE;\
		${MAKE} -C ${APP_PATH}/${GIT_TOOLS} storage-pull\
			FILE=$$ES_BACKUP_FILE DATA_DIR=${BACKUP_DIR}\
			STORAGE_BUCKET=${STORAGE_BUCKET} STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY} STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY};\
	fi

elasticsearch-stop:
	@echo docker-compose down matchID elasticsearch
	@if [ -f "${DC_FILE}-elasticsearch-huge.yml" ]; then ${DC} -f ${DC_FILE}-elasticsearch-huge.yml down;fi

elasticsearch-restore: elasticsearch-stop elasticsearch-storage-pull
	@if [ -d "$(ES_DATA)" ] ; then (echo purging ${ES_DATA} && sudo rm -rf ${ES_DATA} && echo purge done) ; fi
	@\
	DATAPREP_VERSION=$$(cat ${DATAPREP_VERSION_FILE});\
	DATA_VERSION=$$(cat ${DATA_VERSION_FILE});\
	ESBACKUPFILE=${ES_BACKUP_BASENAME}_$${DATAPREP_VERSION}_$${DATA_VERSION}.tar;\
	if [ ! -f "${BACKUP_DIR}/$$ESBACKUPFILE" ];then\
		(echo no such archive "${BACKUP_DIR}/$$ESBACKUPFILE" && exit 1);\
	else\
		echo restoring from ${BACKUP_DIR}/$$ESBACKUPFILE to ${ES_DATA} && \
		sudo tar xf ${BACKUP_DIR}/$$ESBACKUPFILE -C $$(dirname ${ES_DATA}) && \
		echo backup restored;\
	fi;

elasticsearch-clean: elasticsearch-stop
	@sudo rm -rf ${ES_DATA} > /dev/null 2>&1 || true

# deploy

deploy-local: config elasticsearch-storage-pull elasticsearch-restore elasticsearch docker-check up backup-dir-clean

deploy-dependencies: config elasticsearch-storage-pull elasticsearch-restore elasticsearch docker-check elasticsearch backup-dir-clean backend/tests/clients_test.csv

# DOCKER

docker-push:
	@make -C ${APP_PATH}/${GIT_TOOLS} docker-push DC_IMAGE_NAME=${DC_IMAGE_NAME} APP_VERSION=${APP_VERSION}

docker-check:
	@if [ ! -f ".${DOCKER_USERNAME}-${DC_IMAGE_NAME}:${APP_VERSION}" ]; then\
		(\
			(docker image inspect ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION} > /dev/null 2>&1)\
			&& touch .${DOCKER_USERNAME}-${DC_IMAGE_NAME}:${APP_VERSION}\
		)\
		||\
		(\
			(docker pull ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION} > /dev/null 2>&1)\
			&& touch .${DOCKER_USERNAME}-${DC_IMAGE_NAME}:${APP_VERSION}\
		)\
		|| (echo no previous build found for ${DOCKER_USERNAME}/${DC_IMAGE_NAME}:${APP_VERSION} && exit 1);\
	fi;


#############
#  Backend  #
#############

# build
backend-dist: ${WIKIDATA_LINKS}
	export EXEC_ENV=development; ${DC_BACKEND} -f $(DC_FILE)-dev-backend.yml run -T --no-deps --rm backend npm run build  && tar czvf ${BACKEND}/${FILE_BACKEND_DIST_APP_VERSION} -C ${BACKEND} dist

backend-build-image: ${BACKEND}/${FILE_BACKEND_DIST_APP_VERSION}
	export EXEC_ENV=production; ${DC_BACKEND} build backend

backend-build-all: network backend-dist backend-build-image

# production mode
backend-start:
	@echo docker-compose up backend for production ${VERSION}
	@export EXEC_ENV=production; ${DC_BACKEND} up -d 2>&1 | grep -v orphan
	@timeout=${BACKEND_TIMEOUT} ; ret=1 ;\
		until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do\
			(docker exec -i ${USE_TTY} ${APP} curl -s --fail -X GET http://localhost:${BACKEND_PORT}/deces/api/v1/version > /dev/null) ;\
			ret=$$? ;\
			if [ "$$ret" -ne "0" ] ; then\
				echo -e "try still $$timeout seconds to start backend before timeout" ;\
			fi ;\
			((timeout--)); sleep 1 ;\
		done ;\
	echo -e "backend started in $$((BACKEND_TIMEOUT - timeout)) seconds"; exit $$ret

backend-stop:
	@echo docker-compose down backend for production ${VERSION}
	@export EXEC_ENV=production; ${DC_BACKEND} down --remove-orphan

backend-test:
	@echo Testing API parameters
	@docker exec -i ${USE_TTY} ${APP} bash /deces-backend/tests/test_query_params.sh

backend-test-mocha:
	@echo Testing API with mocha tests
	@export EXEC_ENV=development; export BACKEND_LOG_LEVEL=error; \
		${DC_BACKEND} -f ${DC_FILE}-dev-backend.yml run --rm backend npm run test

backend/tests/clients_test.csv:
	curl -L https://github.com/matchID-project/examples/raw/master/data/clients_test.csv -o backend/tests/clients_test.csv

# test artillery
test-perf-v1:
	sed -i -E "s/;/,/g"  backend/tests/clients_test.csv
	make -C ${APP_PATH}/${GIT_TOOLS} test-api-generic PERF_SCENARIO=${PERF_SCENARIO_V1} PERF_TEST_ENV=api-perf PERF_REPORTS=${PERF_REPORTS} DC_NETWORK=${DC_NETWORK} PERF_NAMES=${PERF_NAMES};

# development mode
backend-dev:
	@echo docker-compose up backend for dev
	@export EXEC_ENV=development;\
		${DC_BACKEND} -f ${DC_FILE}-dev-backend.yml up --build -d --force-recreate 2>&1 | grep -v orphan

backend-dev-stop:
	@export EXEC_ENV=development; ${DC_BACKEND} -f ${DC_FILE}-dev-backend.yml down

backend-dev-test:
	@echo Testing API parameters
	@docker exec -i ${USE_TTY} ${APP}-development bash /deces-backend/tests/test_query_params.sh

dev: network backend-dev-stop ${WIKIDATA_LINKS} backend-dev

# download wikidata test data
${WIKIDATA_SRC}:
	@echo "downloading wikidata set of died french people...";\
	(curl -s -f -G 'https://query.wikidata.org/sparql'      --header "Accept: text/csv"       --data-urlencode query="\
		select ?person  ?personLabel ?firstnameLabel ?id ?lastnameLabel ?birthdateLabel ?birthplaceLabel ?citizenshipLabel ?diedLabel where {\
		?person wdt:P27 wd:Q142.\
		?person wdt:P734 ?lastname.\
		?person wdt:P735 ?firstname.\
		?person wdt:P569 ?birthdate.\
		?person wdt:P27 ?citizenship.\
		?person wdt:P19 ?birthplace.\
                OPTIONAL {?person wdt:P9058 ?id.}\
		?person wdt:P570 ?died;\
		FILTER((?died >= '1970-01-01T00:00:00Z'^^xsd:dateTime)  )\
		service wikibase:label { bd:serviceParam wikibase:language '[AUTO_LANGUAGE],en'. }\
		}\
		" | sed 's/T00:00:00Z//g;s|http://www.wikidata.org/entity/||;' > ${WIKIDATA_SRC}) \
		&& echo "done!"

${WIKIDATA_LINKS}:
	@echo "downloading wikidata and wikipedia links";\
	mkdir -p ${BACKEND}/data;\
	curl -s -f -G 'https://query.wikidata.org/sparql' --header "Accept: application/json" --data-urlencode query="\
		select ?sitelink ?person ?personDescription ?img ?id where {\
			?person wdt:P9058 ?id.\
			OPTIONAL { ?person wdt:P18 ?img. }\
			OPTIONAL { ?sitelink schema:isPartOf <https://fr.wikipedia.org/>;\
			  schema:about ?person;}\
			service wikibase:label { bd:serviceParam wikibase:language '[AUTO_LANGUAGE],fr'. }\
		}" |\
		jq -c '[ .results.bindings[] | {wikidata: .person.value, label: .personDescription.value, wikimedia: .img.value, wikipedia: .sitelink.value, id: .id.value} | with_entries( select( .value != null )) ]' \
		> ${WIKIDATA_LINKS}

wikidata-src: ${WIKIDATA_SRC}

wikidata-links: ${WIKIDATA_LINKS}

###########
#  Start  #
###########

start: elasticsearch backend-start
	@sleep 2 && docker-compose logs

up: start
