const FrameRate = 60;
const SecondsStored = 15;

export const SUCCESS = 1;
export const CMD_END_OF_BUFFER = 0;
export const CMD_REGISTER = 1;
export const CMD_CLIENT_UPDATE = 2;
export const CMD_SERVER_UPDATE = 3;
export const CMD_TICK = 4;
export const CMD_FULL_SERVER_UPDATE = 5;
export const MAX_BUFFER_SIZE = FrameRate * SecondsStored;