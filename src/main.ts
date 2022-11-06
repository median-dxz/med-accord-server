import { ServerController } from "./controller.js";

import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import path from "path";
import http from "node:http";
import type * as Accord from "./server.js";
import { GlobalConfig, ServerHost } from "./type.js";

const ServersConfigPath = path.resolve("data", "servers");
let servers: Accord.BaseInfo[];

const loadServersConfig = async (): Promise<void> => {
    servers = [];
    let result = Promise.resolve();

    const directories = await readdir(ServersConfigPath, { withFileTypes: true });
    for (let directory of directories) {
        if (directory.isDirectory())
            result = result
                .then(() => {
                    const data = readFile(path.resolve(ServersConfigPath, directory.name, "base.json"));
                    return data;
                })
                .then((data) => {
                    servers.push(JSON.parse(data.toString("utf-8")));
                    return;
                });
    }

    return result;
};

const startServerService = (host: ServerHost) => {
    const ServiceServer = http.createServer((req, res) => {
        //JSON.stringify(servers)
        const url = new URL(req.url, `http://${req.headers.host}`);
        res.writeHead(200, { "Content-Type": "application/json" });

        const chunk: Array<Buffer> = [];
        req.on("data", (data) => {
            chunk.push(data);
        });

        switch (url.pathname) {
            case "/":
                res.end(JSON.stringify(servers));
                break;
            case "/hash":
                res.end(JSON.stringify(ServerController.getMemberHash()));
                break;
            case "/create":
                if (req.method == "POST") {
                    req.on("end", async () => {
                        const parcel = Buffer.concat(chunk).toString("utf8");
                        const data: Partial<Accord.BaseInfo> = JSON.parse(parcel);
                        const result = {
                            msg: "",
                            status: 1,
                        };
                        const end = () => res.end(JSON.stringify(result));

                        if (data.displayName && data.actualName && data.icon != null) {
                            const { actualName } = data;
                            const directories = await readdir(ServersConfigPath, { withFileTypes: true });

                            if (directories.some((v) => v.isDirectory() && v.name == actualName)) {
                                result.msg = "该服务器名已被注册!";
                                end();
                                return;
                            }

                            const serverPath = path.resolve(ServersConfigPath, actualName, "base.json");
                            mkdir(path.resolve(serverPath, "../"))
                                .then(() => {
                                    data.hash = (servers.length + 1).toString();
                                    servers.push(data as Accord.BaseInfo);
                                    ServerController.startServer(servers.at(-1));
                                    writeFile(serverPath, JSON.stringify(data));
                                })
                                .then(() => {
                                    result.msg = "成功";
                                    result.status = 0;
                                    end();
                                })
                                .catch((reason) => {
                                    result.msg = String(reason);
                                    end();
                                });
                        } else {
                            result.msg = "空参数";
                            end();
                        }
                    });
                }
                break;
            default:
                res.end();
                break;
        }
    });

    ServiceServer.listen(host.port, host.hostname);
};

async function main() {
    const config: GlobalConfig = JSON.parse((await readFile("./global.config.json")).toString());

    ServerController.init(config.AccordServer);

    await loadServersConfig();

    for (let option of servers) {
        ServerController.startServer(option);
    }

    startServerService(config.HttpServer);
}

main();
