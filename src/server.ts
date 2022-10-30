import { Socket } from "node:net";
import { Member } from "./member.js";
import { AccordAction, AccordServer as Accord } from "./type.js";

export class AccordServer {
    name = "";
    actualName = "";
    icon = "";
    msgs: Accord.Message[] = [];
    members: { [hash: string]: Member } = {};

    constructor(serverOption: Accord.BaseInfo) {
        this.name = serverOption.showName;
        this.actualName = serverOption.actualName;
    }

    updateMembers() {
        const data: AccordAction.UpdateMemberList = Object.keys(this.members).map((key) => {
            return {
                avatar: this.members[key].avatar,
                name: this.members[key].name,
            };
        });

        Object.keys(this.members).forEach((key) => {
            this.members[key].updateMembers(data);
        });
    }

    memberEnter(memberHash: string, member: Member) {
        this.members[memberHash] = member;
    }

    memberLeave(memberHash: string) {
        delete this.members[memberHash];
        this.updateMembers();
    }
}
