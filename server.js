var express = require("express");
var socket = require("socket.io");
var mysql = require('mysql');
const { ReplSet } = require("mongodb");

var app = express();

app.use(express.static("public"));

var server = app.listen(5000, function() {
  console.log("Listening to port 5000.");
});

var io = socket(server);

// Global variables to hold all usernames and rooms created
var usernames = {};
var rooms = ["global"];

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: ""
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  con.query("CREATE DATABASE IF NOT EXISTS chatdb", function (err, result) {
    if (err) throw err;
    console.log("Database created");
  });
  con.changeUser({database : 'chatdb'}, function(err) {
    if (err) throw err;
  });
  if (err) throw err;
  console.log("Connected!");
  var sql = "CREATE TABLE IF NOT EXISTS user (id int AUTO_INCREMENT, name VARCHAR(255), password VARCHAR(255), PRIMARY KEY (id))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("User Table created");
  });
  var sql = "CREATE TABLE IF NOT EXISTS rooms (room_id int AUTO_INCREMENT, room_name VARCHAR(255), PRIMARY KEY (room_id))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Room Table created");
  });
  var sql = "CREATE TABLE IF NOT EXISTS messages (message_id int AUTO_INCREMENT, room_id int, id int, message VARCHAR(255), PRIMARY KEY (message_id))";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Table created");
  });
  var sql = "SELECT room_name FROM rooms";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result);
    for (i in result){
      console.log(i);
      rooms.push(result[i].room_name);
    }
    console.log(rooms);
    
  });
});

io.on("connection", function(socket) {

  console.log("User connected to server.");

  socket.on("createUser", function(username) {
    socket.username = username;
    usernames[username] = username;
    socket.currentRoom = "global";
    socket.join("global");
    socket.emit("updateChat", "INFO", "You have joined global room");
    socket.broadcast
      .to("global")
      .emit("updateChat", "INFO", username + " has joined global room");
    io.sockets.emit("updateUsers", usernames);
    socket.emit("updateRooms", rooms, "global");
  });

  socket.on("storeUser", function(username, password){
      console.log(username, password);
      var con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database:"chatdb"
      });
  
      sql = "SELECT EXISTS (SELECT name FROM user WHERE name ='"+ username +"') AS e";
      con.query(sql, function (err, result) {
      if (err) throw err;
        if(result[0].e == 0){
          sql = "INSERT INTO user (name, password) VALUES ('"+username+"', '"+password+"')";
          con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("1 user inserted");
          });
        }
      });
  });


  socket.on("sendMessage", function(data) {
    var uID = 0;
    console.log("MSG::: ", socket.currentRoom, data);

    var con = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database:"chatdb"
    });
    sql1 = "SELECT id FROM user WHERE name='"+socket.username+"'";
    con.query(sql1, function(err, result) {
      if(err) throw err;
      var uID = result[0].id;
      console.log("id", uID);
    });

    var room = rooms.indexOf(socket.currentRoom);

    sql = "INSERT INTO messages (room_id, id, message) VALUES ('"+room+"', '"+uID+"', '"+data+"')";
    con.query(sql, function(err, result) {
      if(err) throw err;
      console.log("message inserted", result);
    });

    io.sockets
      .to(socket.currentRoom)
      .emit("updateChat", socket.username, data);
  });


  socket.on("createRoom", function(room) {
    if (room != null) {
      sql = "INSERT IGNORE INTO rooms (room_name) VALUES ('"+ room +"')";
      con.query(sql, function(err){
        if(err) throw err;
        console.log("room inserted")
      });
      rooms.push(room);
      io.sockets.emit("updateRooms", rooms, null);
    }
  });


  socket.on("updateRooms", function(room) {
    socket.broadcast
      .to(socket.currentRoom)
      .emit("updateChat", "INFO", socket.username + " left room");
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room);
    socket.emit("updateChat", "INFO", "You have joined " + room + " room");
    socket.broadcast
      .to(room)
      .emit("updateChat", "INFO", socket.username + " has joined " + room + " room");
  });


  socket.on("disconnect", function() {
    delete usernames[socket.username];
    io.sockets.emit("updateUsers", usernames);
    socket.broadcast.emit("updateChat", "INFO", socket.username + " has disconnected");
  });

});
