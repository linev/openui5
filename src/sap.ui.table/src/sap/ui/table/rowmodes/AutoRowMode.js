/*
 * ${copyright}
 */
sap.ui.define([
	"../library",
	"../TableUtils",
	"./RowMode",
	"sap/ui/Device",
	"sap/base/Log"
], function(
	library,
	TableUtils,
	RowMode,
	Device,
	Log
) {
	"use strict";

	/**
	 * Constructor for a new auto row mode.
	 *
	 * @param {string} [sId] id for the new control, generated automatically if no id is given
	 * @param {object} [mSettings] initial settings for the new control
	 *
	 * @private
	 * @class
	 * TODO: Class description
	 * @extends sap.ui.table.rowmodes.RowMode
	 * @constructor
	 * @alias sap.ui.table.rowmodes.AutoRowMode
	 * @ui5-restricted sap.ui.mdc
	 *
	 * @author SAP SE
	 * @version ${version}
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var AutoRowMode = RowMode.extend("sap.ui.table.rowmodes.AutoRowMode", /** @lends sap.ui.table.rowmodes.AutoRowMode.prototype */ {
		metadata: {
			library: "sap.ui.table",
			properties: {
				rowContentHeight: {type: "int", defaultValue: 0, group: "Appearance"},
				minRowCount: {type: "int", defaultValue: 5, group: "Appearance"},
				maxRowCount: {type: "int", defaultValue: -1, group: "Appearance"},
				hideEmptyRows: {type: "boolean", defaultValue: false, group: "Appearance"}
			}
		},
		constructor: function(sId) {
			Object.defineProperty(this, "bLegacy", {
				value: typeof sId === "boolean" ? sId : false
			});

			if (this.bLegacy) {
				RowMode.call(this);
			} else {
				RowMode.apply(this, arguments);
			}
		}
	});

	var TableDelegate = {};

	AutoRowMode.prototype.init = function() {
		RowMode.prototype.init.call(this, TableDelegate);
		this.bRowCountAutoAdjustmentActive = false;
		this.iLastAvailableSpace = 0;

		/**
		 * Asynchronously calculates and applies the row count based on the available vertical space.
		 *
		 * @param {sap.ui.table.TableUtils.RowsUpdateReason} sReason The reason for updating the rows.
		 * @param {boolean} [bStartAutomaticAdjustment=false] Whether to start automatic row count adjustment by attaching a resize handler after
		 * adjusting the row count.
		 * @private
		 */
		this.adjustRowCountToAvailableSpaceAsync = TableUtils.debounce(this.adjustRowCountToAvailableSpace, {
			requestAnimationFrame: true
		});
	};

	/**
	 * The row count is set automatically and cannot be set manually. Trying to set the row count has no effect.
	 *
	 * @override
	 */
	AutoRowMode.prototype.setRowCount = function() {
		Log.error("The row count is set automatically and cannot be set manually.", this);
		return this;
	};

	/*
	 * @see JSDoc generated by SAPUI5 control API generator
	 */
	AutoRowMode.prototype.getRowCount = function() {
		return this.bLegacy ? this.getTable().getVisibleRowCount() : this.getProperty("rowCount");
	};

	/*
	 * @see JSDoc generated by SAPUI5 control API generator
	 */
	AutoRowMode.prototype.getFixedTopRowCount = function() {
		return this.bLegacy ? this.getTable().getFixedRowCount() : this.getProperty("fixedTopRowCount");
	};

	/*
	 * @see JSDoc generated by SAPUI5 control API generator
	 */
	AutoRowMode.prototype.getFixedBottomRowCount = function() {
		return this.bLegacy ? this.getTable().getFixedBottomRowCount() : this.getProperty("fixedBottomRowCount");
	};

	/*
	 * @see JSDoc generated by SAPUI5 control API generator
	 */
	AutoRowMode.prototype.getMinRowCount = function() {
		return this.bLegacy ? this.getTable().getMinAutoRowCount() : this.getProperty("minRowCount");
	};

	/*
	 * @see JSDoc generated by SAPUI5 control API generator
	 */
	AutoRowMode.prototype.getRowContentHeight = function() {
		return this.bLegacy ? this.getTable().getRowHeight() : this.getProperty("rowContentHeight");
	};

	/**
	 * Gets the real minimum row count, considering the maximum row count.
	 *
	 * @returns {int} The minimum row count.
	 * @private
	 */
	AutoRowMode.prototype._getMinRowCount = function() {
		var iMinRowCount = this.getMinRowCount();
		var iMaxRowCount = this.getMaxRowCount();

		if (iMaxRowCount >= 0) {
			return Math.min(iMinRowCount, iMaxRowCount);
		} else {
			return iMinRowCount;
		}
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.cleanUpTimersAndEventListeners = function() {
		RowMode.prototype.cleanUpTimersAndEventListeners.apply(this, arguments);
		this.stopAutoRowMode();
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getMinRequestLength = function() {
		var oTable = this.getTable();
		var iRequestLength = this.getConfiguredRowCount();

		if (this.isPropertyInitial("rowCount") || (oTable && !oTable._bContextsAvailable)) {
			// Due to the dynamic nature of this mode, the requests during initialization of the table's rows or rows binding should consider the
			// screen height to avoid multiple requests in case the height available for the table increases. This can happen, for example, during
			// the startup phase of an application.
			var iEstimatedMaxRowCount = Math.ceil(Device.resize.height / TableUtils.DefaultRowHeight.sapUiSizeCondensed);
			iRequestLength = Math.max(iRequestLength, iEstimatedMaxRowCount);
		}

		return iRequestLength;
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getComputedRowCounts = function() {
		if (this.isPropertyInitial("rowCount")) {
			// The actual row count is only known after rendering, when the row count was first determined and set.
			return {
				count: 0,
				scrollable: 0,
				fixedTop: 0,
				fixedBottom: 0
			};
		}

		var iRowCount = this.getConfiguredRowCount();
		var iFixedTopRowCount = this.getFixedTopRowCount();
		var iFixedBottomRowCount = this.getFixedBottomRowCount();

		if (this.getHideEmptyRows()) {
			iRowCount = Math.min(iRowCount, this.getTotalRowCountOfTable());
		}

		return this.sanitizeRowCounts(iRowCount, iFixedTopRowCount, iFixedBottomRowCount);
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getTableStyles = function() {
		var sHeight = "0px"; // The table's DOM parent needs to be able to shrink.

		if (this.isPropertyInitial("rowCount")) {
			sHeight = "auto";
		} else {
			var iRowCount = this.getConfiguredRowCount();

			if (iRowCount === 0 || iRowCount === this._getMinRowCount()) {
				sHeight = "auto";
			}
		}

		return {
			height: sHeight
		};
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getTableBottomPlaceholderStyles = function() {
		if (!this.getHideEmptyRows()) {
			return undefined;
		}

		var iRowCountDelta = 0;

		if (this.isPropertyInitial("rowCount")) {
			iRowCountDelta = this._getMinRowCount();
		} else {
			iRowCountDelta = this.getConfiguredRowCount() - this.getComputedRowCounts().count;
		}

		return {
			height: iRowCountDelta * this.getBaseRowHeightOfTable() + "px"
		};
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getRowContainerStyles = function() {
		return {
			height: this.getComputedRowCounts().count * this.getBaseRowHeightOfTable() + "px"
		};
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.renderRowStyles = function(oRM) {
		var iRowContentHeight = this.getRowContentHeight();

		if (iRowContentHeight > 0) {
			oRM.style("height", this.getBaseRowHeightOfTable() + "px");
		}
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.renderCellContentStyles = function(oRM) {
		var iRowContentHeight = this.getRowContentHeight();

		if (!this.bLegacy && iRowContentHeight <= 0) {
			iRowContentHeight = this.getDefaultRowContentHeightOfTable();
		}

		if (iRowContentHeight > 0) {
			oRM.style("max-height", iRowContentHeight + "px");
		}
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.getBaseRowContentHeight = function() {
		return Math.max(0, this.getRowContentHeight());
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.refreshRows = function() {
		// The computed row count cannot be used here, because the table's total row count (binding length) is not known yet.
		var iConfiguredRowCount = this.getConfiguredRowCount();
		var bRowCountIsKnown = !this.isPropertyInitial("rowCount");

		if (iConfiguredRowCount > 0) {
			if (bRowCountIsKnown) {
				this.initTableRowsAfterDataRequested(iConfiguredRowCount);
			}
			this.getRowContexts(iConfiguredRowCount, true); // Trigger data request.
		}
	};

	/**
	 * Gets the row count as configured with the <code>rowCount</code>, <code>minRowCount</code> and <code>maxRowCount</code> properties.
	 *
	 * @returns {int} The configured row count.
	 * @private
	 */
	AutoRowMode.prototype.getConfiguredRowCount = function() {
		var iRowCount = Math.max(0, this.getMinRowCount(), this.getRowCount());
		var iMaxRowCount = this.getMaxRowCount();

		if (iMaxRowCount >= 0) {
			iRowCount = Math.min(iRowCount, iMaxRowCount);
		}

		return iRowCount;
	};

	/**
	 * Starts the automatic row count mode. An initial row count adjustment is performed. A resize listener then detects height changes. When this
	 * occurs, the row count is also adjusted. The row count is calculated and applied based on the available vertical space.
	 *
	 * @private
	 */
	AutoRowMode.prototype.startAutoRowMode = function() {
		this.adjustRowCountToAvailableSpaceAsync(TableUtils.RowsUpdateReason.Render, true);
	};

	/**
	 * Stops the automatic row count mode.
	 *
	 * @private
	 */
	AutoRowMode.prototype.stopAutoRowMode = function() {
		this.deregisterResizeHandler();
		this.adjustRowCountToAvailableSpaceAsync.cancel();
		this.bRowCountAutoAdjustmentActive = false;
	};

	/**
	 * Registers a resize handler on the table or the DOM parent of the table.
	 *
	 * @param {boolean} [bOnTableParent=false] Whether to register the resize handler on the DOM parent of the table.
	 * @private
	 */
	AutoRowMode.prototype.registerResizeHandler = function(bOnTableParent) {
		var oTable = this.getTable();

		if (oTable) {
			TableUtils.registerResizeHandler(oTable, "AutoRowMode", this.onResize.bind(this), null, bOnTableParent === true);
		}
	};

	/**
	 * Deregisters the resize handler.
	 *
	 * @private
	 */
	AutoRowMode.prototype.deregisterResizeHandler = function() {
		var oTable = this.getTable();

		if (oTable) {
			TableUtils.deregisterResizeHandler(oTable, "AutoRowMode");
		}
	};

	/**
	 * Resize handler.
	 *
	 * @param {jQuery.Event} oEvent The event object.
	 * @private
	 */
	AutoRowMode.prototype.onResize = function(oEvent) {
		var iOldHeight = oEvent.oldSize.height;
		var iNewHeight = oEvent.size.height;

		if (iOldHeight !== iNewHeight) {
			this.adjustRowCountToAvailableSpaceAsync(TableUtils.RowsUpdateReason.Resize);
		}
	};

	/**
	 * @inheritDoc
	 */
	AutoRowMode.prototype.updateTableSizes = function(sReason) {
		// Resize and render are handled elsewhere.
		if (sReason === TableUtils.RowsUpdateReason.Resize || sReason === TableUtils.RowsUpdateReason.Render) {
			return;
		}

		if (this.bRowCountAutoAdjustmentActive) {
			this.adjustRowCountToAvailableSpaceAsync(sReason);
		}
	};

	/**
	 * Calculates and applies the row count based on the available vertical space.
	 *
	 * @param {sap.ui.table.TableUtils.RowsUpdateReason} sReason The reason for updating the rows.
	 * @param {boolean} [bStartAutomaticAdjustment=false] Whether to start automatic row count adjustment by attaching a resize handler after
	 * adjusting the row count.
	 * @private
	 */
	AutoRowMode.prototype.adjustRowCountToAvailableSpace = function(sReason, bStartAutomaticAdjustment) {
		bStartAutomaticAdjustment = bStartAutomaticAdjustment === true;

		var oTable = this.getTable();
		var oTableDomRef = oTable ? oTable.getDomRef() : null;

		if (!oTable || oTable._bInvalid || !oTableDomRef || !sap.ui.getCore().isThemeApplied()) {
			return;
		}

		this.bTableIsFlexItem = window.getComputedStyle(oTableDomRef.parentNode).display === "flex";

		// If the table is invisible, it might get visible without re-rendering, which is basically the same as a resize.
		// We need to react on that, but not adjust the row count now.
		if (oTableDomRef.offsetWidth === 0) {
			if (bStartAutomaticAdjustment) {
				this.registerResizeHandler(!this.bTableIsFlexItem);
				this.bRowCountAutoAdjustmentActive = true;
			}
			return;
		}

		var iNewHeight = this.determineAvailableSpace();
		var oOldRowCount = this.getConfiguredRowCount();
		var iNewRowCount = Math.floor(iNewHeight / this.getBaseRowHeightOfTable());
		var iOldComputedRowCount = this.getComputedRowCounts().count;
		var iNewComputedRowCount;

		if (this.bLegacy) {
			oTable.setProperty("visibleRowCount", iNewRowCount, true);
		}

		this.setProperty("rowCount", iNewRowCount, true);
		iNewComputedRowCount = this.getComputedRowCounts().count;

		if (iOldComputedRowCount !== iNewComputedRowCount) {
			this.updateTable(sReason);
		} else {
			if (oOldRowCount !== iNewRowCount) {
				this.applyTableStyles();
				this.applyRowContainerStyles();
				this.applyTableBottomPlaceholderStyles();
			}

			if (bStartAutomaticAdjustment && oTable.getRows().length > 0) {
				// The parameter "bStartAutomaticAdjustment" indicates that this is the first adjustment after a table re-rendering.
				// Even if the row count does not change, the rows updated event still needs to be fired.
				oTable._fireRowsUpdated(sReason);
			}
		}

		if (bStartAutomaticAdjustment) {
			this.registerResizeHandler(!this.bTableIsFlexItem);
			this.bRowCountAutoAdjustmentActive = true;
		}
	};

	/**
	 * Determines the vertical space available for the rows.
	 *
	 * @returns {int} The available space.
	 * @private
	 */
	AutoRowMode.prototype.determineAvailableSpace = function() {
		var oTable = this.getTable();
		var oTableDomRef = oTable ? oTable.getDomRef() : null;
		var oRowContainer = oTable ? oTable.getDomRef("tableCCnt") : null;
		var oPlaceholder = oTable ? oTable.getDomRef("placeholder-bottom") : null;

		if (!oTableDomRef || !oRowContainer || !oTableDomRef.parentNode) {
			return 0;
		}

		var iUsedHeight = 0;
		var iRowContainerHeight = oRowContainer.clientHeight;
		var iPlaceholderHeight = oPlaceholder ? oPlaceholder.clientHeight : 0;

		if (this.bTableIsFlexItem) {
			var aChildNodes = oTableDomRef.childNodes;
			for (var i = 0; i < aChildNodes.length; i++) {
				iUsedHeight += aChildNodes[i].offsetHeight;
			}
			iUsedHeight -= iRowContainerHeight - iPlaceholderHeight;
		} else {
			iUsedHeight = oTableDomRef.scrollHeight - iRowContainerHeight - iPlaceholderHeight;
		}

		// For simplicity always add the default height of the horizontal scrollbar to the used height, even if it will not be visible.
		var oScrollExtension = oTable._getScrollExtension();
		if (!oScrollExtension.isHorizontalScrollbarVisible()) {
			var mDefaultScrollbarHeight = {};
			mDefaultScrollbarHeight[Device.browser.BROWSER.CHROME] = 16;
			mDefaultScrollbarHeight[Device.browser.BROWSER.FIREFOX] = 16;
			mDefaultScrollbarHeight[Device.browser.BROWSER.INTERNET_EXPLORER] = 18;
			mDefaultScrollbarHeight[Device.browser.BROWSER.EDGE] = 16;
			mDefaultScrollbarHeight[Device.browser.BROWSER.SAFARI] = 16;
			mDefaultScrollbarHeight[Device.browser.BROWSER.ANDROID] = 8;
			iUsedHeight += mDefaultScrollbarHeight[Device.browser.name];
		}

		var oReferenceElement = this.bTableIsFlexItem ? oTableDomRef : oTableDomRef.parentNode;
		var iNewAvailableSpace = Math.max(0, Math.floor(jQuery(oReferenceElement).height() - iUsedHeight));
		var iAvailableSpaceDifference = Math.abs(iNewAvailableSpace - this.iLastAvailableSpace);

		if (iAvailableSpaceDifference >= 5) {
			this.iLastAvailableSpace = iNewAvailableSpace;
		}

		return this.iLastAvailableSpace;
	};

	TableDelegate.onBeforeRendering = function(oEvent) {
		var bRenderedRows = oEvent && oEvent.isMarked("renderRows");

		if (!bRenderedRows) {
			this.stopAutoRowMode();
			this.updateTable(TableUtils.RowsUpdateReason.Render);
		}
	};

	TableDelegate.onAfterRendering = function(oEvent) {
		var bRenderedRows = oEvent && oEvent.isMarked("renderRows");

		if (!bRenderedRows) {
			this.startAutoRowMode();
		}
	};

	return AutoRowMode;
});