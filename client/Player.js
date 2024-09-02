import { Body } from "../js/Physics";
import { MaxSpeed } from "../js/Configuration.js";

export default class Player extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.body = new Body(scene, this);
        this.lastKnownPosition = new Phaser.Math.Vector2(0, 0);
        this.id = -1;
        this.isReconciliated = true;
        this.tempVet = new Phaser.Math.Vector2(0, 0);
    }

    update(delta) {
        const { body, tempVet, isReconciliated } = this;
        const { left, right, down, up } = this.scene.inputs;

        tempVet.set(
            (left ? -1 : 0) + (right ? 1 : 0),
            (up ? -1 : 0) + (down ? 1 : 0)
        );

        if (isReconciliated) {
            tempVet.setLength(MaxSpeed);
            body.setVelocity(tempVet.x, tempVet.y);
            body.update(delta);
        }
    }
}