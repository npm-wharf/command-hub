# command-hub

A service built to securely manage the continuous deployment to multiple Kubernetes clusters via their hikaru services.

[![Build Status][travis-image]][travis-url]
[![Coverage Status][coveralls-image]][coveralls-url]

## Goals

command-hub exists to solve the challenge of managing deployments to multiple Kubernetes clusters using the installed [hikaru](https://github.com/npm-wharf/hikaru) service API. command-hub is designed to work with hikaru's asymmetric key encrypted token exchange to prevent an attacker being able to take control of a cluster's installed software.

command-hub provides multiple ways to manage the list of endpoints it can manage. By default, it supports the ability to keep a list of clusters stored in a redis endpoint. The ability to change this with a custom storage back-end via a very simple plugin approach is explained later.

### Library form
Installing command-hub as a module will allow you to call the API endpoints as simple function calls after providing some configuration: the URL, the token and the location of the key files needed to encrypt and sign the token.

### CLI mode
The CLI version exists to support CI contexts in which you wish to notify your clusters of newly built image:tags so that they can perform upgrades as configured. As with the library form, arguments or environment variables are required to specify the URL, token and location of the key files.

## Security

Both the hub API and hikaru API are designed to use API tokens and asymmetric encryption. This means that each endpoint needs its own private key plus the public key(s) of the systems they communicate with. A script is included in the repo `./create-keys.sh` which will create three 4096 bit RSA key pairs under a `./certs` folder with pairs for hub clients, the hub and the hikaru service endpoints.

## Environment Variables

Service configuration:

 * `API_TOKEN` - the token used by clients to authenticate with the hub API
 * `HIKARU_TOKEN` - the token to use to authenticate with hikaru endpoints
 * `HUB_PRIVATE_KEY` - path to secret private key
 * `HIKARU_PUBLIC_KEY` - path to shared public key for hikaru installations
 * `CLIENT_PUBLIC_KEY` - path to shared public key for client's calling hub API
 * `ETCD` - the URL to etcd, required by kickerd (even if unnused)

If storing cluster endpoints in redis:

 * `REDIS_URL` - redis url to connect to for storing hikaru endpoint information

If using providing an API to fetch cluster URLs from:

 * `CLUSTER_API_HOST` - the root http url - example: `https://host:port/api`
 * `CLUSTER_API_LIST` - the url used to fetch the cluster list - example: `/cluster`
 * `CLUSTER_API_CLUSTER` - the url to get cluster detail - example: `/cluster/{id}`
 * `CLUSTER_API_TOKEN` - a bearer token to use for authenticating
 * `CLUSTER_API_USER` - a username to use for authenticating
 * `CLUSTER_API_PASS` - a password to use for authenticating

CLI and module specific configuration variables:

 * `HUB_URL` - the url where command-hub is hosted (for module and CLI configuration)
 * `CLIENT_PRIVATE_KEY` - path to secret client private key
 * `HUB_PUBLIC_KEY` - path to shared public key for hub

### ETCD Keys (kicker.toml)

Like [hikaru](https://github.com/npm-wharf/hikaru), command-hub uses [kickerd](https://github.com/npm-wharf/kickerd) to monitor etcd for environment variable values and changes to the keys. Here is the etcd key to environment variable mapping:

 * `comhub_api_token` - `API_TOKEN`
 * `hikaru_api_token` - `HIKARU_TOKEN`
 * `local_private_key` - `HUB_PRIVATE_KEY`
 * `hikaru_public_key` - `HIKARU_PUBLIC_KEY`
 * `client_public_key` - `CLIENT_PUBLIC_KEY`
 * `redis_url` - `REDIS_URL`
 * `cluster_api_host` - `CLUSTER_API_HOST`
 * `cluster_api_list` - `CLUSTER_API_LIST`
 * `cluster_api_cluster` - `CLUSTER_API_CLUSTER`
 * `cluster_api_token` - `CLUSTER_API_TOKEN`
 * `cluster_api_user` - `CLUSTER_API_USER`
 * `cluster_api_pass` - `CLUSTER_API_PASS`

## HTTP API

### List Clusters

Retrieves a list of clusters.

`GET /api/cluster`

#### Response

`content-type: application/json`

`200 OK`

```json
{
  "clusters": [
  	{ "name": "one", "url": "https://one.root.net" },
  	{ "name": "two", "url": "https://two.root.net" }
  ]
}
```

### Add Cluster - optional

Adds a cluster endpoint. Only used if using a backing store instead of calling to another API for cluster listing/metadata.

`POST /api/cluster`
`content-type: application/json`
```json
{
  "name": "one",
  "url": "https://one.root.net"
}
```

#### Response

`201 Created`

### Remove Cluster - optional

Removes a cluster endpoint. Only used if using a backing store instead of calling to another API for cluster listing/metadata.

`DELETE /api/cluster/{name}`

#### Response

`204 No Content`

> Note: this is *not* the same as calling the hikaru remove command. That command is not currently supported from this API as it's such an uncommon and destructive use case.

### Get Upgrade Candidates

Returns a hash containing lists of workloads:
 * `upgrade` has the list of workloads eligible for upgrade. 
 * `obsolete` is the list of compatible workloads that have a newer version than the posted image
 * `equal` is the list of compatible workloads that already have the image
 * `error` is the list of workloads that were ignored which includes a `diff` property with a brief explanation of why they were ignored 

`GET /api/cluster/{name}/image/{image}?filter=`
`GET /api/cluster/{name}/image/{repo}/{image}?filter=`
`GET /api/cluster/{name}/image/{registry}/{repo}/{image}?filter=`

The filter query parameters accepts a comma delimited list of fields that you want used to determine upgrade eligibility. Valid fields are:

  * `imageName`
  * `imageOwner`
  * `owner`
  * `repo`
  * `branch`
  * `fullVersion`
  * `version`
  * `build`
  * `commit`

The reason for the multiple forms may not be obvious until you see examples:

`GET /api/cluster/one/image/nginx:1.13-alpine`
`GET /api/cluster/one/image/arobson/hikaru:latest`
`GET /api/cluster/one/image/quay.io/coreos/etcd:v3.3.3`

You could make the last form more permissive by telling it to only consider the `imageOwner`:

`GET /api/cluster/one/image/quay.io/coreos/etcd:v3.3.3?filter=imageOwner`

So that it would upgrade any workload using any `etcd` image regardless of whether or not it was the coreos Docker image or not.

#### Response

`content-type:  "application/json"`

`200 OK`

```json
{
  "upgrade": [ 
    {
      {
        "namespace": "namespace-name",
        "type": "workload-type",
        "service": "workload-name",
        "image": "docker-repo/docker-image:tag",
        "container": "container-name",
        "metadata": {
            "imageName": "docker-image",
            "imageOwner": "docker-repo",
            "owner": "tag-owner or docker-repo",
            "repo": "tag-repo or docker-repo",
            "branch": "tag-master or 'master'",
            "fullVersion": "tag-version-and-prerelease or 'latest'",
            "version": "tag-version or 'latest'",
            "prerelease": "tag-prerelease or null"
        },
        "labels": {
            "name": "workload-name",
            "namespace": "workload-namespace-name"
        },
        "diff": "upgrade|obsolete|equal|error",
        "comparedTo": "full-image-spec-used-in-call"
        }
    } 
  ],
  "obsolete": [],
  "equal": [],
  "error": []
}
```

### Upgrade Workloads With Image

Returns a hash containing lists of workloads. 
 * `upgrade` has the list of workloads upgraded. 
 * `obsolete` is the list of compatible workloads that have a newer version than the posted image
 * `equal` is the list of compatible workloads that already have the image
 * `error` is the list of workloads that were ignored which includes a `diff` property with a brief explanation of why they were ignored 

`POST /api/cluster/{name}/image/{image}?filter=`
`POST /api/cluster/{name}/image/{repo}/{image}?filter=`
`POST /api/cluster/{name}/image/{registry}/{repo}/{image}?filter=`

The filter query parameters accepts a comma delimited list of fields that you want used to determine upgrade eligibility. Valid fields are:

  * `imageName`
  * `imageOwner`
  * `owner`
  * `repo`
  * `branch`
  * `fullVersion`
  * `version`
  * `build`
  * `commit`

The reason for the multiple forms may not be obvious until you see examples:

`POST /api/cluster/one/image/nginx:1.13-alpine`
`POST /api/cluster/one/image/arobson/hikaru:latest`
`POST /api/cluster/one/image/quay.io/coreos/etcd:v3.3.3`

You could make the last form more permissive by telling it to only consider the `imageOwner`:

`POST /api/cluster/one/image/quay.io/coreos/etcd:v3.3.3?filter=imageOwner`

So that it would upgrade any workload using any `etcd` image regardless of whether or not it was the coreos Docker image or not.

#### Response

`content-type: application/json`

`200 OK`

```json
{
  "upgrade": [ 
    {
      "namespace": "namespace-name",
      "type": "workload-type",
      "service": "workload-name",
      "image": "docker-repo/docker-image:tag",
      "container": "container-name",
      "metadata": {
          "imageName": "docker-image",
          "imageOwner": "docker-repo",
          "owner": "tag-owner or docker-repo",
          "repo": "tag-repo or docker-repo",
          "branch": "tag-master or 'master'",
          "fullVersion": "tag-version-and-prerelease or 'latest'",
          "version": "tag-version or 'latest'",
          "prerelease": "tag-prerelease or null"
      },
      "labels": {
          "name": "workload-name",
          "namespace": "workload-namespace-name"
      },
      "diff": "upgrade|obsolete|equal|error",
      "comparedTo": "full-image-spec-used-in-call"
    } 
  ],
  "obsolete": [],
  "equal": [],
  "error": []
}
```

### Find Workloads By Image

Returns metadata for any workload that has an image matching the text supplied.

`GET /api/cluster/one/workload/{image}`
`GET /api/cluster/one/workload/{repo}/{image}`
`GET /api/cluster/one/workload/{registry}/{repo}/{image}`

The primary difference between this and the call for upgrade candidates is that this considers anything that matches whatever image segment is provided and returns a single list with no consideration given to upgrade eligibility.

It's just there to make it easy to:

 * get a list of manifests using any nginx image
 * find a list of manifests from a specific image owner
 * find out if any manifests are using a particular version

#### Result

`200 OK`

`content-type: application/json`

```json
[
  {
    "namespace": "namespace-name",
    "type": "workload-type",
    "service": "workload-name",
    "image": "docker-repo/docker-image:tag",
    "container": "container-name",
    "metadata": {
        "imageName": "docker-image",
        "imageOwner": "docker-repo",
        "owner": "tag-owner or docker-repo",
        "repo": "tag-repo or docker-repo",
        "branch": "tag-master or 'master'",
        "fullVersion": "tag-version-and-prerelease or 'latest'",
        "version": "tag-version or 'latest'",
        "prerelease": "tag-prerelease or null"
    },
    "labels": {
        "name": "workload-name",
        "namespace": "workload-namespace-name"
    }
  }
]
```

## CLI

### List Clusters

```shell
comhub cluster list
```

### Add Cluster - optional

```shell
comhub cluster add {name} {url}
```

### Remove Cluster - optional

```shell
comhub cluster remove {name}
```

### Get Upgrade Candidates

```shell
comhub candidates --cluster {name} --image {spec} --filter {properties}
```

The `image` argument accepts any valid Docker image specification:

 * `image:tag` - official images in Docker Hub
 * `repo/image:tag` - images in Docker Hub
 * `registry/repo/image:tag` - images in other registries

The `filter` argument accepts a comma delimited list of fields that you want used to determine upgrade eligibility. Valid fields are:

  * `imageName`
  * `imageOwner`
  * `owner`
  * `repo`
  * `branch`
  * `fullVersion`
  * `version`
  * `build`
  * `commit`

Returns upgrade candidate workloads grouped by lists:

 * workloads to be upgraded are in the the `upgrade` list . 
 * workloads with a newer version are in the `obsolete` list.
 * workloads with the supplied version are in the `equal` list.
 * ignored workloads are in the `error` list.

### Upgrade Workloads With Image

```shell
comhub upgrade --cluster {name} --image {spec} --filter {properties}
```

The `image` argument accepts any valid Docker image specification:

 * `image:tag` - official images in Docker Hub
 * `repo/image:tag` - images in Docker Hub
 * `registry/repo/image:tag` - images in other registries

The `filter` argument accepts a comma delimited list of fields that you want used to determine upgrade eligibility. Valid fields are:

  * `imageName`
  * `imageOwner`
  * `owner`
  * `repo`
  * `branch`
  * `fullVersion`
  * `version`
  * `build`
  * `commit`

Upgrades eligible workloads and returns them in the following lists:

 * workloads that were upgraded are in the the `upgrade` list . 
 * workloads skipped because they have a newer version are in the `obsolete` list.
 * workloads skipped because they already have the supplied version are in the `equal` list.
 * ignored workloads are in the `error` list.

### Find Workloads By Image

Returns metadata for any workload that has an image matching the text supplied.

```shell
comhub find --cluster {name} --image {fragment}
```

Where `image` can match any part of the image specification: registry, repo or image name.

## If Providing A Cluster API

The expected format of data from the list API is for a `name` or `id` property to match the cluster identifier and for a `url` property to provide the endpoint where the cluster can be contacted. If a `hikaru` subdomain is not how to reach the hikaru API for the cluster, then a `hikaru` property should be present on the cluster to specify the route which hikaru's API can be reached.


[travis-url]: https://travis-ci.org/npm-wharf/command-hub
[travis-image]: https://travis-ci.org/npm-wharf/command-hub.svg?branch=master
[coveralls-url]: https://coveralls.io/github/npm-wharf/command-hub?branch=master
[coveralls-image]: https://coveralls.io/repos/github/npm-wharf/command-hub/badge.svg?branch=master
