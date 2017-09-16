# New2Austin

New2Austin helps to solve the problem of finding a good and safe place to live for anybody looking
to move to the Austin area. The app uses the Google Maps API combined with Austin Police
Department open data to display reported crimes on the map, and allows users to search
for specific areas of interest, or places of interest once a suitable area is found.

## Getting Started

The project is written completely in javascript, with the index page served via Node / Express.
Anybody can git clone or fork this report to get a working copy.

### Prerequisites

None - the project is to run entirely on the frontend with the exception of Node / Express
to serve the static home page.

### Installing

Clone or fork the repository, and git a copy of the project locally

Navigate to the new folder on your local drive

Install NPM dependencies

```
npm install
```

Start the server - runs on port 5000 by default

```
npm start
```

Sample screenshot:
![Alt text](./README_screenshot.png?raw=true "Sample screenshot")


## Built With

* [Materialize](http://materializecss.com/) - A modern responsive front-end framework based on Material Design
* [Google Maps](https://developers.google.com/maps/) - Integration of all maps features
* [Austin's Open Data Portal](https://data.austintexas.gov/) - Data source for crimes data
* [Heroku](https://www.heroku.com/) - Deployment of production code
