export const SecondsStored = 30;
export const MaxPacketSize = 1300;
export const MaxSpeed = 100;
export const MaxTimeSyncSamples = 10;
export const NetworkUpdateFPS = 1;
export const NetworkUpdateRate = 1000 / NetworkUpdateFPS;
export const GameUpdateFPS = 60;
export const GameUpdateRate = 1000 / GameUpdateFPS;
export const TimeSamplingSyncRate = 2000; //ms 
export const HelthCheckRate = 2000; //ms 
export const MaxTimeWithoutResponse = 1000; //ms
export const MaxTrysFullCommands = GameUpdateFPS;
export const MaxTimeToDisconnect = 5000; //ms
export const MinServerBufferToAlert = GameUpdateFPS * 2;
export const MaxCommandsSize = GameUpdateFPS * SecondsStored;
export const MaxTrysEmptyCOmmands = GameUpdateFPS;
export const PlayerType = 1;
export const ReplayerType = 2;
/*
export const Faces = [
    'right',
    'down',
    'down',
    'left',
    'left',
    'up',
    'up',
    'right',
    'right', 
];
*/