import { Buffer } from "node:buffer";
import { log } from "node:console";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import * as protocol from "./data.js";
import crypto from "node:crypto";
import { AccordServer } from "./server.js";
import type * as Accord from "./server.js";
import { AccordAction, MemberHash, ServerHash, ServerHost } from "./type.js";
import { Member } from "./member.js";

interface ServerController {
    host: ServerHost;
    mainServer: net.Server;
    servers: Map<ServerHash, AccordServer>;
    members: Map<MemberHash, Member>;
    init(host: ServerHost): void;
    startServer(option: Accord.BaseInfo): void;
    _handleConnection(socket: net.Socket): void;
    loadUsers(): Promise<void>;
    getMemberHash(): { hash: MemberHash };
}

export const ServerController: ServerController = {
    host: null,
    mainServer: null,
    servers: new Map(),
    members: new Map(),

    init(host: ServerHost) {
        this.host = host;
        this.mainServer = net.createServer({ keepAlive: true, keepAliveInitialDelay: 3000 }, (socket: net.Socket) => {
            this._handleConnection(socket);
        });
        this.mainServer.listen(host.port, host.hostname, () => {
            log(`主服务启动`);
        });
    },

    async loadUsers(): Promise<void> {
        const fp = path.resolve("data", "users.json");
        const data = await fs
            .readFile(fp)
            .then((data) => data.toString())
            .then((data) => JSON.parse(data));
        Object.keys(data).forEach((key) => {
            data[key] = new Member(data[key].name, data[key].avatar, data[key].hash);
        });
        this.members = data;
    },

    getMemberHash(): { hash: MemberHash } {
        let hash = crypto.randomBytes(4).toString("hex");
        while (Object.hasOwn(this.members, hash)) {
            hash = crypto.randomBytes(4).toString("hex");
        }
        return { hash: hash };
    },

    startServer(option: Accord.BaseInfo) {
        if (this.host != null) {
            this.servers.set(option.hash, new AccordServer(option));
            const { showName: name } = option;
            log(`服务器: '${name}' 启动`);
            return true;
        } else {
            return false;
        }
    },

    _handleConnection(socket: net.Socket) {
        const { remotePort, remoteAddress } = socket;
        let serverHash = "";
        let memberHash = "";

        let protocolData = new protocol.AccordData();
        log(`新的连接! 目标主机: ${remoteAddress}:${remotePort}`);

        setTimeout(() => {
            if (!serverHash) {
                reply("timeout", "连接服务器超时");
                socket.end();
                socket.destroy();
            }
        }, 1000);

        const enter = (data: AccordAction.IEnter & object) => {
            if (!data.memberHash || !data.serverHash || !data.name) {
                reply("refuse", "空的json字段");
                return;
            }
            if (!this.servers.has(data.serverHash)) {
                reply("refuse", "无效服务器hash");
                return;
            }
            serverHash = data.serverHash;
            memberHash = data.memberHash;
            const acceptData: AccordAction.IAccept = { msg: "成功加入服务器", action: "enter" };
            reply("accept", JSON.stringify(acceptData));
            let member;
            if (!this.members.has(data.memberHash)) {
                member = new Member(data.name, data.avatar, data.memberHash);
                this.members.set(memberHash, member);
            } else {
                member = this.members.get(memberHash);
                member.avatar = data.avatar;
                member.name = data.name;
            }
            member.enter(this.servers.get(serverHash), socket);
        };

        const receiveMessage = (message: Accord.Message & object) => {
            const server = this.servers.get(serverHash);
            server.messageReceive(message);
        };

        const consume = async (header: Accord.DataHeader, body: Buffer) => {
            return new Promise<void>((resolve, reject) => {
                log(body.toString("utf8"));
                if (header.Action !== "enter" && !serverHash) {
                    resolve();
                    return;
                }
                const data = body.toString("utf8");
                switch (header.Action) {
                    case "enter":
                        enter(JSON.parse(data));
                        break;
                    case "leave":
                        break;
                    case "sendMessage":
                        receiveMessage(JSON.parse(data));
                        break;
                    case "updateMemberList":
                        this.servers.get(serverHash).updateMembers();
                        break;
                    case "historyMessages":
                        this.members.get(memberHash).getHistoryMessages(JSON.parse(data));
                        break;
                    case "setMemberInfo":
                        this.members.get(memberHash).update(JSON.parse(data));
                        break;
                    default:
                        reply("refuse", "未知动作");
                        log(`[${memberHash} in ${serverHash}]: Unknown Action: ${header.Action}`);
                        break;
                }
                resolve();
                return;
            });
        };

        const reply = async (action: AccordAction.ActionType, body: string) => {
            log(`Server>>Client ${memberHash}: ${body}`);
            const data = new protocol.AccordData();
            switch (action) {
                case "accept":
                case "refuse":
                case "updateMemberList":
                case "receiveMessage":
                    data.body = Buffer.from(body);
                    break;
                default:
                    data.body = Buffer.from("未知动作");
                    break;
            }
            data.header = {
                Action: action,
                ContentEncoding: "utf8",
                ContentLength: data.body.length,
                ContentMime: "application/json",
            };
            socket.write(data.serialize());
        };

        socket.addListener("update", (action: AccordAction.ActionType, data: any) => {
            switch (action) {
                case "updateMemberList":
                    reply(action, JSON.stringify(data as AccordAction.UpdateMemberList));
                    break;
                case "receiveMessage":
                    reply(action, JSON.stringify(data as Accord.Message));
                    break;
                default:
                    break;
            }
        });

        socket.on("close", () => {
            if (serverHash && memberHash) {
                const server = this.servers.get(serverHash);
                server.memberLeave(memberHash);
                this.members.get(memberHash).socket = null;
            }
            protocolData.clear();
            log(`连接断开! 目标主机: ${remoteAddress}:${remotePort}`);
        });

        socket.on("data", (data) => {
            log(`Server<<Client 目标主机: ${remoteAddress}:${remotePort}`);
            protocolData.prase(data);
            while (protocolData.ready) {
                consume(protocolData.header, protocolData.body);
                protocolData.clear();
                protocolData.prase(Buffer.alloc(0));
            }
        });

        socket.on("error", (err) => {
            log(`连接错误! 目标主机: ${remoteAddress}:${remotePort}`);
            log(`错误内容: ${err.stack}`);
        });
    },
};
