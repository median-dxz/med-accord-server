import { Member } from "./member.js";

export namespace AccordServer {
    export interface BaseInfo {
        hash: ServerHash;
        showName: string;
        icon: string;
        actualName: string;
    }

    export interface Message {
        index: number;
        type: "image" | "file" | "text";
        data: string | BinaryData;
        date: Date;
        sender: MemberHash;
    }

    export interface DataHeader {
        ContentLength: number;
        ContentMime: string;
        ContentEncoding: "utf8" | "binary";
        Action: ActionType;
    }

    export type ActionType =
        | "enter"
        | "leave"
        | "createServer"
        | "changeName"
        | "changeHash"
        | "sendMessage"
        | "accept"
        | "receiveMessage"
        | "updateMemberList"
        | "timeout";
}

export interface GlobalConfig {
    HttpServer: ServerHost;
    AccordServer: ServerHost;
}

export interface ServerHost {
    hostname: string;
    port: number;
}

export type ServerHash = number;
export type MemberHash = number;
