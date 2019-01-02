module.exports = {
    gameList: [
        {
            id: 1,
            name: "麻将",
            groupList: [
              {level: 110, base: 100, costGold: 100, costDiamond: 0, limitMin: 1000, limitMax: 10000, name: "初级场"},
              {level: 120, base: 1000, costGold: 1000, costDiamond: 0, limitMin: 10000, limitMax: 100000, name: "中级场"},
              {level: 130, base: 10000, costGold: 10000, costDiamond: 0, limitMin: 100000, limitMax: 1000000, name: "高级场"},
              {level: 140, base: 100000, costGold: 100000, costDiamond: 0, limitMin: 1000000, limitMax: 99999999999, name: "神级场"}
            ]
        },
        {
            id: 2,
            name: "斗地主",
            groupList: [
                {level: 210, base: 100, costGold: 100, costDiamond: 0, limitMin: 1000, limitMax: 10000, name: "初级场"},
                {level: 220, base: 1000, costGold: 1000, costDiamond: 0, limitMin: 10000, limitMax: 100000, name: "中级场"},
                {level: 230, base: 10000, costGold: 10000, costDiamond: 0, limitMin: 100000, limitMax: 1000000, name: "高级场"},
                {level: 240, base: 100000, costGold: 100000, costDiamond: 0, limitMin: 1000000, limitMax: 99999999999, name: "神级场"}
            ]
        },
    ],

    //场次服务器列表
    groupServerList: {
        1: "mj",
        2: "ddz",
    },

    //游戏服务器的flag
    gameServerFlag: {
        "mj-server-1": 1,
        "ddz-server-1": 1,
    },
}