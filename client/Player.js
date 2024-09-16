import Character from "./Character.js";
import { MaxSpeed, MaxCommandsSize, PlayerType } from "../js/Configuration.js";
import CircularArray from "../js/CircularArray.js";
import { Body } from "../js/Physics.js";
import Sprite from '../js/Sprite.js';

export default class Player extends Character {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.lastProcessedFrame = this.lastReceivedFrame = this.id = -1;
        this.temp = new Phaser.Math.Vector2(0, 0);
        this.commands = new CircularArray(MaxCommandsSize);
        this.virtualSprite = new Sprite(scene, x, y, this.width, this.height);
        this.virtualBody = new Body(this.virtualSprite);
        this.isReconciliated = true;
        this.type = PlayerType
    }

    update(time, delta, serverTime, avgLag) {
        const { body, virtualBody: vBody, virtualSprite: vSprite, temp, isReconciliated } = this;
        if (!this.scene) return;
        const { left, right, down, up } = this.scene.inputs;

        avgLag++;

        temp.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        temp.setLength(MaxSpeed);

        body.velocity.set(temp.x, temp.y);
        body.update(time, delta);
        /*
        // Testar colisão...
        if (isReconciliated) {
            body.velocity.set(temp.x, temp.y);
            body.update(time, delta);
        } else {
            vBody.velocity.set(temp.x, temp.y);
            vBody.update(time, delta);

            temp.copy(vBody.position);
            temp.subtract(body.position);
            const length = temp.length();
            const maxDistance = MaxSpeed * delta; // duas vezes a distancia de uma passagem

            if (length < maxDistance) {
                this.x = vSprite.x;
                this.y = vSprite.y;
                body.position.copy(vBody.position);
                body.prevPosition.copy(vBody.prevPosition);
                this.isReconciliated = true;
            } else {
                const speed = length / ((avgLag / 1000) / delta);
                temp.setLength(speed > MaxSpeed ? speed : MaxSpeed);
                // coloca uma velocidade para ele alcançar até o próximo pacote chegar (lag)
                body.velocity.set(temp.x, temp.y);
                body.update(time, delta);
            }
        }*/

        const velocity = body.velocity.length();
        if (velocity > 0) {
            this.anims.play(`walking-${this.getFace(body.velocity)}`, true);
        } else {
            this.anims.play('stop');
        }
        this.updateNameTag();
        // speed = length / (lag / delta)
    }

    reconciliate(x, y, time) {
        // console.log(`Reconciliate!`);
        const temp = this.temp;
        const commands = this.commands;
        const vSprite = this;
        const vBody = this.body;
        
        if (!vBody) return;

        // this.isReconciliated = false;

        vSprite.x = x;
        vSprite.y = y;

        const length = commands.length;

        // console.log(`Reconciliating at (${this.x}, ${this.y}). ${length} commands to reconciliate!`);

        for (let i = 0; i < length; i++) {
            const cmd = commands.at(i);

            // se usar aceleração/força, deve ser recalculado aqui!
            temp.set(
                (cmd.left ? -1 : 0) + (cmd.right ? 1 : 0),
                (cmd.up ? -1 : 0) + (cmd.down ? 1 : 0)
            );

            temp.setLength(MaxSpeed);

            vBody.velocity.set(temp.x, temp.y);

            // Colisão deve ser testado aqui!
            vBody.update(time, cmd.delta);

            // console.log(`-> (${this.x}, ${this.y})`);
        }
    }
}