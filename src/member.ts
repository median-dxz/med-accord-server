import { Socket } from "node:net";
import { AccordServer } from "./server.js";
import type { Message } from "./server.js";
import { AccordAction, MemberHash } from "./type.js";

export class Member {
    hash: MemberHash = "";
    name = "";
    avatar = "";
    server?: AccordServer;
    socket?: Socket;

    constructor(name: string, avatar: string, hash: MemberHash) {
        [this.name, this.avatar, this.hash] = [name, avatar, hash];
    }

    enter(server: AccordServer, socket: Socket) {
        this.server = server;
        this.socket = socket;
        this.server.memberEnter(this.hash, this);
        this.server.updateMembers();
    }

    updateMembers(data: AccordAction.UpdateMemberList) {
        this.socket.emit("update", "updateMemberList", data);
    }

    newMessage(message: Message[]) {
        this.socket.emit("update", "receiveMessage", message);
    }
}
