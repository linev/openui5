/*global describe,it,element,by,takeScreenshot,expect,browser,protractor*/

describe("sap.m.TimePicker", function() {
	"use strict";

	it("time picker disabled", function() {
		element(by.id("TP2-icon")).click();
		expect(takeScreenshot(element(by.id("TP2-toolbar")))).toLookAs("time_picker_not_opened");
	});

	it("focus in behavior when mask mode is on", function () {
		var oInnerInput = element(by.id("TP1-inner"));

		//Focus input field
		oInnerInput.click();
		//Move the caret one symbol to the right
		browser.actions().sendKeys(protractor.Key.ARROW_RIGHT).perform();
		//Remove the first symbol
		browser.actions().sendKeys(protractor.Key.BACK_SPACE).perform();
		//Focus out of the input field
		browser.actions().sendKeys(protractor.Key.TAB).perform();
		//Focus input field again
		oInnerInput.click();

		//Assert
		expect(takeScreenshot(element(by.id("TP1-toolbar")))).toLookAs("input_value_selected");
	});

	// 12 hours clock
	it("keyboard: time picker with display format - 'h:mm:ss a' keyboard interaction", function() {
		element(by.id("TP5-icon")).click();

		var oClock = element(by.id("TP5-RP-popover"));
		expect(takeScreenshot(oClock)).toLookAs("TP5_hours_9_15_16");

		// Hours shortcut
		browser.actions().sendKeys(protractor.Key.PAGE_UP).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_hours_10_15_16");

		browser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_hours_9_15_16");

		// Minutes shortcut
		browser.actions().keyDown(protractor.Key.SHIFT).perform();

		browser.actions().sendKeys(protractor.Key.PAGE_UP).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_minutes_9_16_16");

		browser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_minutes_9_15_16");

		// Seconds shortcut
		browser.actions().keyDown(protractor.Key.CONTROL).perform();

		browser.actions().sendKeys(protractor.Key.PAGE_UP).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_seconds_9_15_17");

		browser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_seconds_9_15_16");

		// Spetarator shortcut
		browser.actions().keyUp(protractor.Key.CONTROL).perform();
		browser.actions().sendKeys(':').perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_hours_9_15_16");

		browser.actions().sendKeys(':').perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_minutes_9_15_16");

		browser.actions().sendKeys(':').perform();
		expect(takeScreenshot(oClock)).toLookAs("TP5_seconds_9_15_16");

		browser.actions().keyUp(protractor.Key.SHIFT).perform();

		// Close popover
		element(by.id("TP5-Cancel")).click();
	});

	// 24 hours clock
	it("keyboard: time picker with display format - 'HH:mm'", function() {
		element(by.id("TP14-icon")).click();
		var oClock = element(by.id("TP14-RP-popover"));
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_21_15");

		// Hours shortcut
		browser.actions().sendKeys(protractor.Key.PAGE_UP).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_22_15");

		browser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_21_15");

		// Minutes shortcut
		browser.actions().keyDown(protractor.Key.SHIFT).perform();

		browser.actions().sendKeys(protractor.Key.PAGE_UP).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_minutes_21_16");

		browser.actions().sendKeys(protractor.Key.PAGE_DOWN).perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_minutes_21_15");

		// Spetarator shortcut
		browser.actions().sendKeys(':').perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_21_15");

		browser.actions().sendKeys(':').perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_minutes_21_15");

		browser.actions().keyUp(protractor.Key.SHIFT).perform();

		// Close popover
		element(by.id("TP14-Cancel")).click();
	});

	it("mouse press: time picker with display format - mm:ss and 15 step", function() {
		element(by.id("TP1-icon")).click();
		var oClock = element(by.id("TP1-RP-popover"));
		expect(takeScreenshot(oClock)).toLookAs("TP1_minutes_13_15");

		var oMinutesCover = element(by.id("TP1-clocks-clockM-cover"));
		browser.actions().mouseMove(oMinutesCover, {x: 135, y: 0}).click().perform();
		expect(takeScreenshot(oClock)).toLookAs("TP1_minutes_00_15");

		var oSecondsCover = element(by.id("TP1-clocks-clockS-cover"));
		browser.actions().mouseMove(oSecondsCover, {x: 0, y: 135}).click().perform();
		expect(takeScreenshot(oClock)).toLookAs("TP1_seconds_00_45");

		// Close popover
		element(by.id("TP1-Cancel")).click();
	});

	it("mouse press: time picker with display format - hh:mm", function() {
		element(by.id("TP14-icon")).click();
		var oClock = element(by.id("TP14-RP-popover"));
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_21_15");

		var oHoursCover = element(by.id("TP14-clocks-clockH-cover"));
		browser.actions().mouseMove(oHoursCover, {x: 165, y: 55}).click().perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_hours_13_15");

		var oMinutesCover = element(by.id("TP14-clocks-clockM-cover"));
		browser.actions().mouseMove(oMinutesCover, {x: 135, y: 260}).click().perform();
		expect(takeScreenshot(oClock)).toLookAs("TP14_minutes_13_30");

		// Close popover
		element(by.id("TP14-Cancel")).click();
	});

	it("TimePicker input press triggers a popover to be opened", function() {
		var oToggleMobileButton = element(by.id("toggleMobile"));
		var oPopover = element(by.id("TP7-NP"));

		// Simulate mobile device
		oToggleMobileButton.click();

		// Open popover
		element(by.id("TP7-inner")).click();

		expect(takeScreenshot(oPopover)).toLookAs("TP7_input_popover");

		// Close popover
		element(by.id("TP7-NumericCancel")).click();

		// Disable mobile device simulation
		oToggleMobileButton.click();
	});
});

