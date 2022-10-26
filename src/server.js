import { log } from "node:console";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";

export class AccordServer {
    name = "";
    actualName = "";
    icon = "";
    /** @type {import("type").AccordServerInfo.Msg[]} */
    msgs = [];
    /** @type {import("type").AccordServerInfo.MembersMap} */
    members = {};
    memberCount = 0;
    socketMap = new Map();

    async loadUsers() {
        const fp = path.resolve(
            "data",
            "servers",
            this.actualName,
            "users.json"
        );
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

    /**
     * @param {import("type").AccordServerInfo.BaseInfo} serverOption
     */
    constructor(serverOption) {
        this.name = serverOption.showName;
        this.actualName = serverOption.actualName;
    }
}

export class Member {
    hash = "";
    name = "";
    /** @type {null | BinaryData} */
    avatar = null;
    /** @type {null | net.Socket} */
    socket = null;
    online = false;

    /**
     * @param {import("type").AccordServerInfo.MemberData} data
     */
    constructor(data) {
        const { name, avatar } = data;
        [this.name, this.avatar] = [name, avatar];
    }

    /**
     * @param {AccordServer} server
     */
    join(server) {
        let hash = crypto.randomBytes(4).toString("hex");
        while (Object.hasOwn(server.members, hash)) {
            hash = crypto.randomBytes(4).toString("hex");
        }
        this.hash = hash;
        server.members[hash] = this;
        server.memberCount++;
    }

    /**
     * @param {AccordServer} server
     */
    exit(server) {
        this.socket.end();
        delete server.members[this.hash];
        server.memberCount--;
    }

    /**
     * @param {net.Socket} socket
     */
    enter(socket) {
        this.socket = socket;
        this.online = true;
    }

    leave() {
        this.online = false;
        this.socket.end();
    }
}

export const ServerController = {
    /** @type {import("type").ServerHost} */
    host: null,
    /** @type {net.Server} */
    server: null,
    /** @type {{[hash:number]: AccordServer}} */
    accordServers: {},

    /**
     * @param {import("type").ServerHost} host
     */
    init(host) {
        this.host = host;
        this.server = net.createServer(this._handleConnection);
        this.server.listen(this.host.port, this.host.host, () => {});
    },

    /**
     * @param {import("type").AccordServerInfo.BaseInfo} option
     */
    start(option) {
        if (this.host != null) {
            this.accordServers[option.hash] = new AccordServer(option);
            const { showName: name } = option;
            log(`服务器: '${name}' 启动`);
            return true;
        } else {
            return false;
        }
    },

    _handleConnection(/** @type {net.Socket} */ socket) {
        const { remotePort, remoteAddress } = socket;
        let serverHash = -1;
        log(`新的连接! 目标主机: ${remoteAddress}:${remotePort}`);

        setTimeout(() => {
            if (serverHash === -1) {
                socket.write(
                    JSON.stringify({
                        action: "close",
                        msg: "进入服务器失败",
                    })
                );
                socket.end();
            }
        }, 3000);

        socket.on("close", () => {
            const { socketMap } = this.accordServers[serverHash];
            /** @type {Member} */
            const member = socketMap.get(socket);
            socketMap.delete(socket);
            member.leave();
            log(`连接断开! 目标主机: ${remoteAddress}:${remotePort}`);
        });

        socket.on("data", (data) => {
            log(`Server<<Client 目标主机: ${remoteAddress}:${remotePort}`);

            /** @type {import("type").AccordServerInfo.ConnectionData} */
            const connectData = JSON.parse(data.toString("utf8"));
            log(`Server<<Client 消息内容: ${JSON.stringify(connectData)}`);
            if (connectData.action) {
                let member = null;
                let memberHash = null;
                let currentServer = null;
                switch (connectData.action) {
                    case "join":
                        const { name, hash } =
                            /** @type {import("type").AccordServerInfo.ConnectionDataJoin} */ connectData.data;
                        serverHash = hash;
                        member = new Member({
                            name,
                            avatar: null,
                            hash: serverHash,
                        });
                        currentServer = this.accordServers[serverHash];
                        member.join(currentServer);
                        socket.write(
                            JSON.stringify({
                                action: "accept",
                                msg: `欢迎加入${currentServer.name}, ${name}`,
                                data: member.hash,
                            })
                        );
                        break;
                    case "enter":
                        /** @type {import("type").AccordServerInfo.ConnectionDataEnter} */
                        [memberHash, serverHash] = connectData.data;
                        currentServer = this.accordServers[serverHash];
                        member = currentServer.members[memberHash];
                        member.enter(socket);
                        currentServer.socketMap.set(socket, member);
                        socket.write(
                            JSON.stringify({
                                action: "accept",
                                msg: `欢迎`,
                            })
                        );
                        break;
                    case "accept":
                        break;
                    default:
                        break;
                }
            }
        });

        socket.on("error", (err) => {
            log(`连接错误! 目标主机: ${remoteAddress}:${remotePort}`);
            log(`错误内容: ${err.message}`);
        });
    },
};
