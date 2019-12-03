/* Copyright (c) 2012-2016 Casewise Systems Ltd (UK) - All rights reserved */

/*global cwAPI, jQuery, cwConfigurationEditorMapping */
(function(cwApi, $) {
  "use strict";

  var cwLayout = function(options, viewSchema) {
    cwApi.extend(this, cwApi.cwLayouts.CwLayout, options, viewSchema);
    cwApi.registerLayoutForJSActions(this);
    this.viewSchema = viewSchema;
    this.trueFalseArray = [translateText("true"), translateText("false")];
  };

  cwLayout.prototype.getTemplatePath = function(folder, templateName) {
    return cwApi.format("{0}/html/{1}/{2}.ng.html", cwApi.getCommonContentPath(), folder, templateName);
  };

  cwLayout.prototype.drawAssociations = function(output, associationTitleText, object) {
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

  cwLayout.prototype.applyJavaScript = function() {
    let self = this;
    cwApi.CwAsyncLoader.load("angular", function() {
      let loader = cwApi.CwAngularLoader,
        templatePath,
        $container = $("#cwLayoutCompare" + self.nodeID);
      loader.setup();
      templatePath = self.getTemplatePath("cwLayoutCompare", "compareTable");

      loader.loadControllerWithTemplate("cwLayoutCompare", $container, templatePath, function($scope, $sce) {
        $scope.ng = {};
        $scope.ng.originalObject = self.object;
        $scope.ng.objectsToCompare = [];

        self.object.associations[self.nodeID].forEach(function(o) {
          self.getItem(o.object_id, function(json) {
            if (json.status === "Ok") {
              $scope.ng.objectsToCompare.push(json.object);
              $scope.$apply();
            }
          });
        });
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
