# API Personnes Décédées <img src="https://github.com/matchID-project/deces-ui/raw/dev/public/favicon.svg" width="180" align="right" />

![Build status](https://img.shields.io/github/actions/workflow/status/matchid-project/deces-backend/dockerimage.yml) [![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0) ![Docker Pulls](https://img.shields.io/docker/pulls/matchid/deces-backend?label=Docker%20pulls)

API for people who died in France from 1970.

## Features

* Multiple fields can be used as a filter:
  * First/Last name
  * Birth/Death date
  * Birth/Death location (country, department, city, gps coordinate)
  * Age
  * Sex
* The API can handle common mistakes in fields thanks to fuzzy matching
* Bulk process (CSV or bulk JSON) for multiple identities
* Express framework for REST API
* OpenAPIv3 documentation automatically generated using
  [TSOA](https://github.com/lukeautry/tsoa)
* Docker image is published at [docker
  hub](https://hub.docker.com/r/matchid/deces-backend) using GitHub Actions.

Detailed documentation is available at [this swagger page](https://deces.matchid.io/deces/api/v1/docs)

## Installation

Install using docker compose:

```bash
make up
```

Before starting a database has to be charged in elasticsearch. Please refer to
[dataprep repository](https://github.com/matchID-project/deces-dataprep).

## Project resources

* [Source code](https://github.com/matchid-project/deces-backend)
* [Issue tracker](https://github.com/matchid-project/deces-backend/issues)

## License

Source code has been published using [LGPL 3.0](https://github.com/matchID-project/deces-backend/blob/dev/LICENCE).

© 2020 Cristian Brokate, DNUM - SDIT
