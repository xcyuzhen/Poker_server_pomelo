module.exports = {
    gameList: [
        {
            id: 1,
            name: "麻将",
            groupList: [
              {level: 11000000, base: 100, costGold: 100, costDiamond: 0, limitMin: 1000, limitMax: 10000, name: "初级场"},
              {level: 12000000, base: 1000, costGold: 1000, costDiamond: 0, limitMin: 10000, limitMax: 100000, name: "中级场"},
              {level: 13000000, base: 10000, costGold: 10000, costDiamond: 0, limitMin: 100000, limitMax: 1000000, name: "高级场"},
              {level: 14000000, base: 100000, costGold: 100000, costDiamond: 0, limitMin: 1000000, limitMax: 99999999999, name: "神级场"}
            ]
        },
        {
            id: 2,
            name: "斗地主",
            groupList: [
                {level: 21000000, base: 100, costGold: 100, costDiamond: 0, limitMin: 1000, limitMax: 10000, name: "初级场"},
                {level: 22000000, base: 1000, costGold: 1000, costDiamond: 0, limitMin: 10000, limitMax: 100000, name: "中级场"},
                {level: 23000000, base: 10000, costGold: 10000, costDiamond: 0, limitMin: 100000, limitMax: 1000000, name: "高级场"},
                {level: 24000000, base: 100000, costGold: 100000, costDiamond: 0, limitMin: 1000000, limitMax: 99999999999, name: "神级场"}
            ]
        },
    ],

    groupServerList: {
        11000000: "mjGroupOne",
        12000000: "mjGroupTwo",
        13000000: "mjGroupThree",
        14000000: "mjGroupFour",
        21000000: "ddzGroupOne",
        22000000: "ddzGroupTwo",
        23000000: "ddzGroupThree",
        24000000: "ddzGroupFour",
    },
}