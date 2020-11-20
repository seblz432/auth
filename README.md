
# Authentication Service


## Local Setup

Install node (the following uses nvm):

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.0/install.sh | bash
    nvm install node # "node" is an alias for the latest version

Install MongoDB:

[MongoDB installation instructions for Linux](https://docs.mongodb.com/manual/administration/install-on-linux/)

## Run the service

Run the following commands:

    npm run dev
    sudo systemctl start mongod


## Stop MongoDB

    sudo systemctl stop mongod
