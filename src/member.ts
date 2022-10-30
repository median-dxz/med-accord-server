import net from "node:net";
import { AccordServer } from "./server.js";
import { MemberHash } from "./type.js";

export class Member {
    hash: MemberHash = "";
    name = "";
    avatar = "";
    server?: AccordServer;

    constructor(name: string, avatar: string, hash: MemberHash) {
        [this.name, this.avatar, this.hash] = [name, avatar, hash];
    }
}
