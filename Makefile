SHELL := /bin/bash

export APP = deces-backend
export APP_GROUP = matchID
export APP_PATH := $(shell pwd)
export APP_DNS?=deces.matchid.io
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
export DC_SMTP=${DC} -f ${DC_DIR}/docker-compose-smtp.yml

# elasticsearch defaut configuration
export ES_HOST = elasticsearch
export ES_PORT = 9200
export ES_TIMEOUT = 60
export ES_RESTORE_TIMEOUT = 600
export ES_INDEX = deces
export ES_DATA = ${APP_PATH}/esdata
export ES_NODES = 1
export ES_MEM = 1024m
export ES_VERSION = 8.6.1
export ES_BACKUP_BASENAME := esdata
export API_PATH = deces
export ES_PROXY_PATH = /${API_PATH}/api/v0/search

# BACKEND dir
export PORT=8084
export BACKEND=${APP_PATH}/backend
export BACKEND_PORT=8080
export BACKEND_HOST=backend
export API_SSL?=1
export APP_URL?=http$([ "$API_SSL" == 1 ] && echo "s" || echo "")://${APP_DNS}
export API_EMAIL?=contact@matchid.io
export BACKEND_TOKEN_USER?=matchid.project@gmail.com
export BACKEND_TOKEN_KEY?=$(shell echo $$RANDOM )
export BACKEND_TOKEN_PASSWORD?=$(shell echo $$RANDOM )
export BACKEND_PROXY_PATH=/${API_PATH}/api/v1
export NPM_REGISTRY = $(shell echo $$NPM_REGISTRY )
export NPM_VERBOSE ?= 1
export REDIS_DATA=${APP_PATH}/redisdata
export BULK_TIMEOUT = 600
export BACKEND_TIMEOUT = 30
export BACKEND_JOB_CONCURRENCY = 2
export BACKEND_CHUNK_CONCURRENCY = 4
export BACKEND_TMP_MAX = 300 # number of requests before ban
export BACKEND_TMP_DURATION = 14400 # duration of ban in seconds after exceeding number of max request
export BACKEND_TMP_WINDOW = 86400 # seconds before reset of request count
export BACKEND_TMPFILE_PERSISTENCE = 3600000
#export SMTP_TLS_SELFSIGNED=true #if SMTP SSL & self signed
export SMTP_HOST?=smtp
export SMTP_PORT?=1025
export SMTP_USER?=${API_EMAIL}
export SMTP_PWD?=

# Backupdir
export BACKUP_DIR = ${APP_PATH}/backup
export DATAPREP_VERSION_FILE = ${APP_PATH}/.dataprep.sha1
export DATA_VERSION_FILE = ${APP_PATH}/.data.sha1
export FILES_TO_PROCESS?=deces-([0-9]{4}|2020-m[0-9]{2}).txt.gz
export FILES_TO_PROCESS_TEST=deces-2020-m01.txt.gz # reference for test env
export FILES_TO_PROCESS_DEV=deces-2020-m[0-1][0-9].txt.gz # reference for preprod env
export REPOSITORY_BUCKET?=fichier-des-personnes-decedees-elasticsearch
export REPOSITORY_BUCKET_DEV=fichier-des-personnes-decedees-elasticsearch-dev # reference for non-prod env

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

export DATA_DIR=${BACKEND}/data
export COMMUNES_JSON=${DATA_DIR}/communes.json
export DISPOSABLE_MAIL=${DATA_DIR}/disposable-mail.txt
export DB_JSON=${DATA_DIR}/userDB.json
export PROOFS=${DATA_DIR}/proofs
export JOBS=${DATA_DIR}/jobs

export DATAGOUV_CATALOG_URL = https://www.data.gouv.fr/api/1/datasets/${DATASET}/
export DATAGOUV_RESOURCES_URL = https://static.data.gouv.fr/resources/${DATASET}
export DATAGOUV_PROXY_PATH = /${API_PATH}/api/v0/getDataGouvFile

export WIKIDATA_SRC= ${BACKEND}/tests/wikidata_dead_french.csv
export WIKIDATA_LINKS=${DATA_DIR}/wikidata.json

# test artillery
export PERF=${BACKEND}/tests/performance
export PERF_SCENARIO_V1=${PERF}/scenarios/test-backend-v1.yml
export PERF_REPORTS=${PERF}/reports/
export PERF_NAMES=${BACKEND}/tests/clients_test.csv
export PERF_UTILS=${PERF}/scenarios/utils

-include ${APP_PATH}/${GIT_TOOLS}/artifacts.SCW
export SCW_REGION?=fr-par
export SCW_ENDPOINT?=s3.fr-par.scw.cloud
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
	@rm -rf ${APP_PATH}/${GIT_TOOLS} ${APP_PATH}/aws config elasticsearch-repository-* > /dev/null 2>&1 || true

clean-local: clean-data clean-config

clean: clean-remote clean-local

${GIT_DATAPREP}:
	@cd ${APP_PATH};\
	git clone ${GIT_ROOT}/${GIT_DATAPREP}

${DATAPREP_VERSION_FILE}: ${GIT_DATAPREP}
	@cat 	${GIT_DATAPREP}/Makefile\
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

elasticsearch-start: network vm_max
	@echo docker-compose up matchID elasticsearch with ${ES_NODES} nodes
	@(if [ ! -d ${ES_DATA}/node1 ]; then sudo mkdir -p ${ES_DATA}/node1 ; sudo chmod g+rw ${ES_DATA}/node1/.; sudo chown 1000:1000 ${ES_DATA}/node1/.; fi)
	${DC} -f ${DC_FILE}-elasticsearch.yml up -d

elasticsearch: elasticsearch-start
	@timeout=${ES_TIMEOUT} ; ret=1 ; until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do (docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch curl -s --fail -XGET localhost:9200/ > /dev/null) ; ret=$$? ; if [ "$$ret" -ne "0" ] ; then echo -en "\rwaiting for elasticsearch API to start $$timeout" ; fi ; ((timeout--)); sleep 1 ; done ; echo ; exit $$ret

elasticsearch-index-readiness:
	@timeout=${ES_RESTORE_TIMEOUT} ; ret=1 ; until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do (docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch curl -s --fail -XGET localhost:9200/_cat/indices | grep -q green > /dev/null) ; ret=$$? ; if [ "$$ret" -ne "0" ] ; then echo -en "\rwaiting for elasticsearch index to be ready $$timeout" ; fi ; ((timeout--)); sleep 1 ; done ; echo ; exit $$ret

elasticsearch-stop:
	@echo docker-compose down matchID elasticsearch
	@if [ -f "${DC_FILE}-elasticsearch-huge.yml" ]; then ${DC} -f ${DC_FILE}-elasticsearch-huge.yml down;fi

elasticsearch-repository-creds: elasticsearch-start
	@if [ ! -f "elasticsearch-repository-plugin" ]; then\
		echo installing elasticsearch repository plugin;\
		docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch sh -c \
			"echo ${STORAGE_ACCESS_KEY} | bin/elasticsearch-keystore add --stdin --force s3.client.default.access_key";\
		docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch sh -c \
			"echo ${STORAGE_SECRET_KEY} | bin/elasticsearch-keystore add --stdin --force s3.client.default.secret_key";\
		docker restart ${DC_PREFIX}-elasticsearch;\
		timeout=${ES_TIMEOUT} ; ret=1 ; until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do (docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch curl -s --fail -XGET localhost:9200/ > /dev/null) ; ret=$$? ; if [ "$$ret" -ne "0" ] ; then echo -en "\rwaiting for elasticsearch to start $$timeout" ; fi ; ((timeout--)); sleep 1 ; done ;\
		echo; touch elasticsearch-repository-plugin ; exit $$ret;\
	fi;

elasticsearch-repository-config: elasticsearch-repository-creds
	@if [ ! -f "elasticsearch-repository-config" ]; then\
		echo creating elasticsearch repository ${APP_GROUP} in s3 bucket ${REPOSITORY_BUCKET} && \
		docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch \
			curl -s -XPUT "localhost:9200/_snapshot/${APP_GROUP}" -H 'Content-Type: application/json' \
				-d '{"type": "s3","settings": {"bucket": "${REPOSITORY_BUCKET}","client": "default","region": "${SCW_REGION}","endpoint": "${SCW_ENDPOINT}","path_style_access": true,"protocol": "https"}}' \
			| tee /tmp/elasticsearch-repository-config \
			| grep -q '"acknowledged":true' \
		&& touch elasticsearch-repository-config \
		|| ( cat /tmp/elasticsearch-repository-config \
			&& rm /tmp/elasticsearch-repository-config \
			&& exit 1 );\
	fi

elasticsearch-restore: elasticsearch-repository-config ${DATAPREP_VERSION_FILE} ${DATA_VERSION_FILE}
	@\
	DATAPREP_VERSION=$$(cat ${DATAPREP_VERSION_FILE});\
	DATA_VERSION=$$(cat ${DATA_VERSION_FILE});\
	ES_BACKUP_NAME=${ES_BACKUP_BASENAME}_$${DATAPREP_VERSION}_$${DATA_VERSION};\
	echo restoring snapshot $${ES_BACKUP_NAME} from elasticsearch repository;\
	(\
		docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch \
			curl -s -XPOST localhost:9200/_snapshot/${APP_GROUP}/$${ES_BACKUP_NAME}/_restore?wait_for_completion=true -H 'Content-Type: application/json'\
			-d '{"indices": "${ES_INDEX}","ignore_unavailable": true,"include_global_state": false}' \
		> /dev/null 2>&1\
	) && echo "snapshot $${ES_BACKUP_NAME} restored from elasticsearch repository" && touch elasticsearch-repository-restore

elasticsearch-restore-async: elasticsearch-repository-config ${DATAPREP_VERSION_FILE} ${DATA_VERSION_FILE}
	@\
	DATAPREP_VERSION=$$(cat ${DATAPREP_VERSION_FILE});\
	DATA_VERSION=$$(cat ${DATA_VERSION_FILE});\
	ES_BACKUP_NAME=${ES_BACKUP_BASENAME}_$${DATAPREP_VERSION}_$${DATA_VERSION};\
	echo restoring snapshot $${ES_BACKUP_NAME} from elasticsearch repository;\
	(\
		docker exec -i ${USE_TTY} ${DC_PREFIX}-elasticsearch \
			curl -s -XPOST localhost:9200/_snapshot/${APP_GROUP}/$${ES_BACKUP_NAME}/_restore -H 'Content-Type: application/json'\
			-d '{"indices": "${ES_INDEX}","ignore_unavailable": true,"include_global_state": false}' \
		> /dev/null 2>&1\
	) && echo "snapshot $${ES_BACKUP_NAME} restore initiated from elasticsearch repository" && touch elasticsearch-repository-restore

elasticsearch-clean: elasticsearch-stop
	@sudo rm -rf elasticsearch-repository-* ${ES_DATA} > /dev/null 2>&1 || true

# deploy

deploy-local: config elasticsearch-restore-async docker-check up

deploy-dependencies: config elasticsearch-restore-async docker-check backend/tests/clients_test.csv elasticsearch-index-readiness

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

docker-save:
	@docker save -o deces-backend.tar ${DOCKER_USERNAME}/deces-backend:${APP_VERSION}

docker-load:
	@docker load -i deces-backend.tar

#############
#  Backend  #
#############

# build
backend-build-image: ${WIKIDATA_LINKS} ${COMMUNES_JSON} ${DISPOSABLE_MAIL} ${DB_JSON} ${PROOFS} ${JOBS}
	export EXEC_ENV=production; ${DC_BACKEND} build backend

backend-build-all: network backend-build-image

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
	@docker exec -i ${USE_TTY} ${APP} /bin/sh /deces-backend/tests/test_query_params.sh

db-json-fake:
	echo '{"user1@gmail.com": "7cd61af92058569476e9d91fea601ba85fa02258b6263cfa188c15957f4752f3"}' > ${DB_JSON}

backend-test-vitest: db-json-fake smtp
	@echo Testing API with vitest tests
	@if [ ! -f "${BACKEND}/src/routes/routes.ts" ]; then export EXEC_ENV=development; \
		export BACKEND_LOG_LEVEL=error; \
		${DC_BACKEND} -f ${DC_FILE}-dev-backend.yml run --rm backend npm run tsoa --verbose;fi
	@export EXEC_ENV=development; export BACKEND_LOG_LEVEL=error; \
		${DC_BACKEND} -f ${DC_FILE}-dev-backend.yml run --rm backend npm run test --verbose

backend/tests/clients_test.csv:
	curl -L https://github.com/matchID-project/examples/raw/master/data/clients_test.csv -o backend/tests/clients_test.csv

# test artillery
test-perf-v1:
	make -C ${APP_PATH}/${GIT_TOOLS} test-api-generic PERF_SCENARIO=${PERF_SCENARIO_V1} PERF_TEST_ENV=api-perf PERF_REPORTS=${PERF_REPORTS} DC_NETWORK=${DC_NETWORK} PERF_NAMES=${PERF_NAMES};

backend-perf-clinic:
	@echo Start API in clinic mode
	@export EXEC_ENV=production; export BACKEND_LOG_LEVEL=debug; \
		${DC_BACKEND} run -v ${BACKEND}/clinic:/${APP}/clinic/ -d -e BACKEND_TMP_MAX='100000' --rm --name deces-backend --use-aliases backend /bin/sh -c "apk --no-cache add npm && npm install clinic && NO_INSIGHT=true ./node_modules/.bin/clinic doctor -- node dist/index.js && mkdir -p clinic && cp -r /${APP}/.clinic/* /${APP}/clinic"
	@timeout=${BULK_TIMEOUT} ; ret=1 ;\
		until [ "$$timeout" -le 0 -o "$$ret" -eq "0"  ] ; do\
			(docker exec -i ${USE_TTY} `docker ps -l --format "{{.Names}}" --filter name=deces-backend` curl -s --fail -X GET http://localhost:${BACKEND_PORT}/deces/api/v1/version > /dev/null) ;\
			ret=$$? ;\
			if [ "$$ret" -ne "0" ] ; then\
				echo -e "try still $$timeout seconds to start backend before timeout" ;\
			fi ;\
			((timeout--)); sleep 1 ;\
		done ;\
	echo -e "backend started in $$((BULK_TIMEOUT - timeout)) seconds"; exit $$ret

backend-perf-clinic-stop:
	@echo Stop backend development container
	@docker exec `docker ps -l --format "{{.Names}}" --filter name=deces-backend` /bin/sh -c "kill -INT \`pidof node\`"
	@docker logs --tail 5 `docker ps -l --format "{{.Names}}" --filter name=deces-backend` -f
	@ls -R ${BACKEND}/clinic

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

dev: network backend-dev-stop ${WIKIDATA_LINKS} ${COMMUNES_JSON} ${DISPOSABLE_MAIL} ${DB_JSON} ${PROOFS} ${JOBS} smtp backend-dev

dev-stop: backend-dev-stop smtp-stop

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

communes-push:
	@echo "preparing communes geo data"
	@sudo apt-get install gdal-bin
	@curl --retry 5 -L -l 'https://www.data.gouv.fr/fr/datasets/r/0e117c06-248f-45e5-8945-0e79d9136165' -o communes-20220101.zip
	@echo "finish downloading"
	@unzip -o  communes-20220101.zip  -d communes-20220101
	@ogr2ogr -f GeoJSON -s_srs EPSG:26917 -t_srs EPSG:4326 communes-20220101.json communes-20220101/communes-20220101.shp -simplify 0.001
	@rm -rf communes-20220101
	@mv communes-20220101.json ${COMMUNES_JSON}
	@make -C ${APP_PATH}/${GIT_TOOLS} storage-push\
		FILE=${COMMUNES_JSON}\
		STORAGE_BUCKET=${STORAGE_BUCKET} STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY} STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY};\

${COMMUNES_JSON}: config
	@echo "downloading communes geo data"
	@make -C ${APP_PATH}/${GIT_TOOLS} storage-pull\
		FILE=communes.json DATA_DIR=${BACKEND}/data\
		STORAGE_BUCKET=${STORAGE_BUCKET} STORAGE_ACCESS_KEY=${STORAGE_ACCESS_KEY} STORAGE_SECRET_KEY=${STORAGE_SECRET_KEY};\

communes-pull: ${COMMUNES_JSON}

communes: communes-pull

${DISPOSABLE_MAIL}: config
	@echo "preparing disposable mail resources"
	@curl --retry 5 -L -l 'https://raw.githubusercontent.com/unkn0w/disposable-email-domain-list/main/domains.txt' -o ${DISPOSABLE_MAIL}.tmp1
	@curl --retry 5 -L -l 'https://gist.githubusercontent.com/adamloving/4401361/raw/e81212c3caecb54b87ced6392e0a0de2b6466287/temporary-email-address-domains' -o ${DISPOSABLE_MAIL}.tmp2
	@curl --retry 5 -L -l 'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt' -o ${DISPOSABLE_MAIL}.tmp3
	@curl --retry 5 -L -l 'https://raw.githubusercontent.com/FGRibreau/mailchecker/master/list.txt' -o ${DISPOSABLE_MAIL}.tmp4
	@cat ${DISPOSABLE_MAIL}.tmp1 ${DISPOSABLE_MAIL}.tmp2 ${DISPOSABLE_MAIL}.tmp3 ${DISPOSABLE_MAIL}.tmp4 | sort | uniq > ${DISPOSABLE_MAIL}
	@rm ${DISPOSABLE_MAIL}.tmp1 ${DISPOSABLE_MAIL}.tmp2 ${DISPOSABLE_MAIL}.tmp3 ${DISPOSABLE_MAIL}.tmp4

disposable-mail: ${DISPOSABLE_MAIL}

${PROOFS}:
	mkdir -p ${PROOFS}

${JOBS}:
	mkdir -p ${JOBS}

${DB_JSON}:
	@echo "initiating void db";\
	echo '{}' > ${DB_JSON}

db-json: ${DB_JSON}

smtp:
	${DC_SMTP} up -d

smtp-stop:
	${DC_SMTP} down

###########
#  Start  #
###########

start: elasticsearch elasticsearch-index-readiness backend-start
	@sleep 2 && docker-compose logs

up: start
