var friendGroupConfig = {
	payType: [ 											//支付方式
		{typeIndex: 1, desc: "房主支付"},
		{typeIndex: 2, desc: "赢家支付"},
	],
	costType: 1, 										//扣除种类(1: 金币 2: 钻石)
	costNumConfig: [ 										//扣除数量配置
		{roundNum: 1, cost: 100},
		{roundNum: 2, cost: 180},
		{roundNum: 3, cost: 260},
		{roundNum: 4, cost: 340},
	],
};

module.exports = friendGroupConfig;