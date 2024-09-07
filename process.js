import fs from 'fs/promises';
import Sprite from './js/Sprite.js';
import { Body } from './js/Physics.js';
import Vector2 from './js/Vector2.js';
import { MaxSpeed } from './js/Configuration.js';

const browsers = (await fs.readFile('./localhost.log', 'utf-8'))
    .split('\n')
    .map(text => JSON.parse(text))
    ;

const servers = (await fs.readFile('./server.log', 'utf-8'))
    .split('\n')
    .map(text => JSON.parse(text))
    ;

// console.log(server);

const scene = {};
const browserSprite = new Sprite(scene, browsers[0].x, browsers[0].y, 50, 50);
browserSprite.body = new Body(browserSprite);
const serverSprite = new Sprite(scene, servers[0].x, servers[0].y, 50, 50);
serverSprite.body = new Body(serverSprite);
const temp1 = new Vector2();
const temp2 = new Vector2();
const minTotal = Math.min(browsers.length, servers.length);

for (let i = 0; i < minTotal; i++) {
    const browser = browsers[i];
    const server = servers[i];

    temp1.set(
        (browser.left ? -1 : 0) + (browser.right ? 1 : 0),
        (browser.up ? -1 : 0) + (browser.down ? 1 : 0)
    );

    temp1.setLength(MaxSpeed);

    browserSprite.body.velocity.set(temp1.x, temp1.y);
    browserSprite.body.update(browser.time, browser.delta);

    temp2.set(
        (server.left ? -1 : 0) + (server.right ? 1 : 0),
        (server.up ? -1 : 0) + (server.down ? 1 : 0)
    );

    temp2.setLength(MaxSpeed);

    serverSprite.body.velocity.set(temp2.x, temp2.y);
    serverSprite.body.update(server.time, server.delta);

    console.log('browser:', browser.delta, 'server:', server.delta, 'diff:', browser.delta - server.delta);
    console.log('browser.x:', browserSprite.x, 'browser.y:', browserSprite.y, 'server.x:', serverSprite.x, 'server.y:', serverSprite.y);
    console.log('real.browser.x:', browser.x, 'real.browser.y:', browser.y, 'real.server.x:', server.x, 'real.server.y:', server.y);
}