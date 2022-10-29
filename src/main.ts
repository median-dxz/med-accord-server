import { ServerController } from "./server.js";

import { readFile, readdir } from "fs/promises";
import path from "path";
import http from "http";
import { AccordServer, GlobalConfig, ServerHost } from "./type.js";

const initAccordServers = async (): Promise<AccordServer.BaseInfo[]> => {
    const ServersConfigPath = path.resolve("data", "servers");

    let result = Promise.resolve();
    const baseInfo: any[] | PromiseLike<any[]> = [];
    const directories = await readdir(ServersConfigPath);
    for (let directory of directories) {
        result = result
            .then(() => {
                const data = readFile(
                    path.resolve(ServersConfigPath, directory, "base.json")
                );
                return data;
            })
            .then((data) => {
                baseInfo.push(JSON.parse(data.toString("utf-8")));
                return;
            });
    }

    return result.then(() => baseInfo);
};

const initServerListService = (
    serverOptions: AccordServer.BaseInfo[],
    host: ServerHost
) => {
    const listServer = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(serverOptions));
    });

    listServer.listen(host.port, host.hostname);
};

async function main() {
    const config: GlobalConfig = JSON.parse(
        (await readFile("./global.config.json")).toString()
    );

    const servers = await initAccordServers();

    initServerListService(servers, config.HttpServer);
    ServerController.init(config.AccordServer);

    for (let option of servers) {
        ServerController.start(option);
    }
}

main();
