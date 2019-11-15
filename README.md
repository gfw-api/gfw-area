# GFW Area API

[![Build Status](https://travis-ci.org/gfw-api/gfw-area.svg?branch=develop)](https://travis-ci.org/gfw-api/gfw-area)
[![Test Coverage](https://api.codeclimate.com/v1/badges/d4eaa98d51c79d83159b/test_coverage)](https://codeclimate.com/github/gfw-api/gfw-area/test_coverage)

This repository is the microservice that implements the area
functionality

1. [Getting Started](#getting-started)

## Getting Started

### OS X

**First, make sure that you have the [API gateway running
locally](https://github.com/control-tower/control-tower).**

We're using Docker which, luckily for you, means that getting the
application running locally should be fairly painless. First, make sure
that you have [Docker Compose](https://docs.docker.com/compose/install/)
installed on your machine.

```
git clone https://github.com/Vizzuality/gfw-area-api.git
cd gfw-area-api
./area.sh develop

You can now access the microservice through the CT gateway.

```

### Configuration

It is necessary to define these environment variables:

* CT_URL => Control Tower URL
* NODE_ENV => Environment (prod, staging, dev)


## Quick Overview

### Area Entity

```

name: <String>, required
geostore: <String>
wdpaid: <Number>
createdAt: <Date>
userId: <String>
datasets: JSON.stringify([{
    slug: 'viirs',
    name: 'VIIRS',
    active: false,
    startDate: '20150101',
    endDate: '20170101'
}])

```

geostore or wdpaid are required. Only one.

### CRUD Area

```

GET: /area -> Return all areas of the user logged
GET: /area/:id -> Return area with the same id. Check if the area is owned of the logged user
POST: /area -> Create an area and associate to the user. With body:

#form data
name: "my-area"
geostore: "2a23af251"

PATCH: /area/:id -> Update the area with the same id. Check if the area is owned of the logged user
DELETE: /area/:id -> Delete the area with the same id. Check if the area is owned of the logged user

```
