import { Member } from "./member.js";
import { AccordAction, ServerHash } from "./type.js";

export class AccordServer {
    name = "";
    actualName = "";
    icon = "";
    msgs: Message[] = [];
    members: { [hash: string]: Member } = {};

    constructor(serverOption: BaseInfo) {
        this.name = serverOption.showName;
        this.actualName = serverOption.actualName;
    }

    broadcast(dataSender: Function, data: any) {
        Object.keys(this.members).forEach((key) => {
            dataSender.call(this.members[key], data);
        });
    }

    updateMembers() {
        const data: AccordAction.UpdateMemberList = Object.keys(this.members).map((key) => {
            return {
                avatar: this.members[key].avatar,
                name: this.members[key].name,
            };
        });
        this.broadcast(Member.prototype.updateMembers, data);
    }

    getHistoryMessages(filter: AccordAction.HistoryMessages) {
        let l = 0,
            r = this.msgs.length - 1;
        let index = 0;
        
        while (l <= r) {
            let mid = (l + r) >> 1;
            let time = this.msgs[mid].date;
            if (time <= filter.timestamp) {
                index = l;
                l = mid + 1;
            } else {
                r = mid - 1;
            }
        }

        const data: Message[] = this.msgs.filter((v, i) => i <= index && i >= index - filter.limit + 1);
        this.broadcast(Member.prototype.newMessage, data);
    }

    memberEnter(memberHash: string, member: Member) {
        this.members[memberHash] = member;
    }

    memberLeave(memberHash: string) {
        delete this.members[memberHash];
        this.updateMembers();
    }

    messageReceive(message: Message) {
        message.index = this.msgs.length;
        this.msgs.push(message);
        this.broadcast(Member.prototype.newMessage, [message]);
    }
}

export interface BaseInfo {
    hash: ServerHash;
    showName: string;
    icon: string;
    actualName: string;
}

export interface Message {
    index: number;
    type: "image" | "file" | "text";
    content: string | BinaryData;
    date: number; // timestamp
    name: string;
    avatar: string;
}

export interface DataHeader {
    ContentLength: number;
    ContentMime: string;
    ContentEncoding: "utf8" | "binary";
    Action: AccordAction.ActionType;
}
