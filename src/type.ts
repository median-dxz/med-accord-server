export namespace AccordAction {
    export type ActionType =
        | "enter"
        | "leave"
        | "createServer"
        | "sendMessage"
        | "accept"
        | "receiveMessage"
        | "updateMemberList"
        | "historyMessages"
        | "setMemberInfo"
        | "refuse"
        | "timeout";

    export interface IEnter {
        serverHash: ServerHash;
        memberHash: MemberHash;
        avatar: string;
        name: string;
    }

    export interface IMember {
        avatar: string;
        name: string;
    }

    export type UpdateMemberList = Array<IMember>;

    export interface IAccept {
        msg: string;
        action: ActionType;
    }

    export interface IHistoryMessages {
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
