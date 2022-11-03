import { ServerController } from "./controller.js";

import { readFile, readdir } from "fs/promises";
import path from "path";
import http from "node:http";
import type * as Accord from "./server.js";
import { GlobalConfig, ServerHost } from "./type.js";

const loadServersConfig = async (): Promise<Accord.BaseInfo[]> => {
    const ServersConfigPath = path.resolve("data", "servers");

    let result = Promise.resolve();
    const baseInfo: any[] | PromiseLike<any[]> = [];
    const directories = await readdir(ServersConfigPath, { withFileTypes: true });
    for (let directory of directories) {
        if (directory.isDirectory())
            result = result
                .then(() => {
                    const data = readFile(path.resolve(ServersConfigPath, directory.name, "base.json"));
                    return data;
                })
                .then((data) => {
                    baseInfo.push(JSON.parse(data.toString("utf-8")));
                    return;
                });
    }

    return result.then(() => baseInfo);
};

const startServerService = (serverOptions: Accord.BaseInfo[], host: ServerHost) => {
    const ServiceServer = http.createServer((req, res) => {
        //JSON.stringify(serverOptions)
        const url = new URL(req.url, `http://${req.headers.host}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        switch (url.pathname) {
            case "/":
                res.end(JSON.stringify(serverOptions));
                break;
            case "/hash":
                res.end(JSON.stringify(ServerController.getMemberHash()));
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

    const servers = await loadServersConfig();

    ServerController.init(config.AccordServer);
    for (let option of servers) {
        ServerController.startServer(option);
    }

    startServerService(servers, config.HttpServer);
}

main();
