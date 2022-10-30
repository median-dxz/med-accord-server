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
        Action: AccordAction.Type;
    }
}

export namespace AccordAction {
    export type Type =
        | "enter"
        | "leave"
        | "createServer"
        | "changeName"
        | "changeHash"
        | "sendMessage"
        | "accept"
        | "receiveMessage"
        | "updateMemberList"
        | "refuse"
        | "timeout";

    export interface Enter {
        serverHash: ServerHash;
        memberHash: MemberHash;
        avatar: string;
        name: string;
    }
}

export interface GlobalConfig {
    HttpServer: ServerHost;
    AccordServer: ServerHost;
}

export interface ServerHost {
    hostname: string;
    port: number;
}

export type ServerHash = string;
export type MemberHash = string;
