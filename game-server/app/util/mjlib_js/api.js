"use strict";

var MAX_CARD = 34;

exports.MTableMgr = require( './table_mgr.js' );
exports.MHulib = require( './hulib.js' );

exports.Init = function()
{
	console.log("start  production...");
    this.MTableMgr.Init();
    console.log("end  production");
};

exports.checkHu = function (cardsList, addCard, gui1, gui2) {
	if (addCard == undefined || addCard == null) {
		addCard = MAX_CARD;
	}

	if (gui1 == undefined || gui1 == null) {
		gui1 = MAX_CARD;
	}

	if (gui2 == undefined || gui2 == null) {
		gui2 = MAX_CARD;
	}

	var testList = new Array(MAX_CARD).fill(0);
	for (var i = 0; i < cardsList.length; i++) {
		testList[cardsList[i]] ++;
	}

	return this.MHulib.get_hu_info(testList, addCard, gui1, gui2);
}