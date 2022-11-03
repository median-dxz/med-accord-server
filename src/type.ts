export namespace AccordAction {
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
        | "historyMessages"
        | "refuse"
        | "timeout";

    export interface Enter {
        serverHash: ServerHash;
        memberHash: MemberHash;
        avatar: string;
        name: string;
    }

    export type UpdateMemberList = Array<{
        avatar: string;
        name: string;
    }>;

    export interface Accept {
        msg: string;
        action: ActionType;
    }

    export interface HistoryMessages {
        timestamp: number;
        limit: number;
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
