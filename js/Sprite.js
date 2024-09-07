// https://github.com/phaserjs/phaser/blob/master/plugins/impact/Body.js#L40
// https://github.com/phaserjs/phaser/blob/v3.85.0/src/gameobjects/components/Transform.js#L278
// https://github.com/phaserjs/phaser/blob/v3.85.0/src/gameobjects/components/Origin.js#L186
// https://github.com/phaserjs/phaser/blob/v3.85.0/src/physics/arcade/ArcadeSprite.js#L11

export default class Sprite {
    constructor(scene, x, y, width, height) {
        this.scene = scene;
        this.width = width || 0;
        this.height = height || 0;
        this.x = this.y = this._displayOriginX = this._displayOriginY = 0;
        this.setOrigin();
        this.setPosition(x, y);
    }

    set displayOriginX(value) {
        this._displayOriginX = value;
        this.originX = value / this.width;
    }

    get displayOriginX() {
        return this._displayOriginX;
    }

    set displayOriginY(value) {
        this._displayOriginY = value;
        this.originY = value / this.height;
    }

    get displayOriginY() {
        return this._displayOriginY;
    }

    setOrigin(x, y) {
        if (x === undefined) { x = 0.5; }
        if (y === undefined) { y = x; }

        this.originX = x;
        this.originY = y;

        return this.updateDisplayOrigin();
    }

    updateDisplayOrigin() {
        this._displayOriginX = this.originX * this.width;
        this._displayOriginY = this.originY * this.height;

        return this;
    }

    setX(value) {
        if (value === undefined) { value = 0; }

        this.x = value;

        return this;
    }

    setY(value) {
        if (value === undefined) { value = 0; }

        this.y = value;

        return this;
    }

    setPosition(x, y) {
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = x; }

        this.x = x;
        this.y = y;

        return this;
    }

    setDisplayOrigin(x, y) {
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = x; }

        this.displayOriginX = x;
        this.displayOriginY = y;

        return this;
    }

    copyPosition(source) {
        if (source.x !== undefined) { this.x = source.x; }
        if (source.y !== undefined) { this.y = source.y; }

        return this;
    }

    setRandomPosition(x, y, width, height) {
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = 0; }
        if (width === undefined) { width = 0; }
        if (height === undefined) { height = 0; }

        this.x = x + (Math.random() * width);
        this.y = y + (Math.random() * height);

        return this;
    }
    
    copy(src) {
        this.x = src.x;
        this.y = src.y;
        this.width = src.width;
        this.height = src.height;
        this.displayOriginX = src.displayOriginX;
        this.displayOriginY = src.displayOriginY;
    }
}