var express = require("express");
var socket = require("socket.io");
var mysql = require('mysql');

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
  var sql = "CREATE TABLE IF NOT EXISTS user (message_id int AUTO_INCREMENT, room_id int, id int, message VARCHAR(255), PRIMARY KEY (message_id))";
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

console.log("the middle")


  



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


  socket.on("sendMessage", function(data) {
    io.sockets
      .to(socket.currentRoom)
      .emit("updateChat", socket.username, data);
  });


  socket.on("createRoom", function(room) {
    if (room != null) {
      sql = "INSERT INTO rooms (room_name) VALUES ('"+ room +"')";
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
