import { Buffer } from "node:buffer";
import { log } from "node:console";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { AccordProtocolData as ProtocolData } from "./data.js";

import { Member } from "./member.js";

import { AccordServer as Accord, ServerHost } from "./type.js";

export class AccordServer {
    name = "";
    actualName = "";
    icon = "";
    msgs: Accord.Message[] = [];
    members: { [hash: string]: Member } = {};
    memberCount = 0;

    async loadUsers() {
        const fp = path.resolve("data", "servers", this.actualName, "users.json");
        const data = await fs
            .readFile(fp)
            .then((data) => data.toString())
            .then((data) => JSON.parse(data));
        Object.keys(data).forEach((key) => {
            data[key] = new Member(data[key]);
        });
        this.members = data;
        this.memberCount = Object.keys(data).length;
    }

    constructor(serverOption: Accord.BaseInfo) {
        this.name = serverOption.showName;
        this.actualName = serverOption.actualName;
    }
}

interface ServerController {
    host: ServerHost;
    server: net.Server;
    accordServers: { [hash: number]: AccordServer };
    init(host: ServerHost): void;
    start(option: Accord.BaseInfo): void;
    _handleConnection(socket: net.Socket): void;
}

export const ServerController: ServerController = {
    host: null,
    server: null,
    accordServers: {},

    init(host: ServerHost) {
        this.host = host;
        this.server = net.createServer({ keepAlive: true, keepAliveInitialDelay: 3000 }, this._handleConnection);
        this.server.listen(host.port, host.hostname, () => {
            log(`主服务启动`);
        });
    },

    start(option: Accord.BaseInfo) {
        if (this.host != null) {
            this.accordServers[option.hash] = new AccordServer(option);
            const { showName: name } = option;
            log(`服务器: '${name}' 启动`);
            return true;
        } else {
            return false;
        }
    },

    _handleConnection(socket: net.Socket) {
        const { remotePort, remoteAddress } = socket;
        let serverHash = -1;
        let memberHash = -1;
        let chunk = Buffer.alloc(0);
        let protocolData: ProtocolData = {};
        log(`新的连接! 目标主机: ${remoteAddress}:${remotePort}`);

        const consume = async (data: ProtocolData) => {
            // log(data.fixedLength);
            // log(data.header);
            log(data.body.toString("utf8"));
        };

        const reply = async (action: Accord.ActionType) => {
            const data: ProtocolData = {};
            data.body = Buffer.from("进入服务器失败");
            const body = Buffer.from(data.body);
            data.header = {
                Action: action,
                ContentEncoding: "utf8",
                ContentLength: data.body.length,
                ContentMime: "application/json",
            };
            const header = Buffer.from(JSON.stringify(data.header));
            data.fixedLength = Buffer.from(header).length;
            const fixedLength = Buffer.alloc(4);
            fixedLength.writeUInt32LE(data.fixedLength);
            socket.write(Buffer.concat([fixedLength, header, body]));
        };

        setTimeout(() => {
            if (serverHash === -1) {
                reply("timeout");
                socket.end();
                socket.destroy();
            }
        }, 5 * 60 * 1000);

        socket.on("close", () => {
            if (serverHash !== -1) {
                const { members } = this.accordServers[serverHash];
                const member: Member = members[memberHash];
                member.leave();
            }
            log(`连接断开! 目标主机: ${remoteAddress}:${remotePort}`);
        });

        socket.on("data", (data) => {
            log(`Server<<Client 目标主机: ${remoteAddress}:${remotePort}`);
            const buf = Buffer.concat([chunk, data]);
            let bytesRead = 0;
            let bytesToRead = 4;

            if (protocolData.fixedLength == null && buf.length - bytesRead >= bytesToRead) {
                protocolData.fixedLength = buf.readUInt32LE(0);
                bytesRead += bytesToRead;
            }

            if (protocolData.fixedLength > 0) {
                bytesToRead = protocolData.fixedLength;
            }

            if (protocolData.header == null && buf.length - bytesRead >= bytesToRead) {
                const header = JSON.parse(buf.toString("utf8", bytesRead, bytesRead + bytesToRead));
                protocolData.header = header;
                bytesRead += bytesToRead;
            }

            if (protocolData.header?.ContentLength) {
                bytesToRead = protocolData.header.ContentLength;
            }

            if (protocolData.body == null && buf.length - bytesRead >= bytesToRead) {
                protocolData.body = Buffer.from(buf.buffer, buf.byteOffset + bytesRead, bytesToRead);
                bytesRead += bytesToRead;
                consume(protocolData);
                protocolData = {};
            }
            chunk = Buffer.allocUnsafe(buf.length - bytesRead);
            buf.copy(chunk, 0, bytesRead);
        });

        socket.on("error", (err) => {
            log(`连接错误! 目标主机: ${remoteAddress}:${remotePort}`);
            log(`错误内容: ${err.message}`);
        });
    },
};
