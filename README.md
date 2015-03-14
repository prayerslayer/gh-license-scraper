# Github License Scraper

A tool to fetch licenses from Github repositories.

## What does it do?

1. Get repositories from Github using one of two available strategies
2. Put subset of information into CSV file

## Prerequisites

* Node 0.10.x or better
* A Github [Access Token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) that can access private repositories. I.e. the `repo` scope is sufficient.

## Installation and usage

Clone this repository. Then run `node app.js` with the necessary parameters. Stop it using SIGINT, i.e. `ctrl+c`.

## Parameters

* **`token`**: The Access Token. Mandatory.
* `out`: The file to write to. Defaults to `repos.csv`.
* `timeout`: Timeout (in ms) between calls, you only have 5000 per hour. Defaults to 20 seconds.
* `strategy`: Either `popular` or `sample`. Defaults to `popular`.
* `size`: How many repositories do you want to have? Defaults to 10K. Only applicable with `strategy=sample`.
* `pool`: How many repositories to consider? Defaults to roughly 32M (the id of this repo). Only applicable with `strategy=sample`.
* `page`: The page to start from. Only applicable with `strategy=popular`. Defaults to 0.
* `before`: Consider repositores created before `before`. Only applicable with `strategy=popular`. Defaults to `2015-01-01`.

## Strategies

There are two strategies available:

### Popular

Uses the Search API to get the most poular (= most starred) repositories created before a certain date (see parameters above). As of March 2015 the Github Search API will return maximum 1000 results.

### Sample

Take a random sample of repositories (defaults to 10K out of 32M).

## Example

    node app.js --token abcdefgh --before 2015-01-03 --out data.csv