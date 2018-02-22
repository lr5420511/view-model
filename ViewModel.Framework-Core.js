(function(win) {

  win.ViewModel = function(sourceModel) {
    if(!sourceModel instanceof Object) {
      throw new Error("window.ViewModel: sourceModel of argument isn't a vaild argument");
    }
    this.SourceModel = sourceModel;
    this.Views = [];
    this.CurrentState = "Unbind"; // Binded or Unbind
    this.ModelVisitor = function(model, property, fullProperty, isGetter) {};
    this.OverrideVisitor();
  };

  win.ViewModel.prototype = {
    constructor: win.ViewModel,
    AddView: function(jsNewView) {
      if(!jsNewView instanceof HTMLElement) {
        throw new Error("window.ViewModel.prototype.AddView: jsNewView of argument isn't a vaild argument");
      }
      this.Views.push(jsNewView);
    },
    RemoveView: function(jsCurrentView) {
      if(!jsCurrentView instanceof HTMLElement) {
        throw new Error("window.ViewModel.prototype.RemoveView: jsCurrentView of argument isn't a vaild argument");
      }
      for(var index = 0; index < this.Views.length; index++) {
        var tempCurrentView = this.Views[index];
        if(tempCurrentView === jsCurrentView) {
          this.Views.splice(index--, 1);
        }
        else {
          continue;
        }
      }
    },
    ClearViews: function() {
      if(this.Views.length > 0) {
        this.Views.splice(0, this.Views.length);
      }
    },
    IsBinded: function() {
      return this.CurrentState === "Binded";
    },
    BindViews: function(bindAttribute, syncView) {
      if(typeof bindAttribute !== "string" || bindAttribute === "") {
        throw new Error("window.ViewModel.prototype.BindViews: bindAttribute of argument isn't a vaild argument");
      }
      if(this.IsBinded()) {
        throw new Error("window.ViewModel.prototype.BindViews: The current status of viewmodel can't bind views");
      }
      var modelProperties = win.ViewModel.GetFullProperties(this.SourceModel, false);
      var propertyElementsPairs = {};
      for(var pIndex = 0; pIndex < modelProperties.length; pIndex++) {
        var currentFullProperty = modelProperties[pIndex];
        for(var vIndex = 0; vIndex < this.Views.length; vIndex++) {
          var currentPropertyElements = win.ViewModel.GetAllElements(this.Views[vIndex], bindAttribute, "{" + currentFullProperty + "}");
          if(currentPropertyElements.length > 0) {
            propertyElementsPairs[currentFullProperty] = propertyElementsPairs.hasOwnProperty(currentFullProperty) ? 
            propertyElementsPairs[currentFullProperty].concat(currentPropertyElements) : currentPropertyElements;
          }
          else {
            continue;
          }
        }
      }
      this.CurrentState = "Binded";
      this.ModelVisitor = function(model, property, fullProperty, isGetter) {
        if(syncView instanceof Function && !isGetter && propertyElementsPairs.hasOwnProperty(fullProperty)) {
          var currentPropertyViews = propertyElementsPairs[fullProperty];
          for(var index = 0; index < currentPropertyViews.length; index++) {
            syncView(model, property, fullProperty, currentPropertyViews[index]);
          }
        }
      };
      var currentViewModel = this;
      var OnPropertiesChanged = function(model, fullProperty) {
        for(var property in model) {
          var currentFullProperty = fullProperty === "" ? property : fullProperty + "." + property;
          if(model[property] instanceof Object) {
            OnPropertiesChanged(model[property], currentFullProperty);
          }
          else {
            currentViewModel.ModelVisitor(model, property, currentFullProperty, false);
          }
        }
      };
      OnPropertiesChanged(this.SourceModel, "");
    },
    UnbindViews: function() {
      if(!this.IsBinded()) {
        throw new Error("window.ViewModel.prototype.UnbindViews: The current status of viewmodel can't unbind views");
      }
      this.ModelVisitor = function(model, property, fullProperty, isGetter) {};
      this.CurrentState = "Unbind";
    },
    OverrideVisitor: function() {
      var privateSourceModel = {};
      win.ViewModel.ExtendsObj(privateSourceModel, this.SourceModel, "", true);
      var currentViewModel = this;
      var RedefineProperties = function(model, privateModel, fullProperty) {
        for(var property in model) {
          var currentFullProperty = fullProperty === "" ? property : fullProperty + "." + property;
          if(model[property] instanceof Object) {
            RedefineProperties(model[property], privateModel[property], currentFullProperty);
          }
          else {
            (function(pro, fullPro) {
              Object.defineProperty(model, pro, {
                get: function() {
                  currentViewModel.ModelVisitor(model, pro, fullPro, true);
                  return privateModel[pro];
                },
                set: function(newValue) {
                  if(privateModel[pro] !== newValue) {
                    privateModel[pro] = newValue;
                    currentViewModel.ModelVisitor(model, pro, fullPro, false);
                  }
                }
              });
            })(property, currentFullProperty) // 这个闭包函数是框架的核心
          }
        }
      };
      RedefineProperties(this.SourceModel, privateSourceModel, "");
    }
  };

  win.ViewModel.ExtendsObj = function(sourceObj, newObj, fullProperty, isDeep, propertyChanged) {
    if(!sourceObj instanceof Object || sourceObj === null) {
      throw new Error("window.ViewModel.ExtendsObj: sourceObj of argument isn't a vaild argument");
    }
    if(!newObj instanceof Object || newObj === null) {
      throw new Error("window.ViewModel.ExtendsObj: newObj of argument isn't a vaild argument");
    }
    if(typeof fullProperty !== "string") {
      fullProperty = "";
    }
    if(typeof isDeep !== "boolean") {
      isDeep = false;
    }
    for(var property in newObj) {
      if(newObj[property] === sourceObj[property]) {
        continue;
      }
      else {
        var currentFullProperty = fullProperty === "" ? property : fullProperty + "." + property;
        var isNeedDeep = newObj[property] instanceof Object && isDeep;
        sourceObj[property] = isNeedDeep ? 
        (sourceObj[property] instanceof Object ? sourceObj[property] : {}) : newObj[property];
        if(propertyChanged instanceof Function && !isNeedDeep) {
          propertyChanged(sourceObj, property, currentFullProperty);
        }
        if(isNeedDeep) {
          win.ViewModel.ExtendsObj(sourceObj[property], newObj[property], currentFullProperty, isDeep, propertyChanged);
        }
      }
    }
  };

  win.ViewModel.GetFullProperties = function(currentObj, isObject) {
    if(!currentObj instanceof Object) {
      throw new Error("window.ViewModel.GetFullProperties: currentObj of argument isn't a vaild argument");
    }
    if(typeof isObject !== "boolean") {
      isObject = false;
    }
    var GetFullPropertiesByObj = function(obj, fullProperty) {
      var properties = [];
      for(var property in obj) {
        var currentFullProperty = fullProperty === "" ? property : fullProperty + "." + property;
        if(obj[property] instanceof Object) {
          if(isObject) {
            properties.push(currentFullProperty);
          }
          properties = properties.concat(GetFullPropertiesByObj(obj[property], currentFullProperty));
        }
        else if(!isObject) {
          properties.push(currentFullProperty);
        }
      }
      return properties;
    };
    return GetFullPropertiesByObj(currentObj, "");
  };

  win.ViewModel.GetAllElements = function(jsCurrentElement, attributeName, attributeValue) {
    if(!jsCurrentElement instanceof HTMLElement) {
      throw new Error("window.ViewModel.GetAllElements: jsCurrentElement of argument isn't a vaild argument");
    }
    if(typeof attributeName !== "string" || attributeName === "") {
      throw new Error("window.ViewModel.GetAllElements: attributeName of argument isn't a vaild argument");
    }
    if(typeof attributeValue !== "string" || attributeValue === "") {
      throw new Error("window.ViewModel.GetAllElements: attributeValue of argument isn't a vaild argument");
    }
    var IsVaildElement = function(element) {
      return element.attributes.hasOwnProperty(attributeName) ? 
      element.attributes[attributeName].value.includes(attributeValue) : false;
    };
    var elements = [];
    if(IsVaildElement(jsCurrentElement)) {
      elements.push(jsCurrentElement);
    }
    var FindVaildChildren = function(jsElement) {
      var vaildElements = [];
      for(var index = 0; index < jsElement.children.length; index++) {
        var currentChild = jsElement.children[index];
        if(IsVaildElement(currentChild)) {
          vaildElements.push(currentChild);
        }
        vaildElements = vaildElements.concat(FindVaildChildren(currentChild));
      }
      return vaildElements;
    };
    return elements.concat(FindVaildChildren(jsCurrentElement));
  };

})(window)