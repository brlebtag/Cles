import TimeStep from './TimeStep.js';
import { CMD_REGISTER } from '../js/CommandTypes.js'

export default class Game {
    constructor(wss) {
        this.loop = new TimeStep();
        this.wss = wss;
        this.totalUsers = 0;
        this.users = {};
        this.namesToIds = {};
        this.netcode();
    }

    create() {
        this.preload();
        this.loop.start(this.update.bind(this));
    }

    preload() {

    }

    update(time, delta) {
        // console.log(time, delta);
    }

    destroy() {
        this.loop.stop();
    }

    netcode() {
        this.wss.on('connection', (ws) => {
            console.log('New connection!');

            ws.id = -1;

            ws.on('error', (err) => {
                if (ws.id !== -1) {
                    delete this.namesToIds[this.users[ws.id].name];
                    delete this.users[ws.id];
                }
                console.error(err);
            });

            ws.on('close', () => {
                if (ws.id !== -1) {
                    delete this.namesToIds[this.users[ws.id].name];
                    delete this.users[ws.id];
                }
            });
          
            ws.on('message', (data) => {
              if (data instanceof Buffer) {
                // binary frame
                switch(data.readUInt8(0)) {
                    case CMD_REGISTER:
                        this.registerUser(ws, data);
                        break;
                }
              } else {
                // text frame
                console.log(data);
              }
            });
          
            let buffer = new ArrayBuffer(2);
            let view = new DataView(buffer);
            view.setUint8(0, 2);
            view.setUint8(1, 3);
            ws.send(buffer);
        });
    }

    registerUser(ws, data) {
        let total = data.readUInt32BE(1);
        let name = '';
        for(let i = 0; i < total; i++) {
            name += String.fromCharCode(data.readInt8(5 + i));
        }

        let id = -1;
        if (!(name in this.namesToIds))
        {
            this.namesToIds[name] = ++this.totalUsers;
            this.users[this.totalUsers] = {id: this.totalUsers, name: name};
        }
        id = this.namesToIds[name];
        ws.id = id;
        let buffer = Buffer.alloc(8);
        buffer.writeInt8(CMD_REGISTER, 0);
        buffer.writeInt8(1, 1);
        buffer.writeUInt32BE(id, 2);
        console.log('User registered:', name);
    }
}