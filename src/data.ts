import { AccordServer } from "./type.js";

export interface AccordProtocolData {
    fixedLength?: number;
    header?: AccordServer.DataHeader;
    body?: Buffer;
}
