import TimeStep from './TimeStep.js';
import { CMD_CLIENT_UPDATE, SUCCESS, CMD_REGISTER, CMD_END_OF_BUFFER, CMD_TICK, CMD_FULL_SERVER_UPDATE, CMD_SERVER_UPDATE } from '../js/CommandTypes.js';
import { nextInteger } from '../js/Random.js';
import { BufferSerializer, CommandSerializer } from '../js/Serializer.js';
import CommandInputs from '../js/CommandInputs.js';
import Player from './Player.js';
import { MaxPacketSize } from "../js/Configuration.js";
import { lag, timeOffset } from "../js/Lag.js";

const UpdateRate = 20;
const StatePacketSize = 12; // id(4) + x(4) + y(4) = 12

export default class Game {
    constructor(wss) {
        this.loop = new TimeStep();
        this.wss = wss;
        this.totalPlayers = 0;
        this.players = new Map();
        this.namesToIds = new Map();
        this._inputs = new CommandInputs();
        this.updateTimer = setInterval(this.sendClientUpdates.bind(this), UpdateRate);
        this.lastFrame = -1;
    }

    create() {
        this.preload();
        this.netcode();
        this.loop.start(this.update.bind(this));
    }

    get inputs() {
        return this._inputs;
    }

    preload() {

    }

    update(time, delta) {
        delta = delta / 1000; // adjust to seconds

        // console.log(time, delta);
        for (const [id, player] of this.players) {
            if (player.buffer.empty()) return;
            const cmd = player.buffer.pop();
            this._inputs.consume(cmd);
            player.update(delta);
            player.lastProcessedFrame = cmd.frame;
        }
    }

    destroy() {
        this.loop.stop();
    }

    removePlayer(ws) {
        if (ws.player) {
            delete this.namesToIds[ws.player.name];
            this.players.delete(ws.player.id);
        }
    }

    netcode() {
        this.wss.on('connection', (ws) => {
            console.log('New connection!');
            ws.player = null;

            ws.on('error', (err) => {
                this.removePlayer(ws);
                console.error(err);
            });

            ws.on('close', () => {
                this.removePlayer(ws);
            });
          
            ws.on('message', (data) => {
                let t = performance.now(); // t2
                if (data instanceof Buffer) {
                    // binary frame
                    let serializer = new BufferSerializer(data);
                    const length = serializer.length;
                    while (serializer.bytes > length) {
                        switch (serializer.readUInt8()) {
                            case CMD_REGISTER:
                                this.registerUser(ws, serializer, t);
                                break;
                            case CMD_CLIENT_UPDATE:
                                this.clientUpdate(ws, serializer, t);
                                break;
                            case CMD_TICK:
                                this.clientTick(ws, serializer, t);
                                break;
                            case CMD_SERVER_UPDATE:
                                    this.confirmServerUpdate(ws, serializer, t);
                                    break;
                            case CMD_END_OF_BUFFER: return;
                        }
                    }
                } else {
                    return;
                    // text frame
                    // console.log(data);
                }
            });
        });
    }

    registerUser(ws, serializer, t) {
        const screenWidth = serializer.readUInt32();
        const screenHeight = serializer.readUInt32();
        const width = serializer.readUInt32();
        const height = serializer.readUInt32();
        const name = serializer.readString();
        let player;

        if (!(name in this.namesToIds)) {
            player = new Player(
                this,
                nextInteger(0, screenWidth),
                nextInteger(0, screenHeight),
                width,
                height
            );
            player.name = name;
            player.id = ++this.totalPlayers;
            player.socket = ws;
            player.skipClientUpdate = false;
            ws.player = player;
            this.namesToIds[name] = player.id;
            this.players.set(player.id, player);
        } else {
            player = this.players.get(this.namesToIds[name]);
        }
        ws.id = player.id;
        // CMD_REGISTER (1) + SUCCESS(1) + id(4) + x(4) + y(4) + capacity(4) + t(8) + CMD_FULL_SERVER_UPDATE(1) + CMD_END_OF_BUFFER(1) = 28
        let reply = new BufferSerializer(Buffer.alloc(28 + this.getFullStateBufferSize()));
        reply.writeUInt8(CMD_REGISTER);
        reply.writeUInt8(SUCCESS);
        reply.writeUInt32(player.id);
        reply.writeInt32(player.x);
        reply.writeInt32(player.y);
        reply.writeUInt32(player.buffer.capacity);
        reply.writeFloat64(t);
        player.t1 = performance.now(); // t3
        reply.writeFloat64(player.t1);
        reply.writeUInt8(CMD_FULL_SERVER_UPDATE);
        this.fullServerUpdate(player, reply);
        reply.writeUInt8(CMD_END_OF_BUFFER);
        // envia width, height do player e tamanho do buffer livre
        ws.send(reply.buffer);
        console.log('User registered:', name);
    }


    clientTick(ws, serializer, t) {
        if (!ws.player) return;
        const player = ws.player;
        player.t4 = t;
        let t2 = serializer.readFloat64();
        let t3 = serializer.readFloat64();
        let delta_1_4 = player.t4 - player.t1;
        let delta_2_3 = t3 - t2;

        // Sanatizar os dados!
        if (delta_2_3 <= (delta_1_4 * 0.5)) {
            player.t2 = t2;
            player.t3 = t3;
        } else {
            // O dado veio invenenado!
            // Ignora o tempo do usuário e considera apenas o meu!
            player.t2 = 0; 
            player.t3 = 0;
        }

        player.addNewLag(lag(player.t1, player.t2, player.t3, player.t4));
        player.addNewOffset(timeOffset(player.t1, player.t2, player.t3, player.t4));
    }

    getStateBufferSize() {
        return (this.players.size * StatePacketSize) + 12 /* lastTime (8) + lastProcessedFrame (4) */;
    }

    getFullStateBufferSize(curPlayer) {
        let size = (this.players.size - 1) * StatePacketSize;
        for (const [id, player] of this.players) {
            if (player === curPlayer) continue; // skip me!
            size += 4 /*total characters*/ + player.length; // ajustar para utf-8!
        }

        return size;
    }

    sendClientUpdates() {
        for (const ws of wss.clients) {
            if (ws.player.skipClientUpdate) {
                ws.player.skipClientUpdate = false;
                continue;
            }
            // enviar id, x, y, direcao face
            this.sendServerUpdate(ws);
        }
    }

    clientUpdate(ws, serializer, t) {
        if (!ws.player) return;
        
        const player = ws.player;
        const commandSerializer = new CommandSerializer(serializer);
        const commands = commandSerializer.deserialize();
        const len = commands.length;
        player.t1 = t;
        player.t4 = player.t3 = player.t2 = 0;
        
        if (len <= 0) return;
        
        const buffer = player.buffer;
        let remaining = buffer.capacity - buffer.length;
        let lastFrame = player.lastFrame;

        for (let i = 0; i < len && remaining > 0; i++) {
            const cmd = commands[i];
            if (cmd.frame > lastFrame) {
                buffer.push(cmd);
                lastFrame = cmd.frame;
                remaining--;
            }
        }

        player.lastFrame = lastFrame;
        player.skipClientUpdate = true;
        this.generateClientUpdate();
    }

    sendServerUpdate(ws) {
        // CMD_SERVER_UPDATE(1) + capacity(4) + CMD_END_OF_BUFFER(1) = 6
        const serializer = new BufferSerializer(Buffer.alloc(this.getStateBufferSize() + 6));
        serializer.writeUInt8(CMD_SERVER_UPDATE);
        const buffer = ws.player.buffer;
        serializer.writeUInt32(buffer.capacity - buffer.length);
        this.generateClientUpdate(ws.player, serializer);
        serializer.writeUInt8(CMD_END_OF_BUFFER);
        ws.send(serializer.buffer);
    }

    generateClientUpdate(curPlayer, serializer) {
        const len = serializer.length;
        const curId = curPlayer.id;

        if ((serializer.bytes + StatePacketSize + 8) > len) return;

        serializer.writeUInt32(curId);
        serializer.writeUInt32(curPlayer.lastProcessedFrame);
        serializer.writeInt32(curPlayer.x);
        serializer.writeInt32(curPlayer.y);
        serializer.writeFloat64(this.loop.lastTime); // + 8

        for (const [id, player] of this.players) {
            if (id === curId) continue;
            if ((serializer.bytes + StatePacketSize) > len) return;

            serializer.writeUInt32(id);
            serializer.writeInt32(player.x);
            serializer.writeInt32(player.y);
        }
    }

    fullServerUpdate(curPlayer, serializer) {
        for (const [id, player] of this.players) {
            if (player === curPlayer) continue;

            serializer.writeUInt32(player.id);
            serializer.writeInt32(player.x);
            serializer.writeInt32(player.y);
            serializer.writeString(player.name);
        }
    }

    confirmServerUpdate(ws, serializer, t) {
        this.clientTick(ws, serializer, t);
    }
}