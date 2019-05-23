/*!
 * ${copyright}
 */

sap.ui.define([
		'./library',
		'sap/ui/core/Core',
		'sap/ui/core/Control',
		'sap/ui/core/Element',
		'sap/ui/core/InvisibleText',
		'sap/ui/Device',
		'./ListItemBase',
		'./Text',
		'./Image',
		'./Button',
		'./ToolbarSeparator',
		'sap/m/OverflowToolbar',
		'sap/m/OverflowToolbarLayoutData',
		'sap/ui/core/IconPool',
		'sap/ui/core/Icon',
		'sap/ui/core/library'],
	function (library,
			  Core,
			  Control,
			  Element,
			  InvisibleText,
			  Device,
			  ListItemBase,
			  Text,
			  Image,
			  Button,
			  ToolbarSeparator,
			  OverflowToolbar,
			  OverflowToolbarLayoutData,
			  IconPool,
			  Icon,
			  coreLibrary) {
		'use strict';

		// shortcut for sap.ui.core.Priority
		var Priority = coreLibrary.Priority;

		// shortcut for sap.m.ButtonType
		var ButtonType = library.ButtonType;

		// shortcut for sap.m.OverflowToolbarPriority
		var OverflowToolbarPriority = library.OverflowToolbarPriority;

		var resourceBundle = Core.getLibraryResourceBundle('sap.m'),
			closeText = resourceBundle.getText('NOTIFICATION_LIST_BASE_CLOSE'); // this is used for tooltip for the "X" button and the text of the button "X" when it is in the overflow toolbar on mobile

		/**
		 * Constructor for a new NotificationListBase.
		 *
		 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
		 * @param {object} [mSettings] Initial settings for the new control
		 *
		 * @class
		 * The NotificationListBase is the abstract base class for {@link sap.m.NotificationListItem} and {@link sap.m.NotificationListGroup}.
		 *
		 * The NotificationList controls are designed for the SAP Fiori notification center.
		 * <h4>Overview</h4>
		 * NotificationListBase defines the general structure of a notification item. Most of the behavioral logic is defined for the single items or groups.
		 * <h4>Structure</h4>
		 * The base holds properties for the following elements:
		 * <ul>
		 * <li>Author name</li>
		 * <li>Author picture</li>
		 * <li>Time stamp</li>
		 * <li>Priority</li>
		 * <li>Title</li>
		 * </ul>
		 * Additionally, by setting these properties you can determine if buttons are shown:
		 * <ul>
		 * <li><code>showButtons</code> - action buttons visibility</li>
		 * <li><code>showCloseButton</code> - close button visibility</li>
		 * </ul>
		 * @extends sap.m.ListItemBase
		 *
		 * @author SAP SE
		 * @version ${version}
		 *
		 * @constructor
		 * @public
		 * @since 1.38
		 * @alias sap.m.NotificationListBase
		 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
		 */
		var NotificationListBase = ListItemBase.extend('sap.m.NotificationListBase', /** @lends sap.m.NotificationListBase.prototype */ {
			metadata: {
				library: 'sap.m',
				properties: {
					// unread is inherit from the ListItemBase.

					/**
					 * Determines the priority of the Notification.
					 */
					priority: {
						type: 'sap.ui.core.Priority',
						group: 'Appearance',
						defaultValue: Priority.None
					},

					/**
					 * Determines the title of the NotificationListBase item.
					 */
					title: {type: 'string', group: 'Appearance', defaultValue: ''},

					/**
					 * Determines the due date of the NotificationListItem.
					 */
					datetime: {type: 'string', group: 'Appearance', defaultValue: ''},

					/**
					 * Determines the action buttons visibility.
					 *
					 * <b>Note:</b> Collapsed Notification List Groups don't show the action buttons at all.
					 */
					showButtons: {type: 'boolean', group: 'Behavior', defaultValue: true},

					/**
					 * Determines the visibility of the close button.
					 */
					showCloseButton: {type: 'boolean', group: 'Behavior', defaultValue: true},

					/**
					 * Determines the notification group's author name.
					 */
					authorName: {type: 'string', group: 'Appearance', defaultValue: ''},

					/**
					 * Determines the URL of the notification group's author picture.
					 */
					authorPicture: {type: 'sap.ui.core.URI', multiple: false}

				},
				aggregations: {
					/**
					 * Action buttons.
					 */
					buttons: {type: 'sap.m.Button', multiple: true},

					/**
					 * The overflow toolbar.
					 * @private
					 */
					_overflowToolbar: {type: 'sap.m.OverflowToolbar', multiple: false, visibility: "hidden"},

					/**
					 * The sap.m.Image or sap.ui.core.Control control that holds the author image or icon.
					 * @private
					 */
					_authorImage: {type: 'sap.ui.core.Control', multiple: false, visibility: "hidden"},

					/**
					 * The priority icon.
					 * @private
					 */
					_priorityIcon: {type: 'sap.ui.core.Icon', multiple: false, visibility: "hidden"}

				},
				events: {
					/**
					 * Fired when the close button of the notification is pressed.<br><b>Note:</b> Pressing the close button doesn't destroy the notification automatically.
					 */
					close: {}

					// 'tap' and 'press' events are inherited from ListItemBase.
				}
			}
		});

		NotificationListBase.prototype._activeHandling = function () {

		};

		NotificationListBase.prototype.updateSelectedDOM = function() {

		};


		NotificationListBase._getInvisibleText = function() {
			return this._invisibleText || (this._invisibleText = new InvisibleText().toStatic());
		};

		NotificationListBase.prototype.onfocusin = function (event) {
			if (event.target !== this.getDomRef()) {
				return;
			}

			var invisibleText = NotificationListBase._getInvisibleText(),
				$focusedItem = this.$(),
				accText = this.getAccessibilityText();

			invisibleText.setText(accText);
			$focusedItem.addAriaLabelledBy(invisibleText.getId());
		};

		NotificationListBase.prototype.getAccessibilityText = function() {
			return '';
		};

		NotificationListBase.prototype.getButtons = function () {
			return this._getOverflowToolbar().getContent().filter(function(item){
				return item !== this._closeButton && item !== this._toolbarSeparator;
			}, this);
		};

		NotificationListBase.prototype.addButton = function (oButton) {

			var overflowToolbar  = this._getOverflowToolbar(),
				index = overflowToolbar.getContent().length;

			if (Device.system.phone) {
				index -= 2;
			}

			overflowToolbar.insertContent(oButton, index);

			return this;
		};

		NotificationListBase.prototype.insertButton = function (oButton, index) {

			this._getOverflowToolbar().insertContent(oButton, index);

			return this;
		};

		NotificationListBase.prototype.removeButton = function (oButton) {
			return this._getOverflowToolbar().removeContent(oButton.getId());
		};

		NotificationListBase.prototype.removeAllButtons = function () {
			var overflowToolbar = this._getOverflowToolbar(),
				buttons = this.getButtons();

			buttons.forEach(function (button) {
				overflowToolbar.removeContent(button.getId());
			});

			return this;
		};

		NotificationListBase.prototype.destroyButtons = function () {
			var buttons = this.getButtons();

			buttons.forEach(function (button) {
				button.destroy();
			});

			return this;
		};

		/**
		 * Returns the sap.m.Image or the sap.ui.core.Control used in the NotificationListBase's author picture.
		 *
		 * @protected
		 * @returns {sap.m.Image|sap.ui.core.Control} The notification author picture text.
		 */
		NotificationListBase.prototype._getAuthorImage = function() {
			/** @type {sap.m.Image|sap.ui.core.Control} */
			var authorImage = this.getAggregation('_authorImage'),
				authorPicture = this.getAuthorPicture(),
				authorName = this.getAuthorName();

			// todo - check if the type (Icon/Image) has changed
			if (!authorImage) {
				authorImage = isIcon(authorPicture) ? new Icon() : new Image();
				this.setAggregation('_authorImage', authorImage, true);
			}

			authorImage.setSrc(authorPicture);
			authorImage.setAlt(authorName);

			return authorImage;
		};

		NotificationListBase.prototype._getOverflowToolbar = function() {
			var overflowToolbar = this.getAggregation('_overflowToolbar');

			if (!overflowToolbar) {
				overflowToolbar = new OverflowToolbar(this.getId() + '-overflowToolbar', {});

				this.setAggregation("_overflowToolbar", overflowToolbar, true);

				if (Device.system.phone) {
					var oCloseButton = this._getCloseButton();
					this._toolbarSeparator = new ToolbarSeparator();
					oCloseButton.setLayoutData(new OverflowToolbarLayoutData({
						priority: OverflowToolbarPriority.AlwaysOverflow
					}));

					this._toolbarSeparator.setLayoutData(new OverflowToolbarLayoutData({
						priority: OverflowToolbarPriority.AlwaysOverflow
					}));

					overflowToolbar.addContent(this._toolbarSeparator);
					overflowToolbar.addContent(oCloseButton);
				}
			}

			return overflowToolbar;
		};


		NotificationListBase.prototype._getCloseButton = function() {
			var closeButton = this._closeButton;

			if (!closeButton) {
				if (Device.system.phone) {
					this._closeButton = new Button(this.getId() + '-closeButtonOverflow', {
						text: closeText,
						type: ButtonType.Default,
						press: function () {
							this.close();
						}.bind(this)
					});
				} else {
					this._closeButton = new Button(this.getId() + '-closeButtonX', {
						icon: IconPool.getIconURI('decline'),
						type: ButtonType.Transparent,
						tooltip: closeText,
						press: function () {
							this.close();
						}.bind(this)
					});
				}
			}

			return this._closeButton;
		};

		NotificationListBase.prototype.exit = function() {
			if (this._closeButton) {
				this._closeButton.destroy();
			}

			if (this._toolbarSeparator) {
				this._toolbarSeparator.destroy();
			}
		};

		NotificationListBase.prototype.onBeforeRendering = function() {
			var buttons = this.getButtons(),
				firstButtonOverflow = (Device.system.phone || buttons.length > 1) ? OverflowToolbarPriority.AlwaysOverflow : OverflowToolbarPriority.NeverOverflow,
				button;

			for (var i = 0; i < buttons.length; i++) {
				button = buttons[i];
				button.setLayoutData(new OverflowToolbarLayoutData({
					priority: i === 0 ? firstButtonOverflow : OverflowToolbarPriority.AlwaysOverflow
				}));
			}



			if (this._getOverflowToolbar().getContent().length === 1) {
				this.addStyleClass("sapMNLBNoOverflow");
			}
		};

		/**
		 * Closes the NotificationListBase.
		 *
		 * @public
		 */
		NotificationListBase.prototype.close = function () {
			var parent = this.getParent();
			this.fireClose();
			var bHasParentAfterClose = !!this.getParent(); // no parent after close means the notification is removed or destroyed - in such case move the focus

			if (!bHasParentAfterClose && parent && parent instanceof Element) {
				var delegate = {
					onAfterRendering: function() {
						parent.focus();
						parent.removeEventDelegate(delegate);
					}
				};
				parent.addEventDelegate(delegate);
			}
		};

		/**
		 * Checks if an sap.ui.core.URI parameter is an icon src or not.
		 *
		 * @private
		 * @param {string} source The source to be checked.
		 * @returns {boolean} The result of the check.
		 */
		function isIcon(source) {
			if (!source) {
				return false;
			}

			var result = window.URI.parse(source);
			return result.protocol && result.protocol === 'sap-icon';
		}

		NotificationListBase.prototype._getPriorityIcon = function() {
			var priorityIcon = this.getAggregation('_priorityIcon');

			if (!priorityIcon) {
				priorityIcon = new Icon({
					src: 'sap-icon://message-error'
				});

				this.setAggregation("_priorityIcon", priorityIcon, true);
			}

			return priorityIcon;
		};

		return NotificationListBase;
	});
