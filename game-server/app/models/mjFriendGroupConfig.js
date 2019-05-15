var friendGroupConfig = {
	costType: 2, 										//扣除种类(1: 金币 2: 钻石)
	costNumConfig: [ 									//扣除数量配置
		{roundNum: 1, cost: 1},
		{roundNum: 2, cost: 2},
		{roundNum: 3, cost: 3},
		{roundNum: 4, cost: 4},
	],
	MaNumConfig: [2, 4, 6], 							//马数
	RoundDefault: 2, 									//默认局数
	MaDefault: 6, 										//默认马数
};

module.exports = friendGroupConfig;