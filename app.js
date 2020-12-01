const { validate: uuidValidate, v4: uuidv4 } = require('uuid');
const { generateKeyPair } = require('crypto');
const { default: SignJWT } = require('jose/jwt/sign')

var cookieParser = require('cookie-parser')
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

var publicKey;
var privateKey;

generateKeyPair('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
}, (err, pubKey, privKey) => {
  publicKey = pubKey;
  privateKey = privKey;
});

async function generateAccessToken (username) {
  try {
    const jwt = await new SignJWT({
      'sub': username
    })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setIssuer('sepia.co:auth')
    .setAudience('sepia.co:media')
    .setExpirationTime('15m')
    .sign(privateKey)

    return jwt;
  } catch (e) {
    throw e;
  }
}

app.use(express.json())
app.use(cookieParser())

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/getPublicKey', (req, res) => {
  res.send(publicKey)
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

  if (!uuidValidate(reqParsed.deviceID)) res.status(400).send({ message: "invalid device id" })

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

      const newRefreshToken = uuidv4();

      //make sure device doesn't already have a refresh token
      if (matchIndex === -1) {
        tempUser.refreshTokens.push({
          deviceID: reqParsed.deviceID,
          token: newRefreshToken
        })
      } else {
        //update existing refresh token if one exists
        tempUser.refreshTokens[matchIndex] = {
          deviceID: reqParsed.deviceID,
          token: newRefreshToken
        }
      }

      //save updates to database
      tempUser.save(function (err, updatedUser) {
        if (err) res.status(500).send(err);

        generateAccessToken(reqParsed.username).then( accessToken => {
          res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: false, sameSite: "strict" });
          res.cookie('accessToken', accessToken, { httpOnly: true, secure: false, sameSite: "strict" });
          res.status(200).end();
        }).catch(err => {
          res.status(500).send(err);
        })
      });
    } else {
      res.status(401).send({ message: "wrong password" })
    }
  });
})

app.post('/refresh', function (req, res) {
  const reqParsed = {
    username: req.body.username,
    deviceID: req.body.deviceID,
    refreshToken: req.cookies.refreshToken
  }

  if (reqParsed.refreshToken) {
    UserModel.findOne({ username: reqParsed.username }, function (err, user) {
      if (err) res.status(500).end();

      //check username
      if (user === null) {
        res.status(401).send({ message: "user doesn't exist" })
      } else {
        const tokens = user.refreshTokens.map(el => el.deviceID);
        const matchIndex = tokens.indexOf(reqParsed.deviceID);

        if (matchIndex === -1) {
          res.status(401).send({ message: "device not logged in" })
        } else {
          if (reqParsed.refreshToken === user.refreshTokens[matchIndex].token){
            generateAccessToken(reqParsed.username).then( accessToken => {
              res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: "strict" });
              res.status(200).end();
            }).catch(err => {
              res.status(500).send(err);
            })
          } else {
            res.status(401).send({ message: "invalid refresh token" })
          }
        }
      }
    })
  } else {
    res.status(401).send({ message: "missing refresh token" })
    console.log(req.cookies)
  }
})

app.post('/logout', function (req, res) {
  const reqParsed = {
    username: req.body.username,
    deviceID: req.body.deviceID,
    refreshToken: req.cookies.refreshToken
  }

  if (reqParsed.refreshToken) {
    UserModel.findOne({ username: reqParsed.username }, function (err, user) {
      if (err) res.status(500).end();

      //check username
      if (user === null) {
        res.status(401).send({ message: "user doesn't exist" })
      } else {
        const tokens = user.refreshTokens.map(el => el.deviceID);
        const matchIndex = tokens.indexOf(reqParsed.deviceID);

        if (matchIndex === -1) {
          res.status(401).send({ message: "device not logged in" })
        } else {
          if (reqParsed.refreshToken === user.refreshTokens[matchIndex].token){
            const tempUser = user;
            tempUser.refreshTokens.splice(matchIndex, 1)

            tempUser.save(function (err, updatedUser) {
                if (err) res.status(500).send(err);

                res.clearCookie('refreshToken');
                res.clearCookie('accessToken');
                res.status(200).end()
            })
          } else {
            res.status(401).send({ message: "invalid refresh token" })
          }
        }
      }
    })
  } else {
    res.status(401).send({ message: "missing refresh token" })
    console.log(req.cookies)
  }
})

// Insecure test endpoints
/*app.post('/deleteUser', function (req, res) {
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
})*/
