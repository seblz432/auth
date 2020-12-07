# Authentication Service

This is the authentication service for the Sepia backend which follows a microservice architecture. This service handles any account related requests. Using the login endpoint the client gets back a refresh token (randomly generated UUID) and an access token (signed JWT). The access token can be used to authorize the client for any other request to other services, and the regresh token can be used with this service to grab a new access token.

## Local Setup

Install node (the following uses nvm):

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
    nvm install node # "node" is an alias for the latest version

Install MongoDB:

[MongoDB installation instructions for Linux](https://docs.mongodb.com/manual/administration/install-on-linux/)

Or if you're running WSL2:

[MongoDB installation instructions for WSL](https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-database)

## Run the service

Run the following commands:

    sudo systemctl start mongod
    node app.js

### Alternatively with hot reloading:

Install nodemon with `npm install -g nodemon` and run the following:
   
    sudo systemctl start mongod
    nodemon app.js


### Running mongodb on WSL:
   
    sudo service mongodb start

## Stop MongoDB

    sudo systemctl stop mongod
