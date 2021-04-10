var socket = io.connect("http://localhost:5000");
var username = document.getElementById("inputName");
var password = document.getElementById("inputPass");


socket.on("connect", function() {
    socket.emit("storeUser", { username, password });
});