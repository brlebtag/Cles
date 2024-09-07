import { Body } from "../js/Physics";
import { MaxSpeed } from "../js/Configuration.js";
import { MAX_BUFFER_SIZE } from '../js/CommandTypes.js';
import CircularArray from "../js/CircularArray.js";
import Sprite from "../js/Sprite.js";

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene.add.existing(this);
        this.body = new Body(this);
        this.lastKnownPosition = new Phaser.Math.Vector2(0, 0);
        this.lastProcessedFrame = this.id = -1;
        this.isReconciliated = true;
        this.temp = new Phaser.Math.Vector2(0, 0);
        this.commands = new CircularArray(MAX_BUFFER_SIZE);
        this.virtualSprite = new Sprite(scene, x, y, this.width, this.height);
        this.virtualBody = new Body(this.virtualSprite);
    }

    update(time, delta, serverTime, avgLag) {
        const { body, virtualBody, virtualSprite, temp, isReconciliated } = this;
        const { left, right, down, up } = this.scene.inputs;

        temp.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        temp.setLength(MaxSpeed);

        // Testar colisão...
        if (isReconciliated) {
            body.velocity.set(temp.x, temp.y);
            body.update(time, delta);
        } else {
            virtualBody.velocity.set(temp.x, temp.y);
            virtualBody.update(time, delta);

            temp.copy(virtualBody.position);
            temp.subtract(body.position);
            const length = temp.length();
            const maxDistance = MaxSpeed * delta; // duas vezes a distancia de uma passagem

            if (length < maxDistance) {
                this.x = virtualSprite.x;
                this.y = virtualSprite.y;
                body.position.copy(virtualBody.position);
                body.prevPosition.copy(virtualBody.prevPosition);
                // virtualBody.reset();
                this.isReconciliated = true;
            } else {
                // const lag = 1000 / (avgLag === 0 ? 100 /* tempo minimo para corrigir desvio*/ : avgLag);
                // temp.setLength(length / lag); // velocidade é baseado no lag!
                temp.setLength(MaxSpeed);
                // coloca uma velocidade para ele alcançar até o próximo pacote chegar (lag)
                body.velocity.set(temp.x, temp.y);
                body.update(time, delta);
            }
        }
    }

    reconciliate(x, y, time) {
        const temp = this.temp;
        const virtualSprite = this.virtualSprite;
        const virtualBody = this.virtualBody;
        const commands = this.commands;
        this.isReconciliated = false;

        virtualSprite.copy(this);
        virtualBody.position.set(x - virtualSprite.displayOriginX, y - virtualSprite.displayOriginY);
        virtualBody.prevPosition.copy(virtualBody.position);
        const length = commands.length;

        for (let i = 0; i > length; i++) {
            const cmd = commands.at(i);
            // se usar aceleração/força, deve ser recalculado aqui!
            temp.set(
                (cmd.left ? -1 : 0) + (cmd.right ? 1 : 0),
                (cmd.up ? -1 : 0) + (cmd.down ? 1 : 0)
            );
            temp.setLength(MaxSpeed);
            virtualBody.velocity.set(temp.x, temp.y);
            // Colisão deve ser testado aqui!
            virtualBody.update(time, cmd.delta);
        }
    }
}