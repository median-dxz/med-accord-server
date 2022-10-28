import crypto from "node:crypto";
import net from "node:net";
import { AccordServer } from "./server.js";

export class Member {
    hash = "";
    name = "";
    avatar = "";
    socket?: net.Socket = null;
    online = false;

    constructor(data: { name: string; avatar: string }) {
        const { name, avatar } = data;
        [this.name, this.avatar] = [name, avatar];
    }

    join(server: AccordServer) {
        let hash = crypto.randomBytes(4).toString("hex");
        while (Object.hasOwn(server.members, hash)) {
            hash = crypto.randomBytes(4).toString("hex");
        }
        this.hash = hash;
        server.members[hash] = this;
        server.memberCount++;
    }

    exit(server: AccordServer) {
        this.socket.end();
        delete server.members[this.hash];
        server.memberCount--;
    }

    enter(socket: net.Socket) {
        this.socket = socket;
        this.online = true;
    }

    leave() {
        this.online = false;
        this.socket.end();
    }
}
