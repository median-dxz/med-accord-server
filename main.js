import { ServerController } from "./src/server.js";

import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { stdin, stdout } from "process";
import http from "http";

/**
 * @return {Promise<import("type.js").AccordServerInfo.BaseInfo[]>}
 */
const initAccordServers = async () => {
    const ServersConfigPath = path.resolve("data", "servers");

    let result = Promise.resolve();
    const baseInfo = [];
    const directories = await fs.readdir(ServersConfigPath);
    for (let directory of directories) {
        result = result
            .then(() => {
                const data = fs.readFile(
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

/**
 * @param {import("type.js").AccordServerInfo.BaseInfo[]} serverOptions
 * @param {import("type.js").ServerHost} host
 */
const initServerListService = (serverOptions, host) => {
    const listServer = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(serverOptions));
    });

    listServer.listen(host.port, host.host);
};

async function main() {
    /** @type {import("type.js").GlobalConfig} */
    const config = JSON.parse(
        (await fs.readFile("./global.config.json")).toString()
    );

    const servers = await initAccordServers();

    initServerListService(servers, config.HttpServer);

    for (let option of servers) {
        ServerController.init(config.AccordServer);
        ServerController.start(option);
    }
}

main();
