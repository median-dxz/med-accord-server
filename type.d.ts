import { Socket } from "node:net";
import { Member } from "server";

declare namespace AccordServerInfo {
    declare interface BaseInfo {
        hash: ServerHash;
        showName: string;
        icon: string;
        actualName: string;
    }

    declare type MsgType = "file" | "image" | "text";

    declare interface Msg {
        type: MsgType;
        MIME: string;
        time: Date;
        content: BinaryData;
    }

    declare type MembersMap = {
        [hash: string]: Partial<Member>;
    };

    declare interface MemberData {
        name: string;
        avatar: BinaryData;
        hash: MemberHash;
    }

    declare type ActionType = "close" | "join" | "enter" | "accept" | null;
    declare interface ConnectionData {
        action: ActionType;
        msg: string;
        data: any;
    }

    declare interface ConnectionDataJoin {
        name: string;
        hash: ServerHash;
    }

    declare type ConnectionDataEnter = [
        serverHash: ServerHash,
        memberHash: MemberHash
    ];
}

declare interface GlobalConfig {
    HttpServer: ServerHost;
    AccordServer: ServerHost;
}

declare interface ServerHost {
    host: string;
    port: number;
}

type ServerHash = number;
type MemberHash = number;
