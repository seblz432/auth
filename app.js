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

var UserSchema = new mongoose.Schema({
});

const UserModel = new mongoose.model("user", {
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

app.use(express.json())

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

/* Insecure test endpoints */
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
