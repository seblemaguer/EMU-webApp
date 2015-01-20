'use strict';

angular.module('emuwebApp')
	.controller('TabbedCtrl', function ($scope, viewState, ConfigProviderService, Validationservice) {

		$scope.cps = ConfigProviderService;
		$scope.valid = Validationservice;
		$scope.tabs = [{
				title: 'Level Definitions',
				url: 'views/tabbed/levelDefinition.html'
			}, {
				title: 'Link Definitions',
				url: 'views/tabbed/linkDefinition.html'
			}, {
				title: 'ssff Track Definitions',
				url: 'views/tabbed/ssffDefinition.html'
			}, {
				title: 'EMU-webApp',
				url: 'views/tabbed/emuDefinition.html'
			},{
				title: 'global DB',
				url: 'views/tabbed/globalDefinition.html'
		}];
		$scope.currentTab = 'views/tabbed/levelDefinition.html';
		// holds all possible level select values from config ie ITEM EVENT etc
		$scope.optionsLevelTypes = [];
		// holds all possible link select values from config ie ONE_TO_MANY etc
		$scope.optionsLinkTypes = [];
		// holds all possible level select values
		$scope.optionsLevels = [];
		// holds all possible attribute values from config ie STRING
		$scope.optionsLevelAttributes = [];
		// holds all level types of the current levels
		$scope.levelTypes = [];
		$scope.linkTypes = [];
		$scope.superLevel = [];
		$scope.subLevel = [];
		// holds all level names of the current levels
		$scope.levelNames = [];

		// holds all level attributes of the current levels
		$scope.levelAttributes = [];
		
		$scope.levelDefinitionProperties = {};
		$scope.linkDefinitionProperties = {};
		
		$scope.setup = function () {
		    
		    var i = 1;
		    // read db config file for enum types
		    var dbconfigFileSchema = $scope.valid.getSchema('DBconfigFileSchema');
		    $scope.levelDefinitionProperties = dbconfigFileSchema.data.properties.levelDefinitions.items.properties;
		    $scope.linkDefinitionProperties = dbconfigFileSchema.data.properties.linkDefinitions.items.properties;
		    
		    // set levelDefinitions.items.properties.type.enum array
			i = 1
			angular.forEach($scope.levelDefinitionProperties.type.enum, function (type) {
				$scope.optionsLevelTypes.push({ label: type, value: i });
				++i;
			});
			
		    // set linkDefinitions.items.properties.type.enum array
			i = 1
			angular.forEach($scope.linkDefinitionProperties.type.enum, function (type) {
				$scope.optionsLinkTypes.push({ label: type, value: i });
				++i;
			});		
			
			// set attributeDefinitions.items.properties.type.enum array
			i = 1
			angular.forEach($scope.levelDefinitionProperties.attributeDefinitions.items.properties.type.enum, function (type) {
				$scope.optionsLevelAttributes.push({ label: type, value: i });
				++i;
			});
				
			i = 1
		    // set linkDefinitions.items.properties.type.enum array
			angular.forEach($scope.cps.curDbConfig.levelDefinitions, function (definition) {
				$scope.optionsLevels.push({ label: definition.name, value: i });
				++i;
			});
			
			i = 0
			// because of ng-option by reference :
			angular.forEach($scope.cps.curDbConfig.levelDefinitions, function (definition) {
				var j = 0;
				$scope.levelNames.push(definition);
				angular.forEach($scope.optionsLevelTypes, function (type) {
				    if(type.label == definition.type) {
				        $scope.levelTypes.push($scope.optionsLevelTypes[j]);
				    }
				    j++;
			    });
				angular.forEach(definition.attributeDefinitions, function (attribute) {
				    j = 0;
				    angular.forEach($scope.optionsLevelAttributes, function (type) {
				        if(type.label == attribute.type) {
				            if($scope.levelAttributes[i] === undefined) {
				                $scope.levelAttributes[i] = [];
				            }
				            $scope.levelAttributes[i].push($scope.optionsLevelAttributes[j]);
				        }
				        j++;
				    });
			    });
			    i++			    
			});

			// because of ng-option by reference :
			angular.forEach($scope.cps.curDbConfig.linkDefinitions, function (definition) {
				angular.forEach($scope.optionsLinkTypes, function (type) {
				    if(type.label == definition.type) {
				        $scope.linkTypes.push(type);
				    }
			    });	
				angular.forEach($scope.optionsLevels, function (level) {
				    if(level.label == definition.superlevelName) {
			            $scope.superLevel.push(level);
				    }
				    if(level.label == definition.sublevelName) {
			            $scope.subLevel.push(level);
				    } 
			    });			      
			});
		}
		
		$scope.deleteLevelDefinition = function (key) {
		    console.log(key);
		}
		
		$scope.getTypeOfLevel = function (name) {
		    var i = 0;
		    var ret = -1;
			angular.forEach($scope.optionsLevelTypes, function (type) {
				if(type.label == name) {
				    ret = i;
				}
				i++;
			});
		    return ret;
		}
		
		$scope.onClickTab = function (tab) {
			$scope.currentTab = tab.url;
		}
		
		$scope.isInteger = function (x) {
            return Math.round(x) === x;
        }
	
		$scope.isActiveTab = function(tabUrl) {
			if(tabUrl == $scope.currentTab) {
				return {
					'background-color': '#FFF',
					'color': '#000'
				}
			}
			return {};
		}

		/**
		 *
		 */
		$scope.cursorInTextField = function () {
			viewState.setEditing(true);
			viewState.setcursorInTextField(true);
		};

		/**
		 *
		 */
		$scope.cursorOutOfTextField = function () {
			viewState.setEditing(false);
			viewState.setcursorInTextField(false);
		};	
		
		$scope.setup();	
});