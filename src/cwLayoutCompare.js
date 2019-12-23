/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery, cwConfigurationEditorMapping */
(function(cwApi, $) {
  "use strict";

  var cwLayout = function(options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    cwApi.registerLayoutForJSActions(this);
    this.viewSchema = viewSchema;
    this.trueFalseArray = [translateText("true"), translateText("false")];
    this.displayAllProp = false;
    this.searchDisplayed = false;
  };

  cwLayout.prototype.getTemplatePath = function(folder, templateName) {
    return cwApi.format("{0}/html/{1}/{2}.ng.html", cwApi.getCommonContentPath(), folder, templateName);
  };

  cwLayout.prototype.drawAssociations = function(output, associationTitleText, object) {
    output.push('<div class="cw-visible cwLayoutCompareButtons" id="cwLayoutCompareButtons_' + this.nodeID + '">');
    output.push('<a class="btn page-action no-text fa fa-search" id="cwLayoutCompareSearch_' + this.nodeID + '" title="' + $.i18n.prop("compare_search") + '"></a>');
    output.push('<a class="btn page-action no-text fa fa-eye" id="cwLayoutCompareDisplay_' + this.nodeID + '" title="' + $.i18n.prop("compare_display_change") + '"></a>');
    output.push("</div>");
    output.push('<div class="cw-visible cwLayoutCompare" id="cwLayoutCompare' + this.nodeID + '"></div>');
    this.object = object;
  };

  function translateText(text) {
    switch (text) {
      case "true":
        return $.i18n.prop("global_true");
      case "false":
        return $.i18n.prop("global_false");
      case cwApi.cwConfigs.UndefinedValue:
        return $.i18n.prop("global_undefined");
      default:
        return text;
    }
  }

  cwLayout.prototype.getItem = function(id, callback) {
    let self = this;
    let url = cwApi.getLiveServerURL() + "page/" + this.viewSchema.ViewName + "/" + id + "?" + Math.random();

    $.getJSON(url, function(json) {
      return callback(json);
    });
  };

  cwLayout.prototype.hidePropertyGroup = function() {
    let q = document.querySelectorAll(".cwPropertiesTableContainer");
    for (let i = 0; i < q.length; i++) {
      q[i].style.display = "none";
    }
  };

  cwLayout.prototype.getObjects = function($scope, ots) {
    let query = {
      ObjectTypeScriptName: this.viewSchema.NodesByID[this.viewSchema.RootNodesId].ObjectTypeScriptName,
      PropertiesToLoad: ["name"],
      Where: [],
    };

    cwApi.CwDataServicesApi.send("flatQuery", query, function(err, res) {
      if (err) {
        console.log(err);
        return;
      }
      $scope.ng.objectsToSelect = res;
      $scope.$apply();
    });
  };

  cwLayout.prototype.activateButtonsEvent = function() {
    let searchButton = document.getElementById("cwLayoutCompareSearch_" + this.nodeID);
    if (searchButton) {
      searchButton.addEventListener("click", this.manageSearch.bind(this));
    }

    var displayButton = document.getElementById("cwLayoutCompareDisplay_" + this.nodeID);
    if (displayButton) {
      displayButton.addEventListener("click", this.manageDisplayAllProperties.bind(this));
    }
  };

  // manage search
  cwLayout.prototype.manageSearch = function(event) {
    var self = this;
    if (this.angularScope) {
      if (this.searchDisplayed === true) {
        self.searchDisplayed = false;
        event.target.title = $.i18n.prop("compare_hide_search");
        event.target.classList.remove("selected");
      } else {
        self.searchDisplayed = true;
        event.target.title = $.i18n.prop("compare_show_search");
        event.target.classList.add("selected");
      }
      this.angularScope.ng.displaySearch = this.searchDisplayed;
      this.angularScope.$apply();
    }
  };

  // manage search
  cwLayout.prototype.manageDisplayAllProperties = function(event) {
    var self = this;
    if (this.angularScope) {
      if (this.displayAllProp === true) {
        self.displayAllProp = false;
        event.target.title = $.i18n.prop("compare_hide_allprop");
        event.target.classList.remove("selected");
      } else {
        self.displayAllProp = true;
        event.target.title = $.i18n.prop("compare_show_allprop");
        event.target.classList.add("selected");
      }
      this.angularScope.ng.displayAllProp = this.displayAllProp;
      this.angularScope.$apply();
    }
  };

  cwLayout.prototype.applyJavaScript = function() {
    let self = this;
    this.hidePropertyGroup();
    this.activateButtonsEvent();

    cwApi.CwAsyncLoader.load("angular", function() {
      let loader = cwApi.CwAngularLoader,
        templatePath,
        $container = $("#cwLayoutCompare" + self.nodeID);
      loader.setup();
      templatePath = self.getTemplatePath("cwLayoutCompare", "compareTable");

      loader.loadControllerWithTemplate("cwLayoutCompare", $container, templatePath, function($scope, $sce) {
        self.angularScope = $scope;
        $scope.ng = {};
        $scope.ng.originalObject = self.object;
        $scope.ng.objectsToCompareLeft = [];
        $scope.ng.objectsToCompareRight = [];
        $scope.ng.numberOfColumn = 3;

        self.getObjects($scope);
        let q = cwApi.getQueryStringObject();
        let tab = "tab0";
        if (q.cwtabid) tab = q.cwtabid;

        let iter = 0;
        $scope.ng.selectedProperties = self.viewSchema.NodesByID[self.viewSchema.RootNodesId].PropertiesSelected;
        $scope.ng.propertyGroups = self.viewSchema.PropertyGroupsById;
        self.viewSchema.Tab.Tabs.forEach(function(t) {
          if (t.Id === tab) {
            t.Nodes.forEach(function(n) {
              if (self.object.associations[n]) {
                if (iter === 0) {
                  $scope.ng.leftName = self.viewSchema.NodesByID[n].NodeName;
                  self.object.associations[n].forEach(function(o, i) {
                    self.getItem(o.object_id, function(json) {
                      if (json.status === "Ok") {
                        json.object.order = i;
                        $scope.ng.numberOfColumn += 1;
                        $scope.ng.objectsToCompareLeft.push(json.object);
                        $scope.$apply();
                      }
                    });
                  });
                } else if (iter === 1) {
                  $scope.ng.rightName = self.viewSchema.NodesByID[n].NodeName;
                  self.object.associations[n].forEach(function(o, i) {
                    self.getItem(o.object_id, function(json) {
                      if (json.status === "Ok") {
                        $scope.ng.numberOfColumn += 1;
                        json.object.order = i;
                        $scope.ng.objectsToCompareRight.push(json.object);
                        $scope.$apply();
                      }
                    });
                  });
                }
                iter = iter + 1;
              }
            });
          }
        });

        $scope.outsideObjectChanged = function() {
          $scope.ng.outSideObject = null;
          self.getItem($scope.ng.objectIdToAdd, function(json) {
            if (json.status === "Ok") {
              $scope.ng.outSideObject = json.object;
              $scope.$apply();
            }
          });
        };

        $scope.displayItemString = function(item) {
          return $sce.trustAsHtml(item.displayName);
        };

        $scope.getTemplatePath = function(filename) {
          return self.getTemplatePath("cwLayoutCompare", filename);
        };

        $scope.isAdminUser = function() {
          if (cwApi.currentUser.PowerLevel === 1) {
            if (cwApi.customLibs && cwApi.customLibs.utils && cwApi.customLibs.utils.copyToClipboard) {
              return true;
            }
            return false;
          }
          return false;
        };

        $scope.getPropertyLabel = function(p) {
          return cwApi.mm.getProperty(self.object.objectTypeScriptName, p).name;
        };

        $scope.getPropertyValue = function(o, p) {
          if (cwApi.mm.getProperty(o.objectTypeScriptName, p).type === "URL") return o.properties[p];
          return $sce.trustAsHtml(cwApi.cwPropertiesGroups.getDisplayValue(o.objectTypeScriptName, p, o.properties[p], o, "properties"));
        };

        $scope.getNodeName = function(nodeID) {
          return self.viewSchema.NodesByID[nodeID].NodeName;
        };

        $scope.getCDS = function(item) {
          return $sce.trustAsHtml(cwAPI.customLibs.utils.getItemDisplayString(self.viewSchema.ViewName, item));
        };

        $scope.isAssoIn = function(associations, o) {
          return associations.some(function(a) {
            return a.object_id == o.object_id;
          });
        };

        $scope.copyToClipboard = function() {
          let data = "";
          let str = angular.toJson(data);
          cwApi.customLibs.utils.copyToClipboard(str);
        };
      });
    });
  };

  cwApi.cwLayouts.cwLayoutCompare = cwLayout;
})(cwAPI, jQuery);
