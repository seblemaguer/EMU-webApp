'use strict';

angular.module('emuwebApp')
	.controller('MainCtrl', function ($scope, $rootScope, $modal, $log, $compile, $timeout, $q, $window, $document, $location,
		viewState, HistoryService, Iohandlerservice, Soundhandlerservice, ConfigProviderService, fontScaleService, Ssffdataservice, Levelservice, dialogService, Textgridparserservice, Espsparserservice, Binarydatamaniphelper, Wavparserservice, Ssffparserservice, Drawhelperservice, Validationservice, Appcachehandler) {

		// hook up services to use abbreviated forms
		$scope.cps = ConfigProviderService;
		$scope.hists = HistoryService;
		$scope.fontImage = fontScaleService;
		$scope.levServ = Levelservice;
		$scope.vs = viewState;
		$scope.dials = dialogService;
		$scope.ssffds = Ssffdataservice;
		$scope.shs = Soundhandlerservice;
		$scope.dhs = Drawhelperservice;
		$scope.wps = Wavparserservice;
		$scope.io = Iohandlerservice;
		$scope.ach = Appcachehandler;

		// init vars
		$scope.connectBtnLabel = 'connect';
		$scope.tmp = {};

		$scope.dbLoaded = false;
		$scope.is2dCancasesHidden = true;

		$scope.lastkeycode = 'N/A';
		$scope.bundleList = [];

		$scope.curUserName = '';
		$scope.curBndl = {};

		$scope.lastclickedutt = null;
		$scope.shortcut = null;
		$scope.filterText = '';
		$scope.windowWidth = $window.outerWidth;

		$scope.demoDbName = '';

		// check for new version
		$scope.ach.checkForNewVersion();

		//////////////
		// bindings

		// bind window resize event
		angular.element($window).bind('resize', function () {
			viewState.deleteEditArea();
			viewState.setWindowWidth($window.outerWidth);
			$scope.$digest();
		});

		// bind shift/alt keyups for history
		angular.element($window).bind('keyup', function (e) {
			if (e.keyCode === ConfigProviderService.vals.keyMappings.shift || e.keyCode === ConfigProviderService.vals.keyMappings.alt) {
				HistoryService.addCurChangeObjToUndoStack();
				$scope.$digest();
			}
		});

		// Take care of preventing navigation out of app (only if something is loaded, not in embedded mode and not developing (auto connecting))
		window.onbeforeunload = function () {
			if (ConfigProviderService.embeddedVals.audioGetUrl === '' && $scope.bundleList.length > 0 && !ConfigProviderService.vals.main.autoConnect) {
				return 'Do you really wish to leave/reload the EMU-webApp? All unsaved changes will be lost...';
			}
		};

		//////////////
		// watches
		// watch if embedded override (if attributes are set on emuwebapp tag)
		// $scope.$watch('cps.embeddedVals.audioGetUrl', function (val) {
		// 	if (val !== undefined && val !== '') {
		// 		// check if both are set
		// 		$scope.loadFilesForEmbeddedApp();
		// 	}

		// }, true);

		//
		//////////////

		// check if URL parameters are set -> if so set embedded flags!
		var searchObject = $location.search();
		if (searchObject['audioGetUrl'] && searchObject['labelGetUrl'] && searchObject['labelType']) {
			ConfigProviderService.embeddedVals.audioGetUrl = searchObject.audioGetUrl;
			ConfigProviderService.embeddedVals.labelGetUrl = searchObject.labelGetUrl;
			ConfigProviderService.embeddedVals.labelType = searchObject.labelType;
			ConfigProviderService.embeddedVals.fromUrlParams = true;
		};

		/**
		 *
		 */
		$scope.loadFilesForEmbeddedApp = function () {
			if (ConfigProviderService.embeddedVals.audioGetUrl) {
				Iohandlerservice.httpGetPath(ConfigProviderService.embeddedVals.audioGetUrl, 'arraybuffer').then(function (data) {
					viewState.showDropZone = false;

					// set bundle name
					var tmp = ConfigProviderService.embeddedVals.audioGetUrl;
					$scope.curBndl.name = tmp.substr(0, tmp.lastIndexOf('.')).substr(tmp.lastIndexOf('/') + 1, tmp.length);

					//hide menu
					if (viewState.getsubmenuOpen()) {
						$scope.openSubmenu();
					}

					viewState.somethingInProgressTxt = 'Loading DB config...';
					// then get the DBconfigFile
					Iohandlerservice.httpGetPath('configFiles/embedded_emuwebappConfig.json').then(function (resp) {
						// first element of perspectives is default perspective
						viewState.curPerspectiveIdx = 0;
						ConfigProviderService.setVals(resp.data.EMUwebAppConfig);
						// validate emuwebappConfigSchema
						delete resp.data.EMUwebAppConfig; // delete to avoid duplicate
						var validRes = Validationservice.validateJSO('emuwebappConfigSchema', ConfigProviderService.vals);
						if (validRes === true) {
							// turn of keybinding only on mouseover
							if (ConfigProviderService.embeddedVals.fromUrlParams) {
								ConfigProviderService.vals.main.catchMouseForKeyBinding = false;
							}
							ConfigProviderService.curDbConfig = resp.data;
							// validate DBconfigFileSchema!
							validRes = Validationservice.validateJSO('DBconfigFileSchema', ConfigProviderService.curDbConfig);

							if (validRes === true) {
								// set wav file
								viewState.somethingInProgress = true;
								viewState.somethingInProgressTxt = 'Parsing WAV file...';

								Wavparserservice.parseWavArrBuf(data.data).then(function (messWavParser) {
									var wavJSO = messWavParser;
									viewState.curViewPort.sS = 0;
									viewState.curViewPort.eS = wavJSO.Data.length;
									viewState.resetSelect();
									Soundhandlerservice.wavJSO = wavJSO;

									// get + parse file
									Iohandlerservice.httpGetPath(ConfigProviderService.embeddedVals.labelGetUrl, 'utf-8').then(function (data2) {
										viewState.somethingInProgressTxt = 'Parsing ' + ConfigProviderService.embeddedVals.labelType + ' file...';
										Iohandlerservice.parseLabelFile(data2.data, ConfigProviderService.embeddedVals.labelGetUrl, 'embeddedTextGrid', ConfigProviderService.embeddedVals.labelType).then(function (parseMess) {

											var annot = parseMess.data;
											Levelservice.setData(annot);

											var lNames = [];
											annot.levels.forEach(function (l) {
												lNames.push(l.name);
											});

											ConfigProviderService.vals.perspectives[viewState.curPerspectiveIdx].levelCanvases.order = lNames;
											viewState.somethingInProgressTxt = 'Done!';
											viewState.somethingInProgress = false;
											viewState.setState('labeling');
											// close submenu... 
											// $scope.openSubmenu();

										}, function (errMess) {
											dialogService.open('views/error.html', 'ModalCtrl', 'Error parsing wav file: ' + errMess.status.message);
										});

									}, function (errMess) {
										dialogService.open('views/error.html', 'ModalCtrl', 'Could not get label file: ' + ConfigProviderService.embeddedVals.labelGetUrl + ' ERROR ' + JSON.stringify(errMess, null, 4));
									});


								}, function (errMess) {
									dialogService.open('views/error.html', 'ModalCtrl', 'Error parsing wav file: ' + errMess.status.message);
								});

							} else {
								dialogService.open('views/error.html', 'ModalCtrl', 'Error validating DBconfig: ' + JSON.stringify(validRes, null, 4));
							}
						} else {
							dialogService.open('views/error.html', 'ModalCtrl', 'Error validating ConfigProviderService.vals (emuwebappConfig data) after applying changes of newly loaded config (most likely due to wrong entry...): ' + JSON.stringify(validRes, null, 4));
						}

					}, function (errMess) {
						dialogService.open('views/error.html', 'ModalCtrl', 'Could not get embedded_config.json: ' + errMess);
					});
				}, function (errMess) {
					dialogService.open('views/error.html', 'ModalCtrl', 'Could not get audio file:' + ConfigProviderService.embeddedVals.audioGetUrl + ' ERROR: ' + JSON.stringify(errMess, null, 4));
				});
			}
		};

		/**
		 * init load of config files
		 */
		$scope.loadDefaultConfig = function () {
			viewState.somethingInProgress = true;
			viewState.somethingInProgressTxt = 'Loading schema files';
			// load schemas first
			Validationservice.loadSchemas().then(function (replies) {
				Validationservice.setSchemas(replies);
				Iohandlerservice.httpGetDefaultConfig().success(function (data) {
					viewState.somethingInProgressTxt = 'Validating emuwebappConfig';
					var validRes = Validationservice.validateJSO('emuwebappConfigSchema', data);
					if (validRes === true) {
						ConfigProviderService.setVals(data);
						$scope.handleDefaultConfigLoaded();
						// loadFilesForEmbeddedApp if these are set 
						$scope.loadFilesForEmbeddedApp();
						viewState.somethingInProgress = false;
					} else {
						dialogService.open('views/error.html', 'ModalCtrl', 'Error validating emuwebappConfigSchema: ' + JSON.stringify(validRes, null, 4)).then(function () {
							$scope.resetToInitState();
						});
					}

				}).error(function (data, status, header, config) {
					dialogService.open('views/error.html', 'ModalCtrl', 'Could not get defaultConfig for EMU-webApp: ' + ' status: ' + status + ' header: ' + header + ' config ' + config).then(function () {
						$scope.resetToInitState();
					});
				});
			}, function (errMess) {
				dialogService.open('views/error.html', 'ModalCtrl', 'Error loading schema file: ' + JSON.stringify(errMess, null, 4)).then(function () {
					$scope.resetToInitState();
				});
			});
		};

		// call function on init
		$scope.loadDefaultConfig();

		/**
		 * function called after default config was loaded
		 */
		$scope.handleDefaultConfigLoaded = function () {

			if (!viewState.getsubmenuOpen()) {
				$scope.openSubmenu();
			}
			// FOR DEVELOPMENT:
			// $scope.openDemoDBbtnClick('ae');
			// $scope.aboutBtnClick();

			$scope.shortcut = Object.create(ConfigProviderService.vals.keyMappings);

			// convert int values to char for front end
			for (var i in $scope.shortcut) {
				// sonderzeichen space
				if ($scope.shortcut[i] === 8) {
					$scope.shortcut[i] = 'BACKSPACE';
				} else if ($scope.shortcut[i] === 9) {
					$scope.shortcut[i] = 'TAB';
				} else if ($scope.shortcut[i] === 13) {
					$scope.shortcut[i] = 'ENTER';
				} else if ($scope.shortcut[i] === 16) {
					$scope.shortcut[i] = 'SHIFT';
				} else if ($scope.shortcut[i] === 18) {
					$scope.shortcut[i] = 'ALT';
				} else if ($scope.shortcut[i] === 27) {
					$scope.shortcut[i] = 'ESC';
				} else if ($scope.shortcut[i] === 32) {
					$scope.shortcut[i] = 'SPACE';
				} else if ($scope.shortcut[i] === -1) {
					$scope.shortcut[i] = 'NONE';
				} else if ($scope.shortcut[i] === 38) {
					$scope.shortcut[i] = 'ARROW UP';
				} else if ($scope.shortcut[i] === 40) {
					$scope.shortcut[i] = 'ARROW DOWN';
				} else if ($scope.shortcut[i] === 187) {
					$scope.shortcut[i] = '+';
				} else if ($scope.shortcut[i] === 189) {
					$scope.shortcut[i] = '-';
				} else {
					$scope.shortcut[i.toString()] = String.fromCharCode($scope.shortcut[i]);

				}
			}

			if (ConfigProviderService.vals.main.autoConnect) {
				Iohandlerservice.wsH.initConnect(ConfigProviderService.vals.main.serverUrl).then(function (message) {
					if (message.type === 'error') {
						dialogService.open('views/error.html', 'ModalCtrl', 'Could not connect to websocket server: ' + ConfigProviderService.vals.main.defaultServerUrl);
					} else {
						$scope.handleConnectedToWSserver();
					}
				});
			}

			// init loading of files for testing
			viewState.setspectroSettings(ConfigProviderService.vals.spectrogramSettings.N,
				ConfigProviderService.vals.spectrogramSettings.rangeFrom,
				ConfigProviderService.vals.spectrogramSettings.rangeTo,
				ConfigProviderService.vals.spectrogramSettings.dynamicRange,
				ConfigProviderService.vals.spectrogramSettings.window);

			// setting transition values
			viewState.setTransitionTime(ConfigProviderService.vals.colors.transitionTime / 1000);

		};

		/**
		 * function is called after websocket connection
		 * has been established. It executes the protocol
		 * and loads the first bundle in the bundle list (= default behavior).
		 */
		$scope.handleConnectedToWSserver = function () {
			// hide drop zone 
			viewState.showDropZone = false;
			ConfigProviderService.vals.main.comMode = 'WS';

			viewState.somethingInProgress = true;
			viewState.somethingInProgressTxt = 'Checking protocol...';
			// Check if server speaks the same protocol
			Iohandlerservice.getProtocol().then(function (res) {
				if (res.protocol === 'EMU-webApp-websocket-protocol' && res.version === '0.0.1') {
					viewState.somethingInProgressTxt = 'Checking user management...';
					// then ask if server does user management
					Iohandlerservice.getDoUserManagement().then(function (doUsrData) {
						if (doUsrData === 'NO') {
							$scope.innerHandleConnectedToWSserver();
						} else {
							// show user management error 
							dialogService.open('views/loginModal.html', 'LoginCtrl').then(function (res) {
								if (res) {
									$scope.innerHandleConnectedToWSserver();
								} else {
									$scope.resetToInitState();
								}
							});
						}
					});
				} else {
					// show protocol error and disconnect from server
					dialogService.open('views/error.html', 'ModalCtrl', 'Could not connect to websocket server: ' + ConfigProviderService.vals.main.serverUrl + '. It does not speak the same protocol as this client. Its protocol answer was: "' + res.protocol + '" with the version: "' + res.version + '"').then(function () {
						$scope.resetToInitState();
					});
				}
			});
		};

		/**
		 * to avoid redundant code...
		 */
		$scope.innerHandleConnectedToWSserver = function () {
			viewState.somethingInProgressTxt = 'Loading DB config...';
			// then get the DBconfigFile
			Iohandlerservice.getDBconfigFile().then(function (data) {
				// first element of perspectives is default perspective
				viewState.curPerspectiveIdx = 0;
				ConfigProviderService.setVals(data.EMUwebAppConfig);
				delete data.EMUwebAppConfig; // delete to avoid duplicate
				var validRes = Validationservice.validateJSO('emuwebappConfigSchema', ConfigProviderService.vals);
				if (validRes === true) {
					ConfigProviderService.curDbConfig = data;
					validRes = Validationservice.validateJSO('DBconfigFileSchema', data);
					if (validRes === true) {
						// then get the DBconfigFile
						viewState.somethingInProgressTxt = 'Loading bundle list...';
						Iohandlerservice.getBundleList().then(function (bdata) {
							$scope.bundleList = bdata;
							// then load first bundle in list
							$scope.menuBundleClick($scope.bundleList[0]);
						});

					} else {
						dialogService.open('views/error.html', 'ModalCtrl', 'Error validating DBconfig: ' + JSON.stringify(validRes, null, 4)).then(function () {
							$scope.resetToInitState();
						});
					}

				} else {
					dialogService.open('views/error.html', 'ModalCtrl', 'Error validating ConfigProviderService.vals (emuwebappConfig data) after applying changes of newly loaded config (most likely due to wrong entry...): ' + JSON.stringify(validRes, null, 4)).then(function () {
						$scope.resetToInitState();
					});
				}
			});
		};

		/**
		 *
		 */
		$scope.downloadTextGrid = function () {
			console.log(Iohandlerservice.toTextGrid());
		};

		/**
		 *
		 */
		$scope.getShortCut = function (name) {
			if ($scope.shortcut !== null) {
				if ($scope.shortcut[name] !== null) {
					if ($scope.shortcut[name] !== '') {
						return $scope.shortcut[name];
					} else {
						return 'NONE';
					}
				} else {
					return 'NONE';
				}
			} else {
				return 'NOT SET';
			}
		};

		/**
		 * Handle click on bundle in side menu. It is
		 * also used as a general loadBundle method.
		 * @param bndl object containing name attribute of currently loaded bundle
		 */
		$scope.menuBundleClick = function (bndl) {

			// check if bndl has to be saved
			if ((HistoryService.movesAwayFromLastSave !== 0 && ConfigProviderService.vals.main.comMode !== 'DEMO')) {
				if (bndl !== $scope.curBndl) {
					$scope.lastclickedutt = bndl;
					dialogService.open('views/saveChanges.html', 'ModalCtrl', bndl.name).then(function (messModal) {
						if (messModal === 'saveChanges') {
							// save current bundle
							$scope.menuBundleSaveBtnClick().then(function () {
								// load new bundle
								$scope.menuBundleClick(bndl);
							});
						} else if (messModal === 'discardChanges') {
							// reset history
							HistoryService.resetToInitState();
							// load new bundle
							$scope.menuBundleClick(bndl);
						}
					});
				}
			} else {
				if (bndl !== $scope.curBndl) {
					// reset history
					HistoryService.resetToInitState();
					// set state
					viewState.setState('loadingSaving');

					viewState.somethingInProgress = true;
					viewState.somethingInProgressTxt = 'Loading bundle: ' + bndl.name;
					// empty ssff files
					Ssffdataservice.data = [];
					Iohandlerservice.getBundle(bndl.name, $scope.demoDbName).then(function (bundleData) {
						// check if response from http request
						if (bundleData.status === 200) {
							bundleData = bundleData.data;
						}

						var arrBuff;

						// set wav file
						arrBuff = Binarydatamaniphelper.base64ToArrayBuffer(bundleData.mediaFile.data);
						viewState.somethingInProgressTxt = 'Parsing WAV file...';

						Wavparserservice.parseWavArrBuf(arrBuff).then(function (messWavParser) {
							var wavJSO = messWavParser;
							viewState.curViewPort.sS = 0;
							viewState.curViewPort.eS = wavJSO.Data.length;
							viewState.curViewPort.selectS = -1;
							viewState.curViewPort.selectE = -1;
							viewState.curClickSegments = [];
							viewState.curClickLevelName = undefined;
							viewState.curClickLevelType = undefined;

							// FOR DEVELOPMENT:
							// viewState.curViewPort.sS = 442204;
							// viewState.curViewPort.eS = 445464;
							viewState.resetSelect();
							Soundhandlerservice.wavJSO = wavJSO;

							// set all ssff files
							viewState.somethingInProgressTxt = 'Parsing SSFF files...';
							Ssffparserservice.asyncParseSsffArr(bundleData.ssffFiles).then(function (ssffJso) {
								Ssffdataservice.data = ssffJso.data;
								var validRes = Validationservice.validateJSO('annotationFileSchema', bundleData.annotation);
								if (validRes === true) {;
									// set annotation
									Levelservice.setData(bundleData.annotation);

									$scope.curBndl = bndl;
									viewState.setState('labeling');
									viewState.somethingInProgress = false;
									viewState.somethingInProgressTxt = 'Done!';
									// FOR DEVELOPMENT:
									// $scope.menuBundleSaveBtnClick(); // for testing save button
									$scope.showHierarchyBtnClick(); // for devel of showHierarchy modal
								} else {
									dialogService.open('views/error.html', 'ModalCtrl', 'Error validating annotation file: ' + JSON.stringify(validRes, null, 4)).then(function () {
										$scope.resetToInitState();
									});
								}
							}, function (errMess) {
								dialogService.open('views/error.html', 'ModalCtrl', 'Error parsing SSFF file: ' + errMess.status.message).then(function () {
									$scope.resetToInitState();
								});
							});
						}, function (errMess) {
							dialogService.open('views/error.html', 'ModalCtrl', 'Error parsing wav file: ' + errMess.status.message).then(function () {
								$scope.resetToInitState();
							});
						});

					}, function (errMess) {
						// check for http vs websocket response
						if (errMess.data) {
							dialogService.open('views/error.html', 'ModalCtrl', 'Error loading bundle: ' + errMess.data).then(function () {
								$scope.resetToInitState();
							});
						} else {
							dialogService.open('views/error.html', 'ModalCtrl', 'Error loading bundle: ' + errMess.status.message).then(function () {
								$scope.resetToInitState();
							});
						}
					});
				}
			}
		};


		/**
		 * Handle save bundle button click. The function is also used
		 * as a gerneral purpose save bundle function.
		 * @return promise that is resolved after completion (rejected on error)
		 */
		$scope.menuBundleSaveBtnClick = function () {
			// check if something has changed
			// if (HistoryService.movesAwayFromLastSave !== 0) { // Commented out FOR DEVELOPMENT!
			var defer = $q.defer();
			viewState.somethingInProgress = true;
			//create bundle json
			var bundleData = {};
			viewState.somethingInProgressTxt = 'Creating bundle json...';
			bundleData.ssffFiles = [];
			var formants = {};
			// ssffFiles (only FORMANTS are allowed to be manipulated so only this track is sent back to server)
			Ssffdataservice.data.forEach(function (el) {

				if (el.ssffTrackName === 'FORMANTS') {
					formants = el;
				}
			});

			if (!$.isEmptyObject(formants)) {
				Ssffparserservice.asyncJso2ssff(formants).then(function (messParser) {
					bundleData.ssffFiles.push({
						'ssffTrackName': formants.ssffTrackName,
						'encoding': 'BASE64',
						'data': Binarydatamaniphelper.arrayBufferToBase64(messParser.data)
					});
					$scope.getAnnotationAndSaveBndl(bundleData, defer);

				}, function (errMess) {
					dialogService.open('views/error.html', 'ModalCtrl', 'Error converting javascript object to ssff file: ' + errMess.status.message);
					defer.reject();
				});
			} else {
				$scope.getAnnotationAndSaveBndl(bundleData, defer);
			}

			return defer.promise;
			// } // Commented out FOR DEVELOPMENT!

		};


		/**
		 *
		 */
		$scope.getAnnotationAndSaveBndl = function (bundleData, defer) {
			// annotation
			bundleData.annotation = Levelservice.getData();
			viewState.somethingInProgressTxt = 'Saving bundle...';
			Iohandlerservice.saveBundle(bundleData).then(function () {
				viewState.somethingInProgressTxt = 'Done!';
				viewState.somethingInProgress = false;
				HistoryService.movesAwayFromLastSave = 0;
				defer.resolve();
			}, function (errMess) {
				// console.log(mess);
				dialogService.open('views/error.html', 'ModalCtrl', 'Error saving bundle: ' + errMess.status.message).then(function () {
					$scope.resetToInitState();
				});
				defer.reject();
			});
		};

		/**
		 *
		 */
		$scope.uttIsDisabled = function (bndl) {
			if (bndl.name === $scope.curBndl.name) {
				return false;
			} else {
				return true;
			}
		};

		/**
		 * returns jso with css defining color dependent
		 * on if changes have been made that have not been saved
		 * @param bndl object containing name attribute of bundle item
		 * requesting color
		 * @returns color as jso object used by ng-style
		 */
		$scope.getBndlColor = function (bndl) {
			var curColor;
			if (HistoryService.movesAwayFromLastSave !== 0) {
				curColor = {
					'background-color': '#f00',
					'color': 'white'
				};
			} else {
				curColor = {
					'background-color': '#999',
					'color': 'black'
				};
			}

			// console.log(bndl.name)
			if (bndl.name === $scope.curBndl.name) {
				return curColor;
			}
		};


		/**
		 *
		 */
		$scope.cursorInTextField = function () {
			viewState.focusInTextField = true;
		};

		/**
		 *
		 */
		$scope.cursorOutOfTextField = function () {
			viewState.focusInTextField = false;
		};

		/**
		 *
		 */
		$scope.openSubmenu = function () {
			if (viewState.getsubmenuOpen()) {
				viewState.setsubmenuOpen(false);
			} else {
				viewState.setsubmenuOpen(true);
			}
			$timeout($scope.refreshTimeline, ConfigProviderService.vals.colors.transitionTime);
		};

		$scope.refreshTimeline = function () {
			$scope.$broadcast('refreshTimeline');
		};


		/////////////////////////////////////////
		// handle button clicks

		// top menu:
		/**
		 *
		 */
		$scope.addLevelSegBtnClick = function () {
			if (viewState.getPermission('addLevelSegBtnClick')) {
				var newName, levelLength;
				if (Levelservice.data.levels === undefined) {
					newName = 'levelNr0';
					levelLength = 0;
				} else {
					newName = 'levelNr' + Levelservice.data.levels.length;
					levelLength = Levelservice.data.levels.length;
				}
				var level = {
					items: [{
						id: Levelservice.getNewId(),
						sampleStart: 0,
						sampleDur: Soundhandlerservice.wavJSO.Data.length,
						labels: [{
							name: newName,
							value: ConfigProviderService.vals.labelCanvasConfig.newSegmentName
						}]
					}],
					name: newName,
					type: 'SEGMENT'
				};
				Levelservice.addLevel(level, levelLength, viewState.curPerspectiveIdx);
				//  Add to history
				HistoryService.addObjToUndoStack({
					'type': 'ESPS',
					'action': 'addLevel',
					'level': level,
					'id': Levelservice.data.levels.length - 1,
					'curPerspectiveIdx': viewState.curPerspectiveIdx
				});

			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.addLevelPointBtnClick = function () {

			if (viewState.getPermission('addLevelPointBtnClick')) {

				var newName = 'levelNr' + Levelservice.data.levels.length;
				var level = {
					items: [{
						id: Levelservice.getNewId(),
						samplePoint: Soundhandlerservice.wavJSO.Data.length / 2,
						labels: [{
							name: newName,
							value: ConfigProviderService.vals.labelCanvasConfig.newEventName
						}]
					}],
					name: newName,
					type: 'EVENT'
				};
				Levelservice.addLevel(level, Levelservice.data.levels.length, viewState.curPerspectiveIdx);
				//  Add to history
				HistoryService.addObjToUndoStack({
					'type': 'ESPS',
					'action': 'addLevel',
					'level': level,
					'id': Levelservice.data.levels.length - 1,
					'curPerspectiveIdx': viewState.curPerspectiveIdx
				});

			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.renameSelLevelBtnClick = function () {
			if (viewState.getPermission('renameSelLevelBtnClick')) {
				if (viewState.getcurClickLevelName() !== undefined) {
					dialogService.open('views/renameLevel.html', 'ModalCtrl', viewState.getcurClickLevelName());
				} else {
					dialogService.open('views/error.html', 'ModalCtrl', 'Rename Error : Please choose a Level first !');
				}
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.downloadTextGridBtnClick = function () {
			if (viewState.getPermission('downloadTextGridBtnClick')) {
				Textgridparserservice.asyncToTextGrid().then(function (parseMess) {
					dialogService.openExport('views/export.html', 'ExportCtrl', parseMess.data, $scope.curBndl.name + '.TextGrid');
				});
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.spectSettingsBtnClick = function () {
			if (viewState.getPermission('spectSettingsChange')) {
				dialogService.open('views/spectroSettings.html', 'SpectsettingsCtrl', '');
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.connectBtnClick = function () {
			if (viewState.getPermission('connectBtnClick')) {
				dialogService.open('views/connectModal.html', 'WsconnectionCtrl').then(function (url) {
					if (url) {
						Iohandlerservice.wsH.initConnect(url).then(function (message) {
							if (message.type === 'error') {
								dialogService.open('views/error.html', 'ModalCtrl', 'Could not connect to websocket server: ' + url);
							} else {
								$scope.handleConnectedToWSserver();
							}
						});
					}
				});
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.openDemoDBbtnClick = function (nameOfDB) {
			if (viewState.getPermission('openDemoBtnDBclick')) {
				$scope.demoDbName = nameOfDB;
				// hide drop zone 
				viewState.showDropZone = false;

				viewState.somethingInProgress = true;
				// alert(nameOfDB);
				viewState.setState('loadingSaving');
				ConfigProviderService.vals.main.comMode = 'DEMO';
				viewState.somethingInProgressTxt = 'Loading DB config...';
				Iohandlerservice.getDBconfigFile(nameOfDB).then(function (res) {
					var data = res.data;
					// first element of perspectives is default perspective
					viewState.curPerspectiveIdx = 0;
					ConfigProviderService.setVals(data.EMUwebAppConfig);
					delete data.EMUwebAppConfig; // delete to avoid duplicate

					var validRes = Validationservice.validateJSO('emuwebappConfigSchema', ConfigProviderService.vals);
					if (validRes === true) {
						ConfigProviderService.curDbConfig = data;
						validRes = Validationservice.validateJSO('DBconfigFileSchema', ConfigProviderService.curDbConfig)

						if (validRes === true) {
							// then get the DBconfigFile
							viewState.somethingInProgressTxt = 'Loading bundle list...';

							Iohandlerservice.getBundleList(nameOfDB).then(function (res) {
								var bdata = res.data;
								$scope.bundleList = bdata;
								// then load first bundle in list
								$scope.menuBundleClick($scope.bundleList[0]);
							}, function (err) {
								dialogService.open('views/error.html', 'ModalCtrl', 'Error loading bundle list of ' + nameOfDB + ': ' + err.data + ' STATUS: ' + err.status).then(function () {
									$scope.resetToInitState();
								});
							});
						} else {
							dialogService.open('views/error.html', 'ModalCtrl', 'Error validating DBconfig: ' + JSON.stringify(validRes, null, 4)).then(function () {
								$scope.resetToInitState();
							});
						}


					} else {
						dialogService.open('views/error.html', 'ModalCtrl', 'Error validating ConfigProviderService.vals (emuwebappConfig data) after applying changes of newly loaded config (most likely due to wrong entry...): ' + JSON.stringify(validRes, null, 4)).then(function () {
							$scope.resetToInitState();
						});
					}

				}, function (err) {
					dialogService.open('views/error.html', 'ModalCtrl', 'Error loading DB config of ' + nameOfDB + ': ' + err.data + ' STATUS: ' + err.status).then(function () {
						$scope.resetToInitState();
					});
				});
			} //else {
			// 	console.log('action currently not allowed');
			// }
		};

		/**
		 *
		 */
		$scope.aboutBtnClick = function () {
			dialogService.open('views/about.html', 'AboutCtrl');
		};

		/**
		 *
		 */
		$scope.showHierarchyBtnClick = function () {
			dialogService.open('views/showHierarchyModal.html', 'ShowhierarchyCtrl');
		};

		/**
		 *
		 */
		$scope.clearBtnClick = function () {
			// viewState.setdragBarActive(false);
			var modalText;
			if ((HistoryService.movesAwayFromLastSave !== 0 && ConfigProviderService.vals.main.comMode !== 'DEMO')) {
				modalText = 'Do you wish to clear all loaded data and if connected disconnect from the server? CAUTION: YOU HAVE UNSAVED CHANGES! These will be lost if you confirm.'
			} else {
				modalText = 'Do you wish to clear all loaded data and if connected disconnect from the server? You have NO unsaved changes so no changes will be lost.'
			}
			dialogService.open('views/confirmModal.html', 'ConfirmmodalCtrl', modalText).then(function (res) {
				if (res) {
					$scope.resetToInitState();
				}
			});
		};

		/**
		 *
		 */
		$scope.resetToInitState = function () {
			if (Iohandlerservice.wsH.isConnected()) {
				Iohandlerservice.wsH.closeConnect();
			}
			$scope.curBndl = {};
			$scope.bundleList = [];
			Soundhandlerservice.wavJSO = {};
			Levelservice.data = {};
			Ssffdataservice.data = [];
			HistoryService.resetToInitState();
			viewState.setState('noDBorFilesloaded');
			$scope.$broadcast('resetToInitState');

			viewState.somethingInProgress = false;
			viewState.resetToInitState();

			viewState.showDropZone = true;
			$scope.loadDefaultConfig();


		};


		// bottom menu:

		/**
		 *
		 */
		$scope.cmdZoomAll = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea(); // SIC should be in service...
				viewState.setViewPort(0, Soundhandlerservice.wavJSO.Data.length);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdZoomIn = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea(); // SIC should be in service...
				viewState.zoomViewPort(true);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdZoomOut = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea();
				viewState.zoomViewPort(false);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdZoomLeft = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea();
				viewState.shiftViewPort(false);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdZoomRight = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea();
				viewState.shiftViewPort(true);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdZoomSel = function () {
			if (viewState.getPermission('zoom')) {
				viewState.deleteEditArea();
				viewState.setViewPort(viewState.curViewPort.selectS, viewState.curViewPort.selectE);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdPlayView = function () {
			if (viewState.getPermission('playaudio')) {
				Soundhandlerservice.playFromTo(viewState.curViewPort.sS, viewState.curViewPort.eS);
				viewState.animatePlayHead(viewState.curViewPort.sS, viewState.curViewPort.eS);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdPlaySel = function () {
			if (viewState.getPermission('playaudio')) {
				Soundhandlerservice.playFromTo(viewState.curViewPort.selectS, viewState.curViewPort.selectE);
				viewState.animatePlayHead(viewState.curViewPort.selectS, viewState.curViewPort.selectE);
			} else {
				console.log('action currently not allowed');
			}
		};

		/**
		 *
		 */
		$scope.cmdPlayAll = function () {
			if (viewState.getPermission('playaudio')) {
				Soundhandlerservice.playFromTo(0, Soundhandlerservice.wavJSO.Data.length);
				viewState.animatePlayHead(0, Soundhandlerservice.wavJSO.Data.length);
			} else {
				console.log('action currently not allowed');
			}
		};

		///////////////////////////
		// other

		/**
		 *
		 */
		$scope.setlastkeycode = function (c) {
			$scope.lastkeycode = c;
		};

		/**
		 * SIC should move into viewstate.rightSubmenuOpen variable
		 */
		$scope.toggleRightSideMenuHidden = function () {
			viewState.setRightsubmenuOpen(!viewState.getRightsubmenuOpen());
		};

		/**
		 * function used to change perspective
		 * @param persp json object of current perspective containing name attribute
		 */
		$scope.changePerspective = function (persp) {
			// viewState.somethingInProgress = true;
			// alert(nameOfDB);
			// viewState.somethingInProgressTxt = 'Changing perspective...';

			var newIdx;
			for (var i = 0; i < ConfigProviderService.vals.perspectives.length; i++) {
				if (persp.name === ConfigProviderService.vals.perspectives[i].name) {
					newIdx = i;
				}
			}
			viewState.curPerspectiveIdx = newIdx;
			// close submenu
			$scope.toggleRightSideMenuHidden();
			// viewState.somethingInProgressTxt = 'Done!';
			// viewState.somethingInProgress = false;
		};

		/**
		 * function used by right side menu to get color of current perspecitve in ul
		 * @param persp json object of current perspective containing name attribute
		 */
		$scope.getPerspectiveColor = function (persp) {
			var cl;
			if (viewState.curPerspectiveIdx === -1 || persp.name === ConfigProviderService.vals.perspectives[viewState.curPerspectiveIdx].name) {
				cl = 'emuwebapp-curSelPerspLi';
			} else {
				cl = 'emuwebapp-perspLi';
			}
			return cl;
		};

	});