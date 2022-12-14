import http from "http";
import SocketIO from "socket.io";
// import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);
// const wsServer = new Server(httpServer, {
//   cors: {
//     origin: ["https://admin.socket.io"],
//     credentials: true,
//   },
// });
// instrument(wsServer, {
//   auth: false,
// });

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}
function countRoom(roomName) {
  // roomName을 찾을 수도 있지만 아닐 수도있기에, ?를 넣어준다.
  return wsServer.sockets.adapter.rooms.get(roomName)?.size; // Set이기 때문에 size를 써준다.
}
wsServer.on("connection", (socket) => {
  // wsServer.socketsJoin("announcement"); // 모든 유저가 announcement 채널로 가게한다.
  socket.nickname = "Anonymous";
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });
  // server.js에서 emit 했던 3번째 argument에 있던 함수가 done이 됩니다.
  socket.on("enter_room", (roomName, done) => {
    socket.join(roomName);
    // 이 done function은 프론트엔드에서 실행 버튼을 눌러주는 것이라 보면됩니다.
    done(countRoom(roomName)); // 이 function은 보안 문제의 이유로 백엔드에서 실행시키지 않습니다.
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms()); //
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach(
      (room) =>
        socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1) //아직 방을 떠나지 않았기에 -1을 해준다
    );
  });
  socket.on("disconnect", () => {
    wsServer.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
  socket.on("nickname", (nickname) => (socket.nickname = nickname));
});
const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
