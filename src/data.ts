import { AccordServer } from "./type.js";

export class AccordData {
    fixedLength: number = 0;
    header?: AccordServer.DataHeader;
    body?: Buffer;

    ready = false;
    chunk: Buffer;

    constructor(chunk?: Buffer) {
        this.chunk = chunk ?? Buffer.alloc(0);
    }

    prase(data: Buffer) {
        const buf = Buffer.concat([this.chunk, data]);
        let bytesRead = 0;
        let bytesToRead = 4;

        if (this.fixedLength === 0 && buf.length - bytesRead >= bytesToRead) {
            this.fixedLength = buf.readUInt32LE(0);
            bytesRead += bytesToRead;
        }

        if (this.fixedLength > 0) {
            bytesToRead = this.fixedLength;
        }

        if (this.header == null && buf.length - bytesRead >= bytesToRead) {
            const header = JSON.parse(buf.toString("utf8", bytesRead, bytesRead + bytesToRead));
            this.header = header;
            bytesRead += bytesToRead;
        }

        if (this.header?.ContentLength) {
            bytesToRead = this.header.ContentLength;
        }

        if (this.body == null && buf.length - bytesRead >= bytesToRead) {
            this.body = Buffer.from(buf.buffer, buf.byteOffset + bytesRead, bytesToRead);
            bytesRead += bytesToRead;
            this.ready = true;
        }
        this.chunk = Buffer.allocUnsafe(buf.length - bytesRead);
        buf.copy(this.chunk, 0, bytesRead);
    }

    serialize() {
        const body = Buffer.from(this.body);
        const header = Buffer.from(JSON.stringify(this.header));
        this.fixedLength = Buffer.from(header).length;
        const fixedLength = Buffer.alloc(4);
        fixedLength.writeUInt32LE(this.fixedLength);
        return Buffer.concat([fixedLength, header, body]);
    }

    clear() {
        this.fixedLength = 0;
        this.header = null;
        this.body = null;
        this.ready = false;
    }
}
