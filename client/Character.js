import { Body } from "../js/Physics";

export default class Character extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene.add.existing(this);
        this.body = new Body(this);
        this.color = 0xFFFFFF;
        this.name = '';
        this.nameTag = null;
        this.createNameTag();
        this.nameTag.setVisible(false);
        this.type = -1;
    }

    setName(name) {
        this.name = name;
        this.nameTag.setText(name);
        this.nameTag.setVisible(true);
    }

    createNameTag() {
        this.nameTag = this.scene.add.text(
            this.x,
            this.y,
            this.name,
            {
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: `18px`,
                color: '#000000',
                align: 'center',
            }
        );
    }

    updateNameTag() {
        const nameTag = this.nameTag;
        Phaser.Display.Align.In.Center(nameTag, this);
        nameTag.setY(this.y - this.height);
    }

    deactive() {
        this.nameTag.destroy(true);
        this.destroy(true);
    }

    getFace(vet) {
        const x = vet.x;
        const y = vet.y;

        if (x > 0 && y > 0) {
            return 'down';
        }

        if (x > 0 && y < 0) {
            return 'up';
        }

        if (x < 0 && y < 0) {
            return 'up';
        }

        if (x < 0 && y > 0) {
            return 'down';
        }

        if (x > 0) return 'right';
        if (x < 0) return 'left';
        if (y > 0) return 'down';
        if (y < 0) return 'up';
    }
}