/* global QUnit */

sap.ui.define([
	"sap/ui/fl/apply/api/SmartVariantManagementApplyAPI",
	"sap/ui/fl/write/api/SmartVariantManagementWriteAPI",
	"sap/ui/core/Control",
	"sap/ui/fl/write/_internal/flexState/compVariants/CompVariantState",
	"sap/ui/fl/apply/_internal/flexState/FlexState",
	"sap/ui/fl/initial/_internal/Storage",
	"sap/ui/fl/write/_internal/Storage",
	"sap/ui/fl/registry/Settings",
	"sap/ui/fl/Change",
	"sap/ui/fl/Layer",
	"sap/ui/fl/apply/_internal/flexState/ManifestUtils",
	"sap/ui/core/UIComponent",
	"sap/ui/fl/Utils",
	"sap/ui/thirdparty/sinon-4"
], function(
	SmartVariantManagementApplyAPI,
	SmartVariantManagementWriteAPI,
	Control,
	CompVariantState,
	FlexState,
	InitialStorage,
	WriteStorage,
	Settings,
	Change,
	Layer,
	ManifestUtils,
	UIComponent,
	Utils,
	sinon
) {
	"use strict";

	var sandbox = sinon.sandbox.create();

	var oControl;

	QUnit.module("SmartVariantManagementWriteAPI", {
		afterEach: function() {
			sandbox.restore();
			if (oControl) {
				oControl.destroy();
			}
			delete Settings._instance;
			delete Settings._oLoadSettingsPromise;
		}
	}, function() {
		[{
			bIsNoSVM: true,
			apiFunctionName: "add",
			compVariantStateFunctionName: "add",
			mockedResponse: {
				getId: function () {
					return "id_123";
				}
			},
			expectedResponse: "id_123"
		}, {
			bIsNoSVM: false,
			apiFunctionName: "add",
			compVariantStateFunctionName: "add",
			mockedResponse: {
				getId: function () {
					return "id_123";
				}
			},
			expectedResponse: "id_123"
		}, {
			apiFunctionName: "addVariant",
			compVariantStateFunctionName: "add",
			expectedSpecificData: {
				isVariant: true
			}
		}, {
			apiFunctionName: "save",
			compVariantStateFunctionName: "persist"
		}, {
			apiFunctionName: "setDefaultVariantId",
			compVariantStateFunctionName: "setDefault"
		}, {
			apiFunctionName: "setExecuteOnSelection",
			compVariantStateFunctionName: "setExecuteOnSelection"
		}].forEach(function(testData) {
			QUnit.test("When " + testData.apiFunctionName + " is called", function (assert) {
				// mock control
				var sPersistencyKey = "thePersistencyKey";
				var oSVMControl = {
					getPersonalizableControlPersistencyKey: function () {
						return sPersistencyKey;
					}
				};
				var oControl = oSVMControl;
				if (testData.bIsNoSVM) {
					oControl = {
						getVariantManagement: function() {
							return oSVMControl;
						}
					};
				}
				var mPropertyBag = {
					control: oControl,
					changeSpecificData: {},
					command: "myCommand"
				};

				var oMockResponse = testData.mockedResponse || {};
				var oCompVariantStateStub = sandbox.stub(CompVariantState, testData.compVariantStateFunctionName).returns(oMockResponse);
				var sReference = "the.app.id";
				var oGetFlexReferenceForControlStub = sandbox.stub(ManifestUtils, "getFlexReferenceForControl").returns(sReference);

				var oResponse = SmartVariantManagementWriteAPI[testData.apiFunctionName](mPropertyBag);
				assert.equal(oGetFlexReferenceForControlStub.getCall(0).args[0], mPropertyBag.control, "then the reference was requested for the passed control,");
				assert.equal(oResponse, testData.expectedResponse || oMockResponse, "the response was passed to the caller,");
				assert.equal(oCompVariantStateStub.callCount, 1, "the CompVariantState function was called once,");
				var oCompVariantStateFunctionArguments = oCompVariantStateStub.getCall(0).args[0];
				assert.equal(oCompVariantStateFunctionArguments, mPropertyBag, "the propertyBag was passed,");
				assert.equal(oCompVariantStateFunctionArguments.reference, sReference, "the reference was added,");
				assert.equal(oCompVariantStateFunctionArguments.persistencyKey, sPersistencyKey, "and the reference was added");
				if (testData.expectedSpecificData) {
					assert.deepEqual(oCompVariantStateFunctionArguments.changeSpecificData, testData.expectedSpecificData, "and the specific data was set");
				}
			});
		});

		var sPersistencyKey = "someKey";

		QUnit.test("when removeVariant is called", function (assert) {
			var mPropertyBag = {};
			var sReference = "the.app.id";
			var oGetFlexReferenceForControlStub = sandbox.stub(ManifestUtils, "getFlexReferenceForControl").returns(sReference);
			var oCompVariantStateRemoveVariantStub = sandbox.stub(CompVariantState, "removeVariant").resolves();

			return SmartVariantManagementWriteAPI.removeVariant(mPropertyBag).then(function () {
				assert.equal(oGetFlexReferenceForControlStub.getCall(0).args[0], mPropertyBag.control, "then the reference was requested for the passed control,");
				assert.equal(oCompVariantStateRemoveVariantStub.callCount, 1, "then the CompVariantState.removeVariant was called");
				assert.equal(oCompVariantStateRemoveVariantStub.getCall(0).args[0], mPropertyBag, "and the propertyBag was passed");
			});
		});

		[{
			details: "and favorite is set, but the variant does not belong to sap.ui.fl",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "oData_variant_1",
				favorite: true
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: true,
				executeOnSelection: true,
				contexts: {},
				definition: {
					executeOnSelection: true
				},
				changeContent: {
					favorite: true
				}
			}
		}, {
			details: "a executeOnSelection is set, but the variant does not belong to sap.ui.fl",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "oData_variant_1",
				executeOnSelection: false
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: false,
				executeOnSelection: false,
				contexts: {},
				definition: {
					executeOnSelection: true
				},
				changeContent: {
					executeOnSelection: false
				}
			}
		}, {
			details: "contexts are set, but the variant does not belong to sap.ui.fl",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "oData_variant_1",
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				}
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: false,
				executeOnSelection: true,
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				},
				definition: {
					executeOnSelection: true
				},
				changeContent: {
					contexts: {
						ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
					}
				}
			}
		}, {
			details: "and favorite is set, but the variant does not belong to the same layer",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "flex_variant_1",
				favorite: false
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: false,
				executeOnSelection: false,
				contexts: {},
				definition: {
					favorite: true
				},
				changeContent: {
					favorite: false
				}
			}
		}, {
			details: "a executeOnSelection is set, but the variant does not belong to the same layer",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "flex_variant_1",
				executeOnSelection: true
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: true,
				executeOnSelection: true,
				contexts: {},
				definition: {
					favorite: true
				},
				changeContent: {
					executeOnSelection: true
				}
			}
		}, {
			details: "contexts are set, but the variant does not belong to to the same layer",
			updateVariantPropertyBag: {
				layer: Layer.CUSTOMER,
				id: "flex_variant_1",
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				}
			},
			expected: {
				layer: Layer.CUSTOMER,
				favorite: true,
				executeOnSelection: false,
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				},
				definition: {
					favorite: true
				},
				changeContent: {
					contexts: {
						ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
					}
				}
			}
		}, {
			details: "and favorite is set user dependent, but the variant does not belong to the same layer",
			updateVariantPropertyBag: {
				isUserDependent: true,
				id: "flex_variant_1",
				favorite: false
			},
			expected: {
				layer: Layer.USER,
				favorite: false,
				executeOnSelection: false,
				contexts: {},
				definition: {
					favorite: true
				},
				changeContent: {
					favorite: false
				}
			}
		}, {
			details: "a executeOnSelection is set user dependent, but the variant does not belong to the same layer",
			updateVariantPropertyBag: {
				isUserDependent: true,
				id: "flex_variant_1",
				executeOnSelection: true
			},
			expected: {
				layer: Layer.USER,
				favorite: true,
				executeOnSelection: true,
				contexts: {},
				definition: {
					favorite: true
				},
				changeContent: {
					executeOnSelection: true
				}
			}
		}, {
			details: "the variantName is set user dependent, but the variant does not belong to to the same layer",
			updateVariantPropertyBag: {
				isUserDependent: true,
				id: "flex_variant_1",
				name: "a new name"
			},
			expected: {
				layer: Layer.USER,
				favorite: true,
				executeOnSelection: false,
				name: "a new name",
				contexts: {},
				definition: {
					favorite: true
				},
				changeContent: {},
				changeTextsVariantName: "a new name"
			}
		}, {
			details: "contexts are set user dependent, but the variant does not belong to to the same layer",
			updateVariantPropertyBag: {
				isUserDependent: true,
				id: "flex_variant_1",
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				}
			},
			expected: {
				layer: Layer.USER,
				favorite: true,
				executeOnSelection: false,
				contexts: {
					ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
				},
				definition: {
					favorite: true
				},
				changeContent: {
					contexts: {
						ROLE: ["SOME_ROLE", "AND_ANOTHER_ROLE"]
					}
				}
			}
		}].forEach(function (testData) {
			QUnit.test("When updateVariant is called, " + testData.details, function (assert) {
				var sReference = "odata.app";
				sandbox.stub(ManifestUtils, "getFlexReferenceForControl").returns(sReference);
				var oAppComponent = new UIComponent();
				oControl = new Control("controlId1");
				oControl.getPersistencyKey = function() {
					return sPersistencyKey;
				};

				var aVariants = [{
					id: "oData_variant_1",
					executeOnSelection: true,
					name: "A variant",
					content: {}
				}, {
					id: "oData_variant_2",
					name: "A Variant",
					content: {}
				}];
				sandbox.stub(Utils, "getAppComponentForControl").returns(oAppComponent);
				sandbox.stub(InitialStorage, "loadFlexData").resolves({
					changes: [],
					comp: {
						compVariants: [],
						variants: [{
							fileName: "flex_variant_1",
							name: "F Variant",
							layer: Layer.VENDOR,
							content: {},
							favorite: true,
							selector: {
								persistencyKey: sPersistencyKey
							},
							texts: {
								variantName: {
									value: "A variant"
								}
							}
						}],
						changes: [],
						standardVariants: [],
						defaultVariants: []
					}
				});

				return FlexState.clearAndInitialize({
					reference: sReference,
					componentId: oAppComponent.getId(),
					manifest: {},
					componentData: {}
				}).then(SmartVariantManagementApplyAPI.loadVariants.bind(undefined, {
					control: oControl,
					standardVariant: {
						name: "sStandardVariantTitle"
					},
					variants: aVariants
				})).then(function () {
					testData.updateVariantPropertyBag.control = oControl;
					return SmartVariantManagementWriteAPI.updateVariant(testData.updateVariantPropertyBag);
				}).then(function (oVariant) {
					assert.equal(oVariant.getChanges().length, 1, "one change was added");
					var oChange = oVariant.getChanges()[0];
					assert.equal(oChange.getLayer(), testData.expected.layer, "the layer is set correct");
					assert.equal(oChange.getDefinition().changeType, "updateVariant", "changeType ist updateVariant");
					assert.deepEqual(oChange.getDefinition().content, testData.expected.changeContent, "change content ist updateVariant");
					var oVariantDefinition = oVariant.getDefinition();
					assert.equal(oVariant.getFavorite(), testData.expected.favorite, "the favorite flag flag is set correct");
					assert.equal(oVariantDefinition.favorite, testData.expected.definition.favorite, "and the definition.favorite flag is correct");
					assert.equal(oVariant.getExecuteOnSelection(), testData.expected.executeOnSelection, "the executeOnSelection flag is set correct");
					assert.equal(oVariantDefinition.executeOnSelection, testData.expected.definition.executeOnSelection, "and the definition.executeOnSelection flag is correct");
					assert.deepEqual(oVariant.getContexts(), testData.expected.contexts, "the contexts section is set correct");
					assert.deepEqual(oVariantDefinition.contexts, testData.expected.definition.contexts, "the definition.contexts section is correct");
					// also test the name in case it is part of the update
					if (testData.updateVariantPropertyBag.name) {
						assert.equal(oVariant.getName(), testData.expected.name, "the name is set correct");
						assert.deepEqual(oChange.getText("variantName"), testData.expected.changeTextsVariantName, "the change has the name set correct in the texts section");
					}
					assert.equal(oVariantDefinition.texts.variantName.value, "A variant", "the name in the definition is unchanged");
				});
			});
		});

		[{
			details: "a new name for a variant",
			propertyBag: {
				id: "test_variant",
				name: "a new name"
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "a new name",
				content: {},
				favorite: false,
				executeOnSelection: false
			}
		}, {
			details: "a new content",
			propertyBag: {
				id: "test_variant",
				content: {
					someProperty: "someValue"
				}
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					someOld: "content"
				},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someProperty: "someValue"
				},
				executeOnSelection: false,
				favorite: false
			}
		}, {
			details: "a new executeOnSelection flag",
			propertyBag: {
				id: "test_variant",
				executeOnSelection: true
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					someOld: "content"
				},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someOld: "content"
				},
				executeOnSelection: true,
				favorite: false
			}
		}, {
			details: "a new favorite flag",
			propertyBag: {
				id: "test_variant",
				favorite: true
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					someOld: "content"
				},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someOld: "content"
				},
				executeOnSelection: false,
				favorite: true
			}
		}, {
			details: "a new executeOnSelection flag overwriting an old one",
			propertyBag: {
				id: "test_variant",
				executeOnSelection: true
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					someOld: "content",
					executeOnSelection: false
				},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someOld: "content"
				},
				executeOnSelection: true,
				favorite: false
			}
		}, {
			details: "a new favorite flag overwriting an old one",
			propertyBag: {
				id: "test_variant",
				favorite: true
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					someOld: "content"
				},
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someOld: "content"
				},
				executeOnSelection: false,
				favorite: true
			}
		}, {
			details: "a new content and existing flags for executeOnSelection and favorite",
			propertyBag: {
				id: "test_variant",
				content: {
					someProperty: "someValue"
				}
			},
			mockedVariant: {
				fileName: "test_variant",
				layer: Layer.CUSTOMER,
				selector: {
					persistencyKey: sPersistencyKey
				},
				content: {
					executeOnSelection: true
				},
				favorite: false,
				texts: {
					variantName: {
						value: ""
					}
				}
			},
			expected: {
				name: "",
				content: {
					someProperty: "someValue"
				},
				executeOnSelection: true,
				favorite: false
			}
		}].forEach(function (testData) {
			QUnit.test("When updateVariant is called with " + testData.details, function (assert) {
				var sReference = "an.app";
				testData.propertyBag.reference = sReference;
				testData.propertyBag.persistencyKey = sPersistencyKey;
				sandbox.stub(InitialStorage, "loadFlexData").resolves({
					changes: [],
					comp: {
						variants: [testData.mockedVariant],
						changes: [],
						standardVariants: [],
						defaultVariants: []
					}
				});

				return FlexState.clearAndInitialize({
					reference: sReference,
					componentId: "__component0",
					manifest: {},
					componentData: {}
				}).then(function () {
					SmartVariantManagementWriteAPI.updateVariant(testData.propertyBag);

					var oVariant = FlexState.getCompEntitiesByIdMap(sReference)[testData.propertyBag.id];

					assert.equal(oVariant.getText("variantName"), testData.expected.name, "the name is correct");
					assert.deepEqual(oVariant.getContent(), testData.expected.content, "the content is correct");
					assert.equal(oVariant.getFavorite(), testData.expected.favorite, "the favorite flag is correct");
					assert.equal(oVariant.getExecuteOnSelection(), testData.expected.executeOnSelection, "the executeOnSelection flag is correct");
					assert.equal(oVariant.getState(), Change.states.DIRTY, "the variant is marked for an update");
				});
			});
		});

		QUnit.test("When isVariantSharingEnabled() is called it calls the Settings instance and returns true", function (assert) {
			var oSetting = {
				isKeyUser: true,
				isAtoAvailable: true,
				isVariantSharingEnabled: true
			};

			sandbox.stub(WriteStorage, "loadFeatures").resolves(oSetting);

			var isVariantSharingEnabledSpy = sandbox.spy(SmartVariantManagementWriteAPI, "isVariantSharingEnabled");
			return SmartVariantManagementWriteAPI.isVariantSharingEnabled().then(function (bFlag) {
				assert.equal(bFlag, true, "the true flag is returned");
				assert.equal(isVariantSharingEnabledSpy.callCount, 1, "called once");
			});
		});

		QUnit.test("When isVariantSharingEnabled() is called it calls the Settings instance and returns false", function (assert) {
			var oSetting = {
				isKeyUser: false,
				isAtoAvailable: true,
				isVariantSharingEnabled: false
			};

			sandbox.stub(WriteStorage, "loadFeatures").resolves(oSetting);

			var isVariantSharingEnabledSpy = sandbox.spy(SmartVariantManagementWriteAPI, "isVariantSharingEnabled");
			return SmartVariantManagementWriteAPI.isVariantSharingEnabled().then(function (bFlag) {
				assert.equal(bFlag, false, "the false flag is returned");
				assert.equal(isVariantSharingEnabledSpy.callCount, 1, "called once");
			});
		});

		QUnit.test("When isVariantPersonalizationEnabled() is called it calls the Settings instance and returns true", function (assert) {
			var oSetting = {
				isVariantPersonalizationEnabled: true
			};

			sandbox.stub(WriteStorage, "loadFeatures").resolves(oSetting);

			var isVariantPersonalizationEnabledSpy = sandbox.spy(SmartVariantManagementWriteAPI, "isVariantPersonalizationEnabled");
			return SmartVariantManagementWriteAPI.isVariantPersonalizationEnabled().then(function (bFlag) {
				assert.equal(bFlag, true, "the true flag is returned");
				assert.equal(isVariantPersonalizationEnabledSpy.callCount, 1, "called once");
			});
		});

		QUnit.test("When isVariantPersonalizationEnabled() is called it calls the Settings instance and returns false", function (assert) {
			var oSetting = {
				isVariantPersonalizationEnabled: false
			};

			sandbox.stub(WriteStorage, "loadFeatures").resolves(oSetting);

			var isVariantPersonalizationEnabledSpy = sandbox.spy(SmartVariantManagementWriteAPI, "isVariantPersonalizationEnabled");
			return SmartVariantManagementWriteAPI.isVariantPersonalizationEnabled().then(function (bFlag) {
				assert.equal(bFlag, false, "the false flag is returned");
				assert.equal(isVariantPersonalizationEnabledSpy.callCount, 1, "called once");
			});
		});
	});

	QUnit.module("revert", {
		before: function() {
		},
		afterEach: function() {
		},
		after: function () {
		}
	}, function() {
		QUnit.test("Given a variant was removed", function(assert) {
			var sReference = "an.app";
			var sPersistencyKey = "persistency.key";
			sandbox.stub(InitialStorage, "loadFlexData").resolves({
				changes: [],
				comp: {
					variants: [{
						fileName: "test_variant",
						selector: {
							persistencyKey: sPersistencyKey
						},
						content: {
							executeOnSelection: true,
							favorite: false
						},
						texts: {
							variantName: {
								value: ""
							}
						}
					}],
					changes: [],
					standardVariants: [],
					defaultVariants: []
				}
			});

			return FlexState.clearAndInitialize({
				reference: sReference,
				componentId: "__component0",
				manifest: {},
				componentData: {}
			}).then(function () {
				return SmartVariantManagementWriteAPI.removeVariant({
					reference: sReference,
					persistencyKey: sPersistencyKey,
					id: "test_variant"
				});
			}).then(function (oRemovedVariant) {
				assert.equal(oRemovedVariant.getState(), Change.states.DELETED, "the variant is flagged for deletion");
				var aRevertData = oRemovedVariant.getRevertInfo();
				assert.equal(aRevertData.length, 1, "revertData was stored");
				var oLastRevertData = aRevertData[0];
				assert.equal(oLastRevertData.getType(), CompVariantState.operationType.StateUpdate, "it is stored that the state was updated ...");
				assert.deepEqual(oLastRevertData.getContent(), {previousState: Change.states.PERSISTED}, "... to PERSISTED");

				SmartVariantManagementWriteAPI.revert({
					reference: sReference,
					persistencyKey: sPersistencyKey,
					id: "test_variant"
				});

				aRevertData = oRemovedVariant.getRevertInfo();
				assert.equal(aRevertData.length, 0, "after a revert... the revert data is no longer available");
				assert.equal(oRemovedVariant.getState(), Change.states.PERSISTED, "and the change is flagged as new");
			});
		});
	});

	QUnit.done(function () {
		jQuery('#qunit-fixture').hide();
	});
});