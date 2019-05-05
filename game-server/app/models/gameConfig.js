var GameConfig = {};

GameConfig.gameType = {
	mj: 1,
};

GameConfig.gameList = [
	{
        id: GameConfig.gameType.mj,
        name: "麻将",
        groupList: [
          {level: 110, base: 100, costGold: 100, costDiamond: 0, limitMin: 1000, limitMax: 10000, name: "初级场"},
          {level: 120, base: 1000, costGold: 1000, costDiamond: 0, limitMin: 10000, limitMax: 100000, name: "中级场"},
          {level: 130, base: 10000, costGold: 10000, costDiamond: 0, limitMin: 100000, limitMax: 1000000, name: "高级场"},
          {level: 140, base: 100000, costGold: 100000, costDiamond: 0, limitMin: 1000000, limitMax: 99999999999, name: "神级场"},
          {level: 150, base: 1, costGold: 0, costDiamond: 0, limitMin: 0, limitMax: 0, name: "好友房"},
        ]
    },
];

GameConfig.FriendLevel = {
	[GameConfig.gameType.mj]: 150,
};

//场次服务器列表
GameConfig.groupServerList: {
    [GameConfig.gameType.mj]: "mj",
};

module.exports = GameConfig;