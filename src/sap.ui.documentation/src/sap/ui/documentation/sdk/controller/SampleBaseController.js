/*!
 * ${copyright}
 */

/*global location, XMLHttpRequest, Uint8Array */
sap.ui.define([
	"sap/ui/documentation/sdk/controller/BaseController",
	"sap/ui/thirdparty/URI",
	"sap/base/Log",
	"sap/ui/documentation/sdk/controller/util/ResourceDownloadUtil"
], function (BaseController, URI, Log, ResourceDownloadUtil) {
	"use strict";

		var TMPL_REF = sap.ui.require.toUrl("sap/ui/documentation/sdk/tmpl"),
			MOCK_DATA_REF = sap.ui.require.toUrl("sap/ui/demo/mock");

	return BaseController.extend("sap.ui.documentation.sdk.controller.SampleBaseController", {
		_aMockFiles: ["products.json", "supplier.json", "img.json"],

		fetchSourceFile: function (sUrl, bTreatAsText) {
			return ResourceDownloadUtil.fetch(sUrl, bTreatAsText).catch(function (e) {
				Log.warning(e);
				return "File not loaded"; // substitute content to display in the editor
			});
		},
		onDownload: function () {
			sap.ui.require([
				"sap/ui/thirdparty/jszip",
				"sap/ui/core/util/File"
			], function (JSZip, File) {
				var oZipFile = new JSZip(),
					sRef = sap.ui.require.toUrl((this._sId).replace(/\./g, "/")),
					oData = this.oModel.getData(),
					aExtraFiles = oData.includeInDownload || [],
					bHasManifest,
					aPromises = [],
					fnAddMockFileToZip = function(sRawFile) {
						var aMockFilePromises = [];
						for (var j = 0; j < this._aMockFiles.length; j++) {
							var sMockFileName = this._aMockFiles[j];
							if ((typeof sRawFile === "string") && sRawFile.indexOf(sMockFileName) > -1) {
								aMockFilePromises.push(this._addFileToZip({
									name: "mockdata/" + sMockFileName,
									url: MOCK_DATA_REF + "/" + sMockFileName,
									formatter: this._formatMockFile
								}, oZipFile));
							}
						}
						return Promise.all(aMockFilePromises);
					};

				// zip files
				for (var i = 0; i < oData.files.length; i++) {
					var oFile = oData.files[i],
						sUrl = sRef + "/" + oFile.name,
					// change the bootstrap URL to the current server for all HTML files of the sample
					bChangeBootstrap = oFile.name && (oFile.name === oData.iframe || oFile.name.split(".").pop() === "html");
					aPromises.push(this._addFileToZip({
						name: oFile.name,
						url: sUrl,
						formatter:  bChangeBootstrap ? this._changeIframeBootstrapToCloud : undefined
					}, oZipFile));

					aPromises.push(this.fetchSourceFile(sUrl).then(fnAddMockFileToZip.bind(this)));
				}

				// iframe examples have a separate index file and a component file to describe it
				if (!oData.iframe) {
					bHasManifest = oData.files.some(function (oFile) {
						return oFile.name === "manifest.json";
					});


					aPromises.push(this._addFileToZip({
						name: "Component.js",
						url: sRef + "/" + "Component.js"
					}, oZipFile));


					aPromises.push(this._addFileToZip({
						name: "index.html",
						url: TMPL_REF + "/" + (bHasManifest ? "indexevo.html.tmpl" : "index.html.tmpl"),
						formatter: function(sIndexFile) {
							return this._changeIframeBootstrapToCloud(this._formatIndexHtmlFile(sIndexFile, oData));
						}.bind(this)
					}, oZipFile, true));


					if (!bHasManifest) {
						aPromises.push(this._addFileToZip({
							name: "index.js",
							url: TMPL_REF + "/" + "index.js.tmpl",
							formatter: function(sIndexJsFile) {
								return this._changeIframeBootstrapToCloud(this._formatIndexJsFile(sIndexJsFile, oData));
							}.bind(this)
						}, oZipFile, true));
					}
				}


				// add extra download files
				aExtraFiles.forEach(function (sFileName) {
					aPromises.push(this._addFileToZip({
						name: sFileName,
						url: sRef + "/" + sFileName
					}, oZipFile));
				});


				// add generic license file
				aPromises.push(this._addFileToZip({
					name: "LICENSE.txt",
					url: "LICENSE.txt" // fetch from root level of UI5
				}, oZipFile));


				Promise.all(aPromises).then(function() {
					var oContent = oZipFile.generate({ type: "blob" });

					// save and open generated file
					this._openGeneratedFile(oContent, this._sId);
				}.bind(this));
			}.bind(this));
		},

		_openGeneratedFile : function(oContent, sId) {
			sap.ui.require([
				"sap/ui/core/util/File"
			], function(File) {
				File.save(oContent, sId, "zip", "application/zip");
			});
		},

		_addFileToZip: function  (oFileInfo, oZipFile, bTreatAsText) {
			var sFileName = oFileInfo.name,
				sUrl = oFileInfo.url,
				fnFileFormatter = oFileInfo.formatter;

			return this.fetchSourceFile(sUrl, bTreatAsText)
				.then(function(vRawFile) {
					if (vRawFile === "File not loaded") {
						return; // ignore 404 responses, e.g. for Apache license text file in SAPUI5 environment
					}
					if (fnFileFormatter) {
						vRawFile = fnFileFormatter(vRawFile);
					}
					oZipFile.file(sFileName, vRawFile);
				});
		},

		_formatIndexHtmlFile: function (sFile, oData) {

			return sFile.replace(/{{TITLE}}/g, oData.name)
				.replace(/{{SAMPLE_ID}}/g, oData.id);
		},

		_formatIndexJsFile: function (sFile, oData) {
			return sFile.replace(/{{TITLE}}/g, oData.name)
				.replace(/{{SAMPLE_ID}}/g, oData.id)
				.replace(/{{HEIGHT}}/g, oData.stretch ? 'height : "100%", ' : "")
				.replace(/{{SCROLLING}}/g, !oData.stretch);
		},

		_formatMockFile: function (sMockData) {
			var sWrongPath = "test-resources/sap/ui/documentation/sdk/images/",
				sCorrectPath = "https://openui5.hana.ondemand.com/test-resources/sap/ui/documentation/sdk/images/",
				oRegExp = new RegExp(sWrongPath, "g");

			return sMockData.replace(oRegExp, sCorrectPath);
		},

		_changeIframeBootstrapToCloud: function (sRawIndexFileHtml) {
			var rReplaceIndex = /src=(?:"[^"]*\/sap-ui-core\.js"|'[^']*\/sap-ui-core\.js')/,
				oCurrentURI = new URI(document.baseURI).search(""),
				oRelativeBootstrapURI = new URI(sap.ui.require.toUrl("") + "/sap-ui-core.js"),
				sBootstrapURI = oRelativeBootstrapURI.absoluteTo(oCurrentURI).toString();

			// replace the bootstrap path of the sample with the current to the core
			return sRawIndexFileHtml.replace(rReplaceIndex, 'src="' + sBootstrapURI + '"');
		}
	});
}
);