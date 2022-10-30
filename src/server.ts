import { Member } from "./member.js";
import { AccordServer as Accord } from "./type.js";

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
}
