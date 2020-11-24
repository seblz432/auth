const { validate: uuidValidate, v4: uuidv4 } = require('uuid');

const express = require('express')
const app = express()
const port = 3000

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/users', {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true,});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to mongodb://localhost/users')
});

const UserModel = new mongoose.model("user", {
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true, required: true },
  refreshTokens: [{
    deviceID: { type: String, unique: true },
    token: { type: String }
  }]
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

app.use(express.json())

function generateJWT () {
  
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/signup', function (req, res) {
  const newUser = new UserModel({
    username: req.body.username,
    password: req.body.password
  })

  //Look for an existing user with same username to avoid duplicates
  UserModel.findOne({ username: newUser.username }, function (err, user) {
    if (err) res.status(500).end();

    if (user === null) {
      newUser.save(function (err, newUser) {
        if (err) res.status(500).end();
        res.status(201).end();
      });
    } else {
      res.status(409).send({ message: "user already exists" })
    }
  });
})

app.post('/login', function (req, res) {
  const reqParsed = {
    username: req.body.username,
    password: req.body.password,
    deviceID: req.body.deviceID
  }

  if (!uuidValidate(reqParsed.deviceID)) res.status(400).send({ message: "invalid uuid" })

  UserModel.findOne({ username: reqParsed.username }, function (err, user) {
    if (err) res.status(500).end();

    //check username
    if (user === null) {
      res.status(401).send({ message: "user doesn't exist" })
    }
    //check password
    else if (reqParsed.password === user.password) {
      const tempUser = user;
      const tokens = user.refreshTokens.map(el => el.deviceID);
      const matchIndex = tokens.indexOf(reqParsed.deviceID);

      //make sure device doesn't already have a refresh token
      if (matchIndex === -1) {
        tempUser.refreshTokens.push({
          deviceID: reqParsed.deviceID,
          token: uuidv4()
        })
      } else {
        //update existing refresh token if one exists
        tempUser.refreshTokens[matchIndex] = {
          deviceID: reqParsed.deviceID,
          token: uuidv4()
        }
      }
      //save updates to database
      tempUser.save(function (err, updatedUser) {
        if (err) res.status(500).send(err);
        res.status(200).json({ token: user.refreshTokens[matchIndex].token });
      });
    } else {
      res.status(401).send({ message: "wrong password" })
    }
  });
})

// Insecure test endpoints
app.post('/deleteUser', function (req, res) {
  UserModel.deleteOne({ username: req.body.username }, function (err) {
    if (err) res.status(500).end();
  });

  res.status(200).end();
})

app.get('/getUsers', (req, res) => {
  UserModel.find(function (err, users) {
    if (err) return console.error(err);
    res.json(users);
  })
})
